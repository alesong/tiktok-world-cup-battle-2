import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Client-side dedup maps to prevent duplicate speech from multiple socket instances
const spokenFollowTimestamps = new Map<string, number>();
const SPOKEN_DEDUP_MS = 5000;

export interface Team {
  id: string;
  name: string;
  flag: string;
  primaryColor: string;
  secondaryColor: string;
  jerseyColor: string;
}

export interface Donor {
  username: string;
  diamonds: number;
  teamId: string;
  avatar: string;
}

export interface TikTokState {
  connected: boolean;
  username: string;
  error: string;
  reconnecting: boolean;
  reconnectAttempt: number;
}

export interface GameSettings {
  admin_password?: string;
  goal_distance_diamonds: string;
  goal_distance_pixels: string;
  match_mode: string;
  match_limit: string;
  volume: string;
  vol_whistle?: string;
  vol_kick?: string;
  vol_goal?: string;
  vol_cheer?: string;
  vol_beep?: string;
  vol_win?: string;
  vol_grass?: string;
  vol_drum?: string;
  vol_band?: string;
  donor_card_y?: string;
  donor_card_scale?: string;
  gift_card_scale?: string;
  player_scale?: string;
  event_multiplier: string;
  event_gold_goal: string;
  event_penalty: string;
  event_turbo: string;
  local_team_id: string;
  visitor_team_id: string;
  local_score: string;
  visitor_score: string;
  ball_progress: string;
  match_state: string;
  gift_values?: string;
  overlay_resolution?: string;
  top_donors_count?: string;
  top_donors_gap?: string;
  top_donors_icon_size?: string;
  top_donors_font_size?: string;
  top_donors_font_family?: string;
  top_donors_bg_opacity?: string;
  top_donors_show_name?: string;
  top_donors_show_diamonds?: string;
  top_donors_display?: string;
  top_donors_border_width?: string;
  scoreboard_text_scale?: string;
  ball_scale?: string;
  speech_follow_text?: string;
  speech_gift_text?: string;
  speech_goal_text?: string;
}

interface GameState {
  matchState: 'idle' | 'playing' | 'celebrating' | 'finished';
  ballProgress: number;
  localScore: number;
  visitorScore: number;
  localTeam: Team | null;
  visitorTeam: Team | null;
  donors: Donor[];
  settings: GameSettings;
  teams: Team[];
  activeAlert: { type: 'follow' | 'share' | 'join' | 'gift'; username: string; details?: string; avatar?: string } | null;
  timeLeft: number;
  isConnecting: boolean;
  isConnected: boolean;
  socket: Socket | null;
  initSocket: () => void;
  setAlert: (alert: GameState['activeAlert']) => void;
  triggerSound: (soundType: 'whistle' | 'kick' | 'goal' | 'cheer' | 'beep' | 'win' | 'grass' | 'drum' | 'band') => void;
  soundSynth: any;
  likeProgress: number;
  lastLiker: { username: string; avatar: string } | null;
  upcomingReward: 'event_gold_goal' | 'event_multiplier' | 'event_turbo';
  rewardTimeLeft: number;
  likeCelebration: boolean;
  lastDonor: { username: string; avatar: string; giftName?: string; diamonds?: number } | null;
  lastSpokenDonor: string | null;
  tiktokState: TikTokState;
  speechRate: number;
  speechVolume: number;
  speechVoiceURI: string;
  speechEnabled: boolean;
  speak: (text: string) => void;
  setSpeechSettings: (settings: { speechRate?: number; speechVolume?: number; speechVoiceURI?: string; speechEnabled?: boolean }) => void;
}

