import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import * as db from './database.js';
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

// Helper: Get all settings as a key-value object
const getAllSettings = async () => {
  const rows = await db.all('SELECT * FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
};

// Helper: Broadcast current game state
const broadcastGameState = async () => {
  const settings = await getAllSettings();
  const localTeam = await db.get('SELECT * FROM teams WHERE id = ?', [settings.local_team_id]);
  const visitorTeam = await db.get('SELECT * FROM teams WHERE id = ?', [settings.visitor_team_id]);
  const donors = await db.all('SELECT * FROM donors ORDER BY diamonds DESC LIMIT 10');

  io.emit('game_state_update', {
    matchState: settings.match_state,
    ballProgress: parseInt(settings.ball_progress || '0', 10),
    localScore: parseInt(settings.local_score || '0', 10),
    visitorScore: parseInt(settings.visitor_score || '0', 10),
    settings,
    localTeam,
    visitorTeam,
    donors
  });
};

// --- REST API ENDPOINTS ---

// Admin Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassRow = await db.get("SELECT value FROM settings WHERE key = 'admin_password'");
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

// Fetch Settings & Teams
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getAllSettings();
    const teams = await db.all('SELECT * FROM teams');
    const recentMatches = await db.all('SELECT * FROM matches ORDER BY createdAt DESC LIMIT 5');
    const donors = await db.all('SELECT * FROM donors ORDER BY diamonds DESC LIMIT 10');

    res.json({
      success: true,
      settings,
      teams,
      recentMatches,
      donors,
      tiktok: tiktokService.getConnectionState()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Settings
app.post('/api/settings', async (req, res) => {
  try {
    const updates = req.body; // Key-value object of settings to update

    for (const [key, value] of Object.entries(updates)) {
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }

    // Broadcast the changes
    await broadcastGameState();
    res.json({ success: true, message: 'Configuraciones actualizadas con éxito' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Match Controls
app.post('/api/match/control', async (req, res) => {
  try {
    const { action } = req.body;

    if (action === 'start') {
      await db.run("UPDATE settings SET value = 'playing' WHERE key = 'match_state'");
      io.emit('game_action', { type: 'match_started' });
    } else if (action === 'pause') {
      await db.run("UPDATE settings SET value = 'idle' WHERE key = 'match_state'");
      io.emit('game_action', { type: 'match_paused' });
    } else if (action === 'finish') {
      await tiktokService.endMatch();
    } else if (action === 'reset') {
      // Clear donors for a fresh match
      await db.run("DELETE FROM donors");
      // Reset scores and progress
      await db.run("UPDATE settings SET value = '0' WHERE key = 'local_score'");
      await db.run("UPDATE settings SET value = '0' WHERE key = 'visitor_score'");
      await db.run("UPDATE settings SET value = '0' WHERE key = 'ball_progress'");
      await db.run("UPDATE settings SET value = 'idle' WHERE key = 'match_state'");

      // Clear special events
      await db.run("UPDATE settings SET value = '1' WHERE key = 'event_multiplier'");
      await db.run("UPDATE settings SET value = 'false' WHERE key = 'event_gold_goal'");
      await db.run("UPDATE settings SET value = 'none' WHERE key = 'event_penalty'");
      await db.run("UPDATE settings SET value = 'false' WHERE key = 'event_turbo'");

      io.emit('game_action', { type: 'match_reset' });
    } else if (action === 'reset-scores') {
      // Keeps donor list but resets scoreboard
      await db.run("UPDATE settings SET value = '0' WHERE key = 'local_score'");
      await db.run("UPDATE settings SET value = '0' WHERE key = 'visitor_score'");
      await db.run("UPDATE settings SET value = '0' WHERE key = 'ball_progress'");
      await db.run("UPDATE settings SET value = 'idle' WHERE key = 'match_state'");
      
      io.emit('game_action', { type: 'match_reset_scores' });
    }

    await broadcastGameState();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// TikTok Connector Operations
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

// Simulator Endpoint
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

// Ping endpoint (keep server alive)
app.get('/api/ping', (req, res) => {
  res.json({ success: true, timestamp: Date.now(), message: 'pong' });
});

// --- WEBSOCKET CHANNELS ---

io.on('connection', async (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);

  // Send initial game state immediately
  try {
    const settings = await getAllSettings();
    const localTeam = await db.get('SELECT * FROM teams WHERE id = ?', [settings.local_team_id]);
    const visitorTeam = await db.get('SELECT * FROM teams WHERE id = ?', [settings.visitor_team_id]);
    const donors = await db.all('SELECT * FROM donors ORDER BY diamonds DESC LIMIT 10');
    const teams = await db.all('SELECT * FROM teams');
    
    socket.emit('init_state', {
      matchState: settings.match_state,
      ballProgress: parseInt(settings.ball_progress || '0', 10),
      localScore: parseInt(settings.local_score || '0', 10),
      visitorScore: parseInt(settings.visitor_score || '0', 10),
      settings,
      localTeam,
      visitorTeam,
      donors,
      teams,
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
db.initDb().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`⚽ TIKTOK WORLD CUP BATTLE BACKEND RUNNING ⚽`);
    console.log(`⚡ Express + Socket.io Server listening on port ${PORT}`);
    console.log(`===============================================`);
  });
});
