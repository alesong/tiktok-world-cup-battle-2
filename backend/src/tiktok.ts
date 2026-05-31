import { Server } from 'socket.io';
import { prisma } from './database.js';

let TikTokConnectorClass: any = null;

async function loadTikTokConnector() {
  if (TikTokConnectorClass) return;
  try {
    const module = await import('tiktok-live-connector');
    TikTokConnectorClass = module.WebcastPushConnection;
  } catch (e) {
    console.log('tiktok-live-connector not pre-installed or failed to load. Operating in Simulator-Only mode.');
  }
}

async function getSettingValue(key: string): Promise<string | null> {
  const row = await prisma.twcSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function updateSetting(key: string, value: string) {
  await prisma.twcSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export class TikTokLiveService {
  private io: Server;
  private tiktokConnection: any = null;
  private activeUsername: string = '';
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 15;
  private lastError: string = '';
  private recentFollows: Map<string, number> = new Map();
  private readonly followDedupMs: number = 10000;
  private giftProcessingQueue: Promise<void> = Promise.resolve();

  constructor(io: Server) {
    this.io = io;
    loadTikTokConnector().catch(err => console.log("Init TikTok Live Connector:", err.message));
  }

  private emitState(overrides: Partial<ReturnType<TikTokLiveService['getConnectionState']>> = {}) {
    this.io.emit('tiktok_connection_state', {
      ...this.getConnectionState(),
      ...overrides
    });
  }

  public connect(username: string) {
    if (!TikTokConnectorClass) {
      console.warn('Cannot connect to real TikTok: tiktok-live-connector module is not available.');
      return false;
    }

    try {
      this.clearReconnect();
      this.activeUsername = username;

      if (this.tiktokConnection) {
        const oldConn = this.tiktokConnection;
        this.tiktokConnection = null;
        oldConn.disconnect();
      }

      this.reconnectAttempts = 0;
      this.lastError = '';

      this.createConnection(username);
      return true;
    } catch (error: any) {
      console.error('TikTok Connection error:', error);
      return false;
    }
  }

  private createConnection(username: string) {
    if (!TikTokConnectorClass) return;

    try {
      if (this.tiktokConnection) {
        this.tiktokConnection.disconnect();
      }

      this.tiktokConnection = new TikTokConnectorClass(username, {
        enableExtendedGiftInfo: true
      });

      const connectionPromise = this.tiktokConnection.connect();

      this.tiktokConnection.on('gift', (data: any) => {
        console.log('GIFT RECEIVED:', data.uniqueId, data.giftName);
        this.handleGift({
          username: data.uniqueId,
          giftName: data.giftName,
          count: data.repeatCount || 1,
          avatar: data.profilePictureUrl || ''
        });
      });

      this.tiktokConnection.on('like', (data: any) => {
        console.log('LIKE RECEIVED:', data.uniqueId, data.likeCount);
        this.handleLike({
          username: data.uniqueId,
          likeCount: data.likeCount || 1,
          avatar: data.profilePictureUrl || ''
        });
      });

      this.tiktokConnection.on('social', (data: any) => {
        if (data.displayType && data.displayType.includes('share')) {
          this.handleShare({
            username: data.uniqueId,
            avatar: data.profilePictureUrl || ''
          });
        }
      });

      this.tiktokConnection.on('follow', (data: any) => {
        console.log(`FOLLOW RECEIVED: ${data.uniqueId}`);
        this.handleFollow({
          username: data.uniqueId,
          avatar: data.profilePictureUrl || ''
        });
      });

      this.tiktokConnection.on('member', (data: any) => {
        this.handleJoin({
          username: data.uniqueId,
          avatar: data.profilePictureUrl || ''
        });
      });

      this.tiktokConnection.on('disconnected', () => {
        console.log('TikTok Live connection lost (disconnected event)');
        this.tiktokConnection = null;
        this.lastError = 'disconnected';
        this.emitState({ connected: false, error: 'disconnected', reconnecting: true });
        this.scheduleReconnect();
      });

      if (this.tiktokConnection.on) {
        this.tiktokConnection.on('streamEnd', () => {
          console.log('TikTok Live stream ended');
          this.tiktokConnection = null;
          this.lastError = 'stream_ended';
          this.emitState({ connected: false, error: 'stream_ended', reconnecting: false });
          if (this.reconnectAttempts < 3) {
            this.scheduleReconnect();
          }
        });
      }

      connectionPromise.then(() => {
        console.log(`Connected to TikTok Live stream of: ${username}`);
        this.reconnectAttempts = 0;
        this.lastError = '';
        this.emitState({ connected: true, error: '', reconnecting: false });
      }).catch((err: any) => {
        console.error('Failed to connect to TikTok Live:', err);
        const errorMsg = err?.message || err?.toString() || 'Error desconocido';
        this.lastError = errorMsg;
        this.tiktokConnection = null;

        const isOffline = /offline|stream ended|no live|not found|no stream|ended/i.test(errorMsg);

        this.emitState({
          connected: false,
          error: isOffline ? 'offline' : errorMsg,
          reconnecting: false
        });

        if (!isOffline && this.reconnectAttempts < 5) {
          this.scheduleReconnect();
        }
      });

    } catch (error: any) {
      console.error('Error creating TikTok connection:', error);
      this.tiktokConnection = null;
    }
  }

  private scheduleReconnect() {
    this.clearReconnect();

    if (!this.activeUsername) return;
    if (this.tiktokConnection) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached for TikTok');
      this.lastError = 'max_reconnect';
      this.emitState({ connected: false, error: 'max_reconnect', reconnecting: false });
      return;
    }

    const delay = Math.min(5000 * Math.pow(1.5, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Scheduling TikTok reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`);
    this.emitState({
      connected: false,
      error: '',
      reconnecting: true,
      reconnectAttempt: this.reconnectAttempts
    });

    this.reconnectTimer = setTimeout(() => {
      if (this.activeUsername) {
        console.log(`Attempting TikTok reconnect #${this.reconnectAttempts} for @${this.activeUsername}`);
        this.createConnection(this.activeUsername);
      }
    }, delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public disconnect() {
    this.clearReconnect();
    this.activeUsername = '';
    if (this.tiktokConnection) {
      const oldConn = this.tiktokConnection;
      this.tiktokConnection = null;
      oldConn.disconnect();
    }
    this.reconnectAttempts = 0;
    this.lastError = '';
    this.emitState({ connected: false, username: '', error: '', reconnecting: false });
    console.log('Disconnected from TikTok Live.');
  }

  public getConnectionState() {
    return {
      connected: !!this.tiktokConnection,
      username: this.activeUsername,
      error: this.lastError,
      reconnecting: !this.tiktokConnection && !!this.reconnectTimer,
      reconnectAttempt: this.reconnectAttempts
    };
  }

  // --- GAME LOGIC PIPELINE ---

  public async handleGift(event: { username: string; giftName: string; count: number; avatar: string }) {
    // Serialize gift processing to prevent race conditions (e.g., double goals)
    const process = async () => {
    const matchState = await getSettingValue('match_state');
    if (matchState !== 'playing') return;

    const giftValuesRaw = await getSettingValue('gift_values');
    const giftValues = JSON.parse(giftValuesRaw || '{}');

    const giftData = giftValues[event.giftName];
    const baseValue = typeof giftData === 'number' ? giftData : (giftData?.value || 1);

    const multiplier = parseInt(await getSettingValue('event_multiplier') || '1', 10);
    const totalDiamonds = baseValue * event.count * multiplier;

    let teamSide: 'local' | 'visitor' = 'local';
    const isConfiguredGift = giftData !== undefined && giftData !== null;
    if (isConfiguredGift) {
      if (typeof giftData === 'object' && giftData.team) {
        teamSide = giftData.team;
      }
    } else {
      const visitorGifts = ['TikTok', 'Perfume', 'Universo'];
      if (visitorGifts.includes(event.giftName)) {
        teamSide = 'visitor';
      } else {
        teamSide = Math.random() < 0.5 ? 'local' : 'visitor';
      }
    }

    const teamId = await getSettingValue(`${teamSide}_team_id`) || (teamSide === 'local' ? 'ARG' : 'BRA');

    // Upsert donor with diamonds increment
    const existingDonor = await prisma.twcDonor.findUnique({ where: { username: event.username } });
    if (existingDonor) {
      await prisma.twcDonor.update({
        where: { username: event.username },
        data: {
          diamonds: (existingDonor.diamonds ?? 0) + totalDiamonds,
          teamId,
          avatar: event.avatar
        }
      });
    } else {
      await prisma.twcDonor.create({
        data: {
          username: event.username,
          diamonds: totalDiamonds,
          teamId,
          avatar: event.avatar
        }
      });
    }

    let progress = parseInt(await getSettingValue('ball_progress') || '0', 10);
    const goalDistance = parseInt(await getSettingValue('goal_distance_diamonds') || '200', 10);

    const isTurbo = (await getSettingValue('event_turbo')) === 'true';
    const movementAmount = totalDiamonds * (isTurbo ? 2 : 1);

    if (teamSide === 'local') {
      progress += movementAmount;
    } else {
      progress -= movementAmount;
    }

    let isGoal = false;
    let scoringTeam: 'local' | 'visitor' = 'local';

    if (progress >= goalDistance) {
      isGoal = true;
      scoringTeam = 'local';
      progress = 0;
    } else if (progress <= -goalDistance) {
      isGoal = true;
      scoringTeam = 'visitor';
      progress = 0;
    }

    await updateSetting('ball_progress', progress.toString());

    this.io.emit('game_action', {
      type: 'gift',
      username: event.username,
      giftName: event.giftName,
      count: event.count,
      diamonds: totalDiamonds,
      teamSide,
      progress,
      avatar: event.avatar
    });

    if (isGoal) {
      await this.handleGoal(scoringTeam, event.username);
    } else {
      await this.broadcastDonors();
    }
    };
    this.giftProcessingQueue = this.giftProcessingQueue.then(process).catch(err => {
      console.error('Error processing gift:', err);
    });
    return this.giftProcessingQueue;
  }

  public async handleLike(event: { username: string; likeCount: number; avatar: string }) {
    this.io.emit('game_action', {
      type: 'like',
      username: event.username,
      likeCount: event.likeCount,
      avatar: event.avatar
    });
  }

  public async handleShare(event: { username: string; avatar: string }) {
    const matchState = await getSettingValue('match_state');
    if (matchState !== 'playing') return;

    const shareDonor = await prisma.twcDonor.findUnique({ where: { username: event.username } });
    let teamSide: 'local' | 'visitor' = 'local';

    if (shareDonor) {
      const visitorTeamId = await getSettingValue('visitor_team_id');
      if (shareDonor.teamId === visitorTeamId) {
        teamSide = 'visitor';
      }
    }

    const teamId = await getSettingValue(`${teamSide}_team_id`) || 'ARG';
    const bonus = 2;

    const existingShareDonor = await prisma.twcDonor.findUnique({ where: { username: event.username } });
    if (existingShareDonor) {
      await prisma.twcDonor.update({
        where: { username: event.username },
        data: { diamonds: (existingShareDonor.diamonds ?? 0) + bonus }
      });
    } else {
      await prisma.twcDonor.create({
        data: { username: event.username, diamonds: bonus, teamId, avatar: event.avatar }
      });
    }

    let progress = parseInt(await getSettingValue('ball_progress') || '0', 10);
    if (teamSide === 'local') progress += bonus;
    else progress -= bonus;

    await updateSetting('ball_progress', progress.toString());

    this.io.emit('game_action', {
      type: 'share',
      username: event.username,
      teamSide,
      progress,
      avatar: event.avatar
    });

    await this.broadcastDonors();
  }

  public async handleFollow(event: { username: string; avatar: string }) {
    const matchState = await getSettingValue('match_state');
    if (matchState !== 'playing') return;

    const now = Date.now();
    const last = this.recentFollows.get(event.username);
    if (last && now - last < this.followDedupMs) {
      console.log(`[DEDUP] Follow de ${event.username} ignorado (repetido en ${now - last}ms)`);
      return;
    }
    this.recentFollows.set(event.username, now);

    const teamId = await getSettingValue('local_team_id') || 'ARG';

    const existingFollowDonor = await prisma.twcDonor.findUnique({ where: { username: event.username } });
    if (existingFollowDonor) {
      await prisma.twcDonor.update({
        where: { username: event.username },
        data: { diamonds: existingFollowDonor.diamonds ?? 0 }
      });
    } else {
      await prisma.twcDonor.create({
        data: { username: event.username, diamonds: 0, teamId, avatar: event.avatar }
      });
    }

    this.io.emit('game_action', {
      type: 'follow',
      username: event.username,
      avatar: event.avatar
    });

    await this.broadcastDonors();
  }

  public handleJoin(event: { username: string; avatar: string }) {
    this.io.emit('game_action', {
      type: 'join',
      username: event.username,
      avatar: event.avatar
    });
  }

  // --- GOAL CELEBRATION AND STATE ---

  private async handleGoal(scoringTeam: 'local' | 'visitor', scorerUsername?: string) {
    // Prevent double goals from race conditions
    const currentMatchState = await getSettingValue('match_state');
    if (currentMatchState === 'celebrating') return;

    await updateSetting('match_state', 'celebrating');

    const currentScore = parseInt(await getSettingValue(`${scoringTeam}_score`) || '0', 10);
    const newScore = currentScore + 1;
    await updateSetting(`${scoringTeam}_score`, newScore.toString());

    const teamId = (await getSettingValue(`${scoringTeam}_team_id`)) || undefined;
    const team = teamId ? await prisma.twcTeam.findUnique({ where: { id: teamId } }) : null;

    const localScore = scoringTeam === 'local' ? newScore : parseInt(await getSettingValue('local_score') || '0', 10);
    const visitorScore = scoringTeam === 'visitor' ? newScore : parseInt(await getSettingValue('visitor_score') || '0', 10);

    this.io.emit('game_action', {
      type: 'goal',
      teamSide: scoringTeam,
      teamName: team?.name || (scoringTeam === 'local' ? 'Local' : 'Visitante'),
      flag: team?.flag || '',
      localScore,
      visitorScore,
      scorerUsername,
    });

    setTimeout(async () => {
      try {
        const activeState = await getSettingValue('match_state');
        if (activeState !== 'celebrating') return;

        const limit = parseInt(await getSettingValue('match_limit') || '3', 10);
        const localScoreVal = parseInt(await getSettingValue('local_score') || '0', 10);
        const visitorScoreVal = parseInt(await getSettingValue('visitor_score') || '0', 10);
        const mode = await getSettingValue('match_mode') || 'goals';
        const isGoldGoal = (await getSettingValue('event_gold_goal')) === 'true';

        let isMatchOver = false;
        if (isGoldGoal) {
          isMatchOver = true;
          await updateSetting('event_gold_goal', 'false');
        } else if (mode === 'goals') {
          if (localScoreVal >= limit || visitorScoreVal >= limit) {
            isMatchOver = true;
          }
        }

        if (isMatchOver) {
          await this.endMatch();
        } else {
          await updateSetting('match_state', 'playing');
          const freshSettings = await this.getAllSettings();
          this.io.emit('game_state_update', {
            matchState: 'playing',
            ballProgress: 0,
            localScore: localScoreVal,
            visitorScore: visitorScoreVal,
            settings: freshSettings
          });
        }
      } catch (err) {
        console.error('Error resuming game after goal celebration:', err);
      }
    }, 4500);
  }

  public async endMatch() {
    await updateSetting('match_state', 'finished');

    const localScoreVal = parseInt(await getSettingValue('local_score') || '0', 10);
    const visitorScoreVal = parseInt(await getSettingValue('visitor_score') || '0', 10);
    const localTeamId = await getSettingValue('local_team_id') || 'ARG';
    const visitorTeamId = await getSettingValue('visitor_team_id') || 'BRA';

    let winnerId = 'DRAW';
    if (localScoreVal > visitorScoreVal) winnerId = localTeamId;
    else if (visitorScoreVal > localScoreVal) winnerId = visitorTeamId;

    const mvp = await prisma.twcDonor.findFirst({ orderBy: { diamonds: 'desc' } });

    await prisma.twcMatch.create({
      data: {
        localTeamId,
        visitorTeamId,
        localScore: localScoreVal,
        visitorScore: visitorScoreVal,
        winnerId,
        mvpUsername: mvp?.username ?? null,
        mvpDiamonds: mvp?.diamonds ?? 0
      }
    });

    this.io.emit('game_action', {
      type: 'match_finished',
      winnerId,
      localScore: localScoreVal,
      visitorScore: visitorScoreVal,
      mvp: mvp ? {
        username: mvp.username,
        diamonds: mvp.diamonds,
        teamId: mvp.teamId
      } : null
    });
  }

  private async getAllSettings() {
    const rows = await prisma.twcSetting.findMany();
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value ?? '';
    }
    return settings;
  }

  public async broadcastDonors() {
    const limitStr = await getSettingValue('top_donors_count');
    const limit = parseInt(limitStr || '10', 10);
    const donors = await prisma.twcDonor.findMany({ orderBy: { diamonds: 'desc' }, take: limit });
    this.io.emit('donors_update', donors || []);
  }
}
