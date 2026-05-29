import { Server } from 'socket.io';
import * as db from './database.js';

// Try loading tiktok-live-connector defensively
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

  // Connect to a real TikTok live stream
  public connect(username: string) {
    if (!TikTokConnectorClass) {
      console.warn('Cannot connect to real TikTok: tiktok-live-connector module is not available.');
      return false;
    }

    try {
      this.clearReconnect();

      // Set username BEFORE disconnecting to prevent stale disconnected event
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

      // Bind events BEFORE connect resolves (the connector buffers if needed)
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

      // Handle graceful disconnect (connection lost after being connected)
      this.tiktokConnection.on('disconnected', () => {
        console.log('TikTok Live connection lost (disconnected event)');
        this.tiktokConnection = null;
        this.lastError = 'disconnected';
        this.emitState({ connected: false, error: 'disconnected', reconnecting: true });
        this.scheduleReconnect();
      });

      // Handle stream end (broadcaster stopped streaming)
      if (this.tiktokConnection.on) {
        this.tiktokConnection.on('streamEnd', () => {
          console.log('TikTok Live stream ended');
          this.tiktokConnection = null;
          this.lastError = 'stream_ended';
          this.emitState({ connected: false, error: 'stream_ended', reconnecting: false });
          // Try a few times in case they go live again
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

        // Retry a few times for transient errors, stop for offline
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
    if (this.tiktokConnection) return; // Already have a connection, no need to reconnect

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
    // Clear username BEFORE disconnecting so disconnected event won't trigger reconnect
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

  // Handle a gift donation
  public async handleGift(event: { username: string; giftName: string; count: number; avatar: string }) {
    // 1. Get Settings
    const matchStateRow = await db.get("SELECT value FROM settings WHERE key = 'match_state'");
    if (!matchStateRow || matchStateRow.value !== 'playing') {
      // Ignore donations if game not in progress
      return;
    }

    const giftValuesRow = await db.get("SELECT value FROM settings WHERE key = 'gift_values'");
    const giftValues = JSON.parse(giftValuesRow?.value || '{}');

    // 2. Calculate Diamond Value
    const giftData = giftValues[event.giftName];
    const baseValue = typeof giftData === 'number' ? giftData : (giftData?.value || 1);
    
    const multiplierRow = await db.get("SELECT value FROM settings WHERE key = 'event_multiplier'");
    const multiplier = parseInt(multiplierRow?.value || '1', 10);
    const totalDiamonds = baseValue * event.count * multiplier;

    // 3. Determine Team supported
    let teamSide: 'local' | 'visitor' = 'local';
    if (giftData && giftData.team) {
      teamSide = giftData.team;
    } else {
      const visitorGifts = ['TikTok', 'Perfume', 'Universo'];
      if (visitorGifts.includes(event.giftName)) {
        teamSide = 'visitor';
      } else {
        teamSide = Math.random() < 0.5 ? 'local' : 'visitor';
      }
    }

    const teamIdRow = await db.get(`SELECT value FROM settings WHERE key = '${teamSide}_team_id'`);
    const teamId = teamIdRow?.value || (teamSide === 'local' ? 'ARG' : 'BRA');

    // 4. Update Donors List
    await db.run(`
      INSERT INTO donors (username, diamonds, teamId, avatar)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        diamonds = diamonds + excluded.diamonds,
        teamId = excluded.teamId,
        avatar = excluded.avatar
    `, [event.username, totalDiamonds, teamId, event.avatar]);

    // 5. Update Ball Progress
    const progressRow = await db.get("SELECT value FROM settings WHERE key = 'ball_progress'");
    let progress = parseInt(progressRow?.value || '0', 10);

    const goalDistanceRow = await db.get("SELECT value FROM settings WHERE key = 'goal_distance_diamonds'");
    const goalDistance = parseInt(goalDistanceRow?.value || '200', 10);

    // Apply Turbo Event (Turbo doubles ball movement speed)
    const turboRow = await db.get("SELECT value FROM settings WHERE key = 'event_turbo'");
    const isTurbo = turboRow?.value === 'true';
    const movementAmount = totalDiamonds * (isTurbo ? 2 : 1);

    if (teamSide === 'local') {
      progress += movementAmount;
    } else {
      progress -= movementAmount;
    }

    // 6. Check for Goals
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

    await db.run("UPDATE settings SET value = ? WHERE key = 'ball_progress'", [progress.toString()]);

    // Emit event immediately
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

    // Handle Goal Celebration
    if (isGoal) {
      await this.handleGoal(scoringTeam);
    } else {
      // Broadcast current donors top 10
      await this.broadcastDonors();
    }
  }

  public async handleLike(event: { username: string; likeCount: number; avatar: string }) {
    // We allow likes to be processed regardless of match_state so the progress bar never freezes

    // Likes give a minor boost (100 likes = 1 diamond equivalent push to a random/last supported team, or simply sparks)
    // Spawn soccer particles in the overlay
    this.io.emit('game_action', {
      type: 'like',
      username: event.username,
      likeCount: event.likeCount,
      avatar: event.avatar
    });
  }

  // Handle Shares
  public async handleShare(event: { username: string; avatar: string }) {
    const matchStateRow = await db.get("SELECT value FROM settings WHERE key = 'match_state'");
    if (!matchStateRow || matchStateRow.value !== 'playing') return;

    // Share gives a small flat boost (+2 diamonds) to the team they previously supported, or default local
    const donor = await db.get("SELECT teamId FROM donors WHERE username = ?", [event.username]);
    let teamSide: 'local' | 'visitor' = 'local';
    
    if (donor) {
      const visitorTeamIdRow = await db.get("SELECT value FROM settings WHERE key = 'visitor_team_id'");
      if (donor.teamId === visitorTeamIdRow?.value) {
        teamSide = 'visitor';
      }
    }

    // Apply the share bonus
    const teamIdRow = await db.get(`SELECT value FROM settings WHERE key = '${teamSide}_team_id'`);
    const teamId = teamIdRow?.value || 'ARG';

    const bonus = 2;
    await db.run(`
      INSERT INTO donors (username, diamonds, teamId, avatar)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        diamonds = diamonds + excluded.diamonds
    `, [event.username, bonus, teamId, event.avatar]);

    // Push the ball slightly
    const progressRow = await db.get("SELECT value FROM settings WHERE key = 'ball_progress'");
    let progress = parseInt(progressRow?.value || '0', 10);
    if (teamSide === 'local') progress += bonus;
    else progress -= bonus;

    await db.run("UPDATE settings SET value = ? WHERE key = 'ball_progress'", [progress.toString()]);

    this.io.emit('game_action', {
      type: 'share',
      username: event.username,
      teamSide,
      progress,
      avatar: event.avatar
    });

    await this.broadcastDonors();
  }

  // Handle Follows
  public async handleFollow(event: { username: string; avatar: string }) {
    const matchStateRow = await db.get("SELECT value FROM settings WHERE key = 'match_state'");
    if (!matchStateRow || matchStateRow.value !== 'playing') return;

    // Deduplicate: skip if same user followed within the last N ms
    const now = Date.now();
    const last = this.recentFollows.get(event.username);
    if (last && now - last < this.followDedupMs) {
      console.log(`[DEDUP] Follow de ${event.username} ignorado (repetido en ${now - last}ms)`);
      return;
    }
    this.recentFollows.set(event.username, now);

    // Follow does NOT advance the ball - just registers the donor
    const teamIdRow = await db.get("SELECT value FROM settings WHERE key = 'local_team_id'");
    const teamId = teamIdRow?.value || 'ARG';

    await db.run(`
      INSERT INTO donors (username, diamonds, teamId, avatar)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        diamonds = diamonds + excluded.diamonds
    `, [event.username, 0, teamId, event.avatar]);

    this.io.emit('game_action', {
      type: 'follow',
      username: event.username,
      avatar: event.avatar
    });

    await this.broadcastDonors();
  }

  // Handle Joins
  public handleJoin(event: { username: string; avatar: string }) {
    this.io.emit('game_action', {
      type: 'join',
      username: event.username,
      avatar: event.avatar
    });
  }

  // --- GOAL CELEBRATION AND STATE ---

  private async handleGoal(scoringTeam: 'local' | 'visitor') {
    // 1. Set celebrating
    await db.run("UPDATE settings SET value = 'celebrating' WHERE key = 'match_state'");
    
    // 2. Increment score
    const scoreRow = await db.get(`SELECT value FROM settings WHERE key = '${scoringTeam}_score'`);
    const newScore = parseInt(scoreRow?.value || '0', 10) + 1;
    await db.run(`UPDATE settings SET value = ? WHERE key = '${scoringTeam}_score'`, [newScore.toString()]);

    // 3. Emit Goal event
    const teamIdRow = await db.get(`SELECT value FROM settings WHERE key = '${scoringTeam}_team_id'`);
    const team = await db.get("SELECT * FROM teams WHERE id = ?", [teamIdRow?.value]);

    this.io.emit('game_action', {
      type: 'goal',
      teamSide: scoringTeam,
      teamName: team?.name || (scoringTeam === 'local' ? 'Local' : 'Visitante'),
      flag: team?.flag || '',
      localScore: scoringTeam === 'local' ? newScore : parseInt((await db.get("SELECT value FROM settings WHERE key = 'local_score'"))?.value || '0', 10),
      visitorScore: scoringTeam === 'visitor' ? newScore : parseInt((await db.get("SELECT value FROM settings WHERE key = 'visitor_score'"))?.value || '0', 10),
    });

    // 4. Delay and reset or finish
    setTimeout(async () => {
      try {
        const activeState = await db.get("SELECT value FROM settings WHERE key = 'match_state'");
        if (activeState?.value !== 'celebrating') return; // Match was manually reset

        const limitRow = await db.get("SELECT value FROM settings WHERE key = 'match_limit'");
        const limit = parseInt(limitRow?.value || '3', 10);

        const localScoreVal = parseInt((await db.get("SELECT value FROM settings WHERE key = 'local_score'"))?.value || '0', 10);
        const visitorScoreVal = parseInt((await db.get("SELECT value FROM settings WHERE key = 'visitor_score'"))?.value || '0', 10);

        const modeRow = await db.get("SELECT value FROM settings WHERE key = 'match_mode'");
        const mode = modeRow?.value || 'goals';

        // Gold Goal event
        const goldGoalRow = await db.get("SELECT value FROM settings WHERE key = 'event_gold_goal'");
        const isGoldGoal = goldGoalRow?.value === 'true';

        let isMatchOver = false;
        if (isGoldGoal) {
          isMatchOver = true;
          // Turn off Gold Goal for future matches
          await db.run("UPDATE settings SET value = 'false' WHERE key = 'event_gold_goal'");
        } else if (mode === 'goals') {
          if (localScoreVal >= limit || visitorScoreVal >= limit) {
            isMatchOver = true;
          }
        } else if (mode === 'time') {
          // In time mode, only the timer can end the match, not goals
          isMatchOver = false;
        }

        if (isMatchOver) {
          await this.endMatch();
        } else {
          // Resume playing
          await db.run("UPDATE settings SET value = 'playing' WHERE key = 'match_state'");
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
    await db.run("UPDATE settings SET value = 'finished' WHERE key = 'match_state'");

    const localScoreVal = parseInt((await db.get("SELECT value FROM settings WHERE key = 'local_score'"))?.value || '0', 10);
    const visitorScoreVal = parseInt((await db.get("SELECT value FROM settings WHERE key = 'visitor_score'"))?.value || '0', 10);

    const localTeamId = (await db.get("SELECT value FROM settings WHERE key = 'local_team_id'"))?.value || 'ARG';
    const visitorTeamId = (await db.get("SELECT value FROM settings WHERE key = 'visitor_team_id'"))?.value || 'BRA';

    let winnerId = 'DRAW';
    if (localScoreVal > visitorScoreVal) winnerId = localTeamId;
    else if (visitorScoreVal > localScoreVal) winnerId = visitorTeamId;

    // Find MVP: Top donor in this match
    const mvp = await db.get("SELECT username, diamonds, teamId FROM donors ORDER BY diamonds DESC LIMIT 1");

    if (mvp) {
      await db.run(`
        INSERT INTO matches (localTeamId, visitorTeamId, localScore, visitorScore, winnerId, mvpUsername, mvpDiamonds)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [localTeamId, visitorTeamId, localScoreVal, visitorScoreVal, winnerId, mvp.username, mvp.diamonds]);
    } else {
      await db.run(`
        INSERT INTO matches (localTeamId, visitorTeamId, localScore, visitorScore, winnerId, mvpUsername, mvpDiamonds)
        VALUES (?, ?, ?, ?, ?, NULL, 0)
      `, [localTeamId, visitorTeamId, localScoreVal, visitorScoreVal, winnerId]);
    }

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
    const rows = await db.all('SELECT * FROM settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  public async broadcastDonors() {
    const limitRow = await db.get("SELECT value FROM settings WHERE key = 'top_donors_count'");
    const limit = parseInt(limitRow?.value || '10', 10);
    const donors = await db.all(`SELECT * FROM donors ORDER BY diamonds DESC LIMIT ${limit}`);
    this.io.emit('donors_update', donors);
  }
}
