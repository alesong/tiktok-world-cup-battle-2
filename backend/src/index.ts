import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma, initDb } from './database.js';
import { TikTokLiveService } from './tiktok.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const tiktokService = new TikTokLiveService(io);

const getAllSettings = async () => {
  const rows = await prisma.twcSetting.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value ?? '';
  }
  return settings;
};

const broadcastGameState = async () => {
  const settings = await getAllSettings();

  const localTeam = await prisma.twcTeam.findUnique({ where: { id: settings.local_team_id } });
  const visitorTeam = await prisma.twcTeam.findUnique({ where: { id: settings.visitor_team_id } });
  const donors = await prisma.twcDonor.findMany({ orderBy: { diamonds: 'desc' }, take: 10 });

  io.emit('game_state_update', {
    matchState: settings.match_state,
    ballProgress: parseInt(settings.ball_progress || '0', 10),
    localScore: parseInt(settings.local_score || '0', 10),
    visitorScore: parseInt(settings.visitor_score || '0', 10),
    settings,
    localTeam,
    visitorTeam,
    donors: donors || []
  });
};

// --- REST API ENDPOINTS ---

app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassRow = await prisma.twcSetting.findUnique({ where: { key: 'admin_password' } });
    const adminPass = adminPassRow?.value || 'admin123';

    if (password === adminPass) {
      res.json({ success: true, token: 'session_token_authorized_battle' });
    } else {
      res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getAllSettings();
    const teams = await prisma.twcTeam.findMany();
    const recentMatches = await prisma.twcMatch.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
    const donors = await prisma.twcDonor.findMany({ orderBy: { diamonds: 'desc' }, take: 10 });

    res.json({
      success: true,
      settings,
      teams: teams || [],
      recentMatches: recentMatches || [],
      donors: donors || [],
      tiktok: tiktokService.getConnectionState()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.twcSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) }
      });
    }

    await broadcastGameState();
    res.json({ success: true, message: 'Configuraciones actualizadas con éxito' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/match/control', async (req, res) => {
  try {
    const { action } = req.body;

    if (action === 'start') {
      await prisma.twcSetting.update({ where: { key: 'match_state' }, data: { value: 'playing' } });
      io.emit('game_action', { type: 'match_started' });
    } else if (action === 'pause') {
      await prisma.twcSetting.update({ where: { key: 'match_state' }, data: { value: 'idle' } });
      io.emit('game_action', { type: 'match_paused' });
    } else if (action === 'finish') {
      await tiktokService.endMatch();
    } else if (action === 'reset') {
      await prisma.twcDonor.deleteMany({ where: { username: { not: '' } } });
      await prisma.twcSetting.update({ where: { key: 'local_score' }, data: { value: '0' } });
      await prisma.twcSetting.update({ where: { key: 'visitor_score' }, data: { value: '0' } });
      await prisma.twcSetting.update({ where: { key: 'ball_progress' }, data: { value: '0' } });
      await prisma.twcSetting.update({ where: { key: 'match_state' }, data: { value: 'idle' } });
      await prisma.twcSetting.update({ where: { key: 'event_multiplier' }, data: { value: '1' } });
      await prisma.twcSetting.update({ where: { key: 'event_gold_goal' }, data: { value: 'false' } });
      await prisma.twcSetting.update({ where: { key: 'event_penalty' }, data: { value: 'none' } });
      await prisma.twcSetting.update({ where: { key: 'event_turbo' }, data: { value: 'false' } });

      io.emit('game_action', { type: 'match_reset' });
    } else if (action === 'reset-scores') {
      await prisma.twcSetting.update({ where: { key: 'local_score' }, data: { value: '0' } });
      await prisma.twcSetting.update({ where: { key: 'visitor_score' }, data: { value: '0' } });
      await prisma.twcSetting.update({ where: { key: 'ball_progress' }, data: { value: '0' } });
      await prisma.twcSetting.update({ where: { key: 'match_state' }, data: { value: 'idle' } });

      io.emit('game_action', { type: 'match_reset_scores' });
    }

    await broadcastGameState();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/tiktok/connect', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  const success = tiktokService.connect(username);
  if (success) {
    res.json({ success: true, message: 'Connecting...' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to initiate connection. Module may be missing.' });
  }
});

app.post('/api/tiktok/disconnect', (req, res) => {
  tiktokService.disconnect();
  res.json({ success: true, message: 'Disconnected' });
});

app.post('/api/simulate', async (req, res) => {
  try {
    const { type, username, giftName, count, likeCount } = req.body;
    const finalUsername = username || 'Spectator_' + Math.floor(Math.random() * 1000);
    const mockAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${finalUsername}`;

    if (type === 'gift') {
      await tiktokService.handleGift({
        username: finalUsername,
        giftName: giftName || 'Rosa',
        count: parseInt(count || '1', 10),
        avatar: mockAvatar
      });
    } else if (type === 'like') {
      await tiktokService.handleLike({
        username: finalUsername,
        likeCount: parseInt(likeCount || '10', 10),
        avatar: mockAvatar
      });
    } else if (type === 'share') {
      await tiktokService.handleShare({
        username: finalUsername,
        avatar: mockAvatar
      });
    } else if (type === 'follow') {
      await tiktokService.handleFollow({
        username: finalUsername,
        avatar: mockAvatar
      });
    } else if (type === 'join') {
      tiktokService.handleJoin({
        username: finalUsername,
        avatar: mockAvatar
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/ping', (req, res) => {
  res.json({ success: true, timestamp: Date.now(), message: 'pong' });
});

// --- WEBSOCKET CHANNELS ---

io.on('connection', async (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);

  try {
    const settings = await getAllSettings();

    const localTeam = await prisma.twcTeam.findUnique({ where: { id: settings.local_team_id } });
    const visitorTeam = await prisma.twcTeam.findUnique({ where: { id: settings.visitor_team_id } });
    const donors = await prisma.twcDonor.findMany({ orderBy: { diamonds: 'desc' }, take: 10 });
    const teams = await prisma.twcTeam.findMany();

    socket.emit('init_state', {
      matchState: settings.match_state,
      ballProgress: parseInt(settings.ball_progress || '0', 10),
      localScore: parseInt(settings.local_score || '0', 10),
      visitorScore: parseInt(settings.visitor_score || '0', 10),
      settings,
      localTeam,
      visitorTeam,
      donors: donors || [],
      teams: teams || [],
      tiktok: tiktokService.getConnectionState()
    });
  } catch (err) {
    console.error('Error sending init state:', err);
  }

  socket.on('disconnect', () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
initDb().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`⚽ TIKTOK WORLD CUP BATTLE BACKEND RUNNING ⚽`);
    console.log(`⚡ Express + Socket.io Server listening on port ${PORT}`);
    console.log(`===============================================`);
  });
});