export const useGameStore = create<GameState>((set, get) => {
  let timerId: any = null;
  let rewardTimerId: any = null;
  let lastLikerTimerId: any = null;
  let lastDonorTimerId: any = null;

  return {
    matchState: 'idle',
    likeProgress: 0,
    lastLiker: null,
    lastDonor: null,
    lastSpokenDonor: null,
    upcomingReward: 'event_gold_goal',
    rewardTimeLeft: 0,
    likeCelebration: false,
    ballProgress: 0,
    localScore: 0,
    visitorScore: 0,
    localTeam: null,
    visitorTeam: null,
    donors: [],
    settings: {
      goal_distance_diamonds: '200',
      goal_distance_pixels: '600',
      match_mode: 'goals',
      match_limit: '3',
      volume: '0.5',
      vol_whistle: '0.5',
      vol_kick: '0.5',
      vol_goal: '0.5',
      vol_cheer: '0.5',
      vol_beep: '0.5',
      vol_win: '0.5',
      vol_grass: '0.5',
      vol_drum: '0.5',
      vol_band: '0.5',
      donor_card_y: '50',
      donor_card_scale: '100',
      player_scale: '100',
      event_multiplier: '1',
      event_gold_goal: 'false',
      event_penalty: 'none',
      event_turbo: 'false',
      local_team_id: 'ARG',
      visitor_team_id: 'BRA',
      local_score: '0',
      visitor_score: '0',
      ball_progress: '0',
      match_state: 'idle',
      overlay_resolution: '1920x1080',
      top_donors_count: '3',
      top_donors_gap: '8',
      top_donors_icon_size: '32',
      top_donors_font_size: '16',
      top_donors_font_family: 'Arial',
      top_donors_bg_opacity: '60',
      top_donors_show_name: 'true',
      top_donors_show_diamonds: 'true',
      top_donors_border_width: '3',
      scoreboard_text_scale: '100',
      ball_scale: '100'
    },
    teams: [],
    activeAlert: null,
    timeLeft: 300, // 5 minutes default (overridden by init_state)
    isConnecting: true,
    isConnected: false,
    socket: null,
    soundSynth: null,
    tiktokState: {
      connected: false,
      username: '',
      error: '',
      reconnecting: false,
      reconnectAttempt: 0
    },

    speechRate: parseFloat(localStorage.getItem('tts_rate') || '0.9'),
    speechVolume: parseFloat(localStorage.getItem('tts_volume') || '1'),
    speechVoiceURI: localStorage.getItem('tts_voice') || '',
    speechEnabled: localStorage.getItem('tts_enabled') !== 'false',

    speak: (text: string) => {
      const { speechRate, speechVolume, speechVoiceURI, speechEnabled } = get();
      if (!speechEnabled || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = speechRate;
      utterance.volume = speechVolume;
      if (speechVoiceURI) utterance.voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === speechVoiceURI) || null;
      window.speechSynthesis.speak(utterance);
    },

    setSpeechSettings: (settings) => {
      const updates: Partial<GameState> = {};
      if (settings.speechRate !== undefined) {
        updates.speechRate = settings.speechRate;
        localStorage.setItem('tts_rate', String(settings.speechRate));
      }
      if (settings.speechVolume !== undefined) {
        updates.speechVolume = settings.speechVolume;
        localStorage.setItem('tts_volume', String(settings.speechVolume));
      }
      if (settings.speechVoiceURI !== undefined) {
        updates.speechVoiceURI = settings.speechVoiceURI;
        localStorage.setItem('tts_voice', settings.speechVoiceURI);
      }
      if (settings.speechEnabled !== undefined) {
        updates.speechEnabled = settings.speechEnabled;
        localStorage.setItem('tts_enabled', String(settings.speechEnabled));
      }
      set(updates);
    },

    setAlert: (alert) => {
      set({ activeAlert: alert });
      if (alert) {
        setTimeout(() => {
          if (get().activeAlert?.username === alert.username) {
            set({ activeAlert: null });
          }
        }, 3500);
      }
    },

    triggerSound: (soundType) => {
      const synth = get().soundSynth;
      const settings = get().settings;
      const specificVolStr = settings?.[`vol_${soundType}` as keyof GameSettings] as string | undefined;
      const vol = parseFloat(specificVolStr ?? settings?.volume ?? '0.5');
      if (synth && typeof synth.play === 'function') {
        synth.play(soundType, vol);
      }
    },

    initSocket: () => {
      const existingSocket = get().socket;
      if (existingSocket?.connected) return;

      const prevHandlers = (window as any).__socketVisibilityHandlers;
      if (prevHandlers) {
        document.removeEventListener('visibilitychange', prevHandlers.visibility);
        window.removeEventListener('focus', prevHandlers.focus);
        delete (window as any).__socketVisibilityHandlers;
      }

      if (existingSocket) {
        existingSocket.removeAllListeners();
        existingSocket.disconnect();
      }

      set({ isConnecting: true, isConnected: false });

      console.log('Connecting socket to:', API_BASE_URL);

      const socket = io(API_BASE_URL, {
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        transports: ['websocket']
      });

      socket.on('connect', () => {
        set({ isConnected: true, isConnecting: false });
        console.log('Socket.io connected successfully!');
      });

      socket.on('disconnect', (reason) => {
        set({ isConnected: false });
        console.log('Socket.io disconnected:', reason);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });

      socket.on('init_state', (data: any) => {
        set({
          matchState: data.matchState,
          ballProgress: data.ballProgress,
          localScore: data.localScore,
          visitorScore: data.visitorScore,
          settings: { ...get().settings, ...data.settings },
          localTeam: data.localTeam,
          visitorTeam: data.visitorTeam,
          donors: data.donors,
          teams: data.teams || [],
          tiktokState: data.tiktok || { connected: false, username: '', error: '', reconnecting: false, reconnectAttempt: 0 },
          isConnecting: false
        });

        // Initialize clock if match_mode is time (match_limit is in minutes)
        if (data.settings.match_mode === 'time') {
          const limitMinutes = parseInt(data.settings.match_limit || '10', 10);
          set({ timeLeft: limitMinutes * 60 });
        }
      });

      // Synchronize partial details dynamically
      socket.on('game_state_update', (data: any) => {
        const updates: Partial<GameState> = {};
        if (data.matchState !== undefined) updates.matchState = data.matchState;
        if (data.ballProgress !== undefined) updates.ballProgress = data.ballProgress;
        if (data.localScore !== undefined) updates.localScore = data.localScore;
        if (data.visitorScore !== undefined) updates.visitorScore = data.visitorScore;
        if (data.settings !== undefined) updates.settings = { ...get().settings, ...data.settings };
        if (data.localTeam !== undefined) updates.localTeam = data.localTeam;
        if (data.visitorTeam !== undefined) updates.visitorTeam = data.visitorTeam;
        if (data.donors !== undefined) updates.donors = data.donors;

        set(updates);

        // Handle Time Mode ticking
        if (data.matchState === 'playing' && data.settings?.match_mode === 'time') {
          if (!timerId) {
            timerId = setInterval(() => {
              const current = get().timeLeft;
              const mode = get().settings.match_mode;
              const state = get().matchState;

              if (state === 'playing' && mode === 'time' && current > 0) {
                const nextTime = current - 1;
                set({ timeLeft: nextTime });

                // Play beep warning in last 5 seconds
                if (nextTime <= 5 && nextTime > 0) {
                  get().triggerSound('beep');
                }

                if (nextTime === 0) {
                  // Time-over: trigger whistler sound and tell server
                  get().triggerSound('whistle');
                  clearInterval(timerId);
                  timerId = null;

                  // Request server to end match via proper endpoint
                  fetch(`${API_BASE_URL}/api/match/control`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'finish' })
                  }).catch(console.error);
                }
              } else if (state !== 'playing') {
                clearInterval(timerId);
                timerId = null;
              }
            }, 1000);
          }
        } else {
          if (timerId) {
            clearInterval(timerId);
            timerId = null;
          }
        }
      });

      // Listen for specific gameplay events to trigger sounds and React popups
      socket.on('game_action', (action: any) => {
        if (action.progress !== undefined) {
          set({ ballProgress: action.progress });
        }
        switch (action.type) {
          case 'gift':
            get().triggerSound('band');

            set({
              lastDonor: {
                username: action.username || 'Alguien',
                avatar: action.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${action.username || 'donor'}`,
                giftName: action.giftName,
                diamonds: action.diamondCount || action.diamonds
              }
            });

            if (lastDonorTimerId) clearTimeout(lastDonorTimerId);
            lastDonorTimerId = setTimeout(() => set({ lastDonor: null }), 4000);

            // Speech donation: only if different donor
            const { lastSpokenDonor } = get();
            if (action.username && action.username !== lastSpokenDonor) {
              const giftText = get().settings.speech_gift_text || 'tiene la pelota';
              get().speak(`${action.username} ${giftText}`);
              set({ lastSpokenDonor: action.username });
            }

            window.dispatchEvent(new CustomEvent('tiktok_gift', { detail: action }));
            break;
          case 'like':
            // Spawn sparks via window event for GameScene to catch
            get().triggerSound('cheer');
            window.dispatchEvent(new CustomEvent('tiktok_like', { detail: action }));

            // Like Bar Logic
            const state = get();
            if (state.rewardTimeLeft > 0) break; // Don't accumulate while reward is active

            const newProgress = Math.min(10000, state.likeProgress + (action.likeCount || 1));
            set({
              likeProgress: newProgress,
              lastLiker: { username: action.username, avatar: action.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${action.username}` }
            });

            // Clear last liker after 3 seconds
            if (lastLikerTimerId) clearTimeout(lastLikerTimerId);
            lastLikerTimerId = setTimeout(() => set({ lastLiker: null }), 3000);

            if (newProgress >= 10000) {
              set({ likeCelebration: true, rewardTimeLeft: 120 });
              get().triggerSound('drum');

              // Activate reward via API
              fetch(`${API_BASE_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [state.upcomingReward]: state.upcomingReward === 'event_multiplier' ? '2' : 'true' })
              }).catch(console.error);

              // 120s Countdown
              rewardTimerId = setInterval(() => {
                const currentRewardTime = get().rewardTimeLeft;
                if (currentRewardTime > 1) {
                  set({ rewardTimeLeft: currentRewardTime - 1 });
                } else {
                  // End of reward
                  clearInterval(rewardTimerId);
                  rewardTimerId = null;

                  // Disable reward
                  fetch(`${API_BASE_URL}/api/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [state.upcomingReward]: state.upcomingReward === 'event_multiplier' ? '1' : 'false' })
                  }).catch(console.error);

                  // Cycle next reward
                  const cycle = ['event_gold_goal', 'event_multiplier', 'event_turbo'] as const;
                  const nextIndex = (cycle.indexOf(state.upcomingReward) + 1) % cycle.length;

                  set({
                    likeProgress: 0,
                    likeCelebration: false,
                    rewardTimeLeft: 0,
                    upcomingReward: cycle[nextIndex]
                  });
                }
              }, 1000);

              // Clear celebration UI after 5 seconds
              setTimeout(() => set({ likeCelebration: false }), 5000);
            }
            break;
          case 'share':
            get().triggerSound('kick');
            get().setAlert({
              type: 'share',
              username: action.username,
              details: 'compartió el stream',
              avatar: action.avatar
            });
            break;
          case 'follow':
            get().triggerSound('cheer');
            get().setAlert({
              type: 'follow',
              username: action.username,
              details: 'es un nuevo seguidor',
              avatar: action.avatar
            });
            // Client-side dedup to prevent double speech from duplicate events
            const followKey = (action.username || '').toLowerCase();
            const lastFollowTime = spokenFollowTimestamps.get(followKey);
            if (!lastFollowTime || Date.now() - lastFollowTime > SPOKEN_DEDUP_MS) {
              const followText = get().settings.speech_follow_text || 'también quiere entrar a la cancha';
              get().speak(`${action.username} ${followText}`);
              spokenFollowTimestamps.set(followKey, Date.now());
            }
            break;
          case 'join':
            get().setAlert({
              type: 'join',
              username: action.username,
              details: 'se unió al estadio',
              avatar: action.avatar
            });
            break;
          case 'goal':
            get().triggerSound('goal');
            get().triggerSound('cheer');
            if (action.localScore !== undefined && action.visitorScore !== undefined) {
              set({
                localScore: action.localScore,
                visitorScore: action.visitorScore,
                matchState: 'celebrating'
              });
            }
            // Speech: who scored the goal
            const scorerName = action.scorerUsername || action.teamName || (action.teamSide === 'local' ? 'Local' : 'Visitante');
            const goalText = get().settings.speech_goal_text || 'hizo gol';
            get().speak(`${scorerName} ${goalText}`);
            break;
          case 'match_started':
            get().triggerSound('whistle');
            break;
          case 'match_paused':
            get().triggerSound('whistle');
            break;
          case 'match_finished':
            get().triggerSound('whistle');
            get().triggerSound('win');
            set({ matchState: 'finished' });
            if (timerId) {
              clearInterval(timerId);
              timerId = null;
            }
            break;
          case 'match_reset':
            // Recalibrate (match_limit is in minutes)
            set({ timeLeft: parseInt(get().settings.match_limit || '10', 10) * 60 });
            break;
        }
      });

      socket.on('donors_update', (donorsList: Donor[]) => {
        set({ donors: donorsList });
      });

      socket.on('tiktok_connection_state', (tiktokState: TikTokState) => {
        set({ tiktokState });
      });

      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          const s = get().socket;
          if (s && !s.connected) {
            console.log('Tab visible again, reconnecting socket...');
            s.connect();
          }
        }
      };

      const onWindowFocus = () => {
        const s = get().socket;
        if (s && !s.connected) {
          console.log('Window focused, reconnecting socket...');
          s.connect();
        }
      };

      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('focus', onWindowFocus);

      (window as any).__socketVisibilityHandlers = {
        visibility: onVisibilityChange,
        focus: onWindowFocus
      };

      set({ socket });
    }
  };
});
