import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { Shield, Radio, Settings, Trophy, Zap, Sparkles, Volume2, Plus, Trash, Play, Pause, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';

const TIKTOK_GIFTS = [
  { name: 'Rosa', icon: '🌹', defaultPrice: 1 },
  { name: 'TikTok', icon: '🎵', defaultPrice: 1 },
  { name: 'GG', icon: '🎮', defaultPrice: 1 },
  { name: 'Helado', icon: '🍦', defaultPrice: 1 },
  { name: 'Mini Altavoz', icon: '🔊', defaultPrice: 1 },
  { name: 'Pop', icon: '💥', defaultPrice: 1 },
  { name: 'Creeper', icon: '👻', defaultPrice: 1 },
  { name: 'Freestyle', icon: '🎤', defaultPrice: 1 },
  { name: 'Oldies', icon: '🎶', defaultPrice: 1 },
  { name: 'Wink Wink', icon: '😉', defaultPrice: 1 },
  { name: 'Glow Stick', icon: '🪄', defaultPrice: 1 },
  { name: 'Cake Slice', icon: '🍰', defaultPrice: 1 },
  { name: 'Heart Me', icon: '💓', defaultPrice: 1 },
  { name: 'So Cute', icon: '🥰', defaultPrice: 1 },
  { name: 'Thumbs Up', icon: '👍', defaultPrice: 1 },
  { name: 'Love You', icon: '💗', defaultPrice: 1 },
  { name: 'Enjoy Music', icon: '🎧', defaultPrice: 1 },
  { name: 'Rosa Blanca', icon: '🤍', defaultPrice: 5 },
  { name: 'Corazon', icon: '❤️', defaultPrice: 10 },
  { name: 'Panda', icon: '🐼', defaultPrice: 5 },
  { name: 'Drama Queen', icon: '👸', defaultPrice: 5 },
  { name: 'Finger Heart', icon: '🤟', defaultPrice: 5 },
  { name: 'Hand Heart', icon: '🤲', defaultPrice: 10 },
  { name: 'Perfume', icon: '🧪', defaultPrice: 20 },
  { name: 'Love Bang', icon: '💘', defaultPrice: 25 },
  { name: 'Dona', icon: '🍩', defaultPrice: 30 },
  { name: 'I Love You', icon: '💖', defaultPrice: 49 },
  { name: 'Slay', icon: '💅', defaultPrice: 50 },
  { name: 'Sombrero', icon: '🎩', defaultPrice: 99 },
  { name: 'Corona', icon: '👑', defaultPrice: 99 },
  { name: 'Confetti', icon: '🎊', defaultPrice: 100 },
  { name: 'Beso', icon: '💋', defaultPrice: 150 },
  { name: 'Gafas', icon: '🕶️', defaultPrice: 199 },
  { name: 'Tarta Cumpleaños', icon: '🎂', defaultPrice: 300 },
  { name: 'Trofeo', icon: '🏆', defaultPrice: 500 },
  { name: 'Cohete', icon: '🚀', defaultPrice: 500 },
  { name: 'Money Rain', icon: '💰', defaultPrice: 500 },
  { name: 'Galaxia', icon: '🌌', defaultPrice: 1000 },
  { name: 'Bola Disco', icon: '🪩', defaultPrice: 1000 },
  { name: 'Whale Diving', icon: '🐋', defaultPrice: 2150 },
  { name: 'Sirena', icon: '🧜‍♀️', defaultPrice: 2988 },
  { name: 'Concierto', icon: '🎤', defaultPrice: 3000 },
  { name: 'Avión', icon: '✈️', defaultPrice: 6000 },
  { name: 'Planeta', icon: '🪐', defaultPrice: 15000 },
  { name: 'Diamond Flight', icon: '💎', defaultPrice: 18000 },
  { name: 'Castillo', icon: '🏰', defaultPrice: 20000 },
  { name: 'Leon', icon: '🦁', defaultPrice: 29900 },
  { name: 'Universo', icon: '🌠', defaultPrice: 34900 },
];

export const AdminPanel: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  
  // Settings Form State
  const [localTeamId, setLocalTeamId] = useState('ARG');
  const [visitorTeamId, setVisitorTeamId] = useState('BRA');
  const [goalDiamonds, setGoalDiamonds] = useState(200);
  const [goalPixels, setGoalPixels] = useState(600);
  const [matchMode, setMatchMode] = useState('goals');
  const [matchLimit, setMatchLimit] = useState(3);
  const [volume, setVolume] = useState(0.5);
  const [giftCardScale, setGiftCardScale] = useState(100);
  const [scoreboardTextScale, setScoreboardTextScale] = useState(100);
  const [tiktokUser, setTiktokUser] = useState('');
  
  // Custom Gift Valuations Table State
  const [giftList, setGiftList] = useState<{ name: string; value: number; team: 'local' | 'visitor'; icon: string }[]>([]);
  const [newGiftName, setNewGiftName] = useState('Rosa');
  const [newGiftValue, setNewGiftValue] = useState(1);
  const [newGiftTeam, setNewGiftTeam] = useState<'local' | 'visitor'>('local');

  // TikTok Connection State
  const [isTikTokConnecting, setIsTikTokConnecting] = useState(false);

  // Simulator Console State
  const [simUser, setSimUser] = useState('Hincha_Futbol');
  const [simLikeCount, setSimLikeCount] = useState(10);

  const { initSocket, settings, teams, matchState, isConnected, isConnecting, tiktokState, speechRate, speechVolume, speechVoiceURI, speechEnabled, speak, setSpeechSettings } = useGameStore();

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pingStatus, setPingStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pingTime, setPingTime] = useState<string>('');
  const [pingCountdown, setPingCountdown] = useState(0);

  const doPing = async () => {
    const start = Date.now();
    setPingCountdown(600);
    try {
      const res = await fetch(`${API_URL}/api/ping`);
      const data = await res.json();
      if (data.success) {
        setPingStatus('success');
        setPingLatency(Date.now() - start);
      } else {
        setPingStatus('error');
        setPingLatency(null);
      }
    } catch {
      setPingStatus('error');
      setPingLatency(null);
    }
    setPingTime(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    doPing();
    const interval = setInterval(doPing, 600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pingCountdown <= 0) return;
    const timer = setInterval(() => {
      setPingCountdown(prev => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pingCountdown]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('es')));
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
  }, []);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Authenticate locally using token
  useEffect(() => {
    const token = sessionStorage.getItem('battle_admin_token');
    if (token) {
      setIsAuthenticated(true);
      initSocket();
      fetchSettings();
    }
  }, []);

  // Sync settings state when store updates
  useEffect(() => {
    if (settings) {
      setLocalTeamId(settings.local_team_id || 'ARG');
      setVisitorTeamId(settings.visitor_team_id || 'BRA');
      setGoalDiamonds(parseInt(settings.goal_distance_diamonds || '200', 10));
      setGoalPixels(parseInt(settings.goal_distance_pixels || '600', 10));
      setMatchMode(settings.match_mode || 'goals');
      setMatchLimit(parseInt(settings.match_limit || '3', 10));
      setVolume(parseFloat(settings.volume || '0.5'));
      setGiftCardScale(parseInt(settings.gift_card_scale || '100', 10));
      setScoreboardTextScale(parseInt(settings.scoreboard_text_scale || '100', 10));
      
      if (settings.gift_values) {
        try {
          const parsed = JSON.parse(settings.gift_values);
          const formatted = Object.entries(parsed).map(([name, data]: [string, any]) => {
            if (typeof data === 'number') {
              const defaultGift = TIKTOK_GIFTS.find(g => g.name === name);
              return { name, value: data, team: 'local' as const, icon: defaultGift?.icon || '🎁' };
            }
            return { name, value: Number(data.value), team: data.team || 'local', icon: data.icon || '🎁' };
          });
          setGiftList(formatted);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [settings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem('battle_admin_token', data.token);
        setIsAuthenticated(true);
        initSocket();
        fetchSettings();
      } else {
        setLoginError(data.message || 'Contraseña incorrecta');
      }
    } catch (err) {
      setLoginError('Error de red al intentar autenticar');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      const data = await res.json();
      if (data.success) {
        useGameStore.setState({
          settings: data.settings,
          teams: data.teams || [],
          localTeam: data.teams?.find((t: any) => t.id === data.settings.local_team_id) || null,
          visitorTeam: data.teams?.find((t: any) => t.id === data.settings.visitor_team_id) || null,
          donors: data.donors || [],
          matchState: data.settings.match_state || 'idle',
          ballProgress: parseInt(data.settings.ball_progress || '0', 10),
          localScore: parseInt(data.settings.local_score || '0', 10),
          visitorScore: parseInt(data.settings.visitor_score || '0', 10),
          tiktokState: data.tiktok || { connected: false, username: '', error: '', reconnecting: false, reconnectAttempt: 0 }
        });
        if (data.tiktok?.username) {
          setTiktokUser(data.tiktok.username);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const saveSettings = async (updatedFields: Record<string, any>) => {
    try {
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await response.json();
      if (!data.success) {
        alert('Error al guardar configuraciones');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFieldChange = (key: string, val: any) => {
    const fields = { [key]: val };
    saveSettings(fields);
  };

  // Gift additions
  const addGiftRow = () => {
    if (!newGiftName.trim()) return;
    const currentValues = giftList.reduce((acc, curr) => {
      acc[curr.name] = { value: curr.value, team: curr.team, icon: curr.icon };
      return acc;
    }, {} as Record<string, any>);

    const selectedGift = TIKTOK_GIFTS.find(g => g.name === newGiftName.trim());
    currentValues[newGiftName.trim()] = {
      value: newGiftValue,
      team: newGiftTeam,
      icon: selectedGift?.icon || '🎁'
    };
    
    handleFieldChange('gift_values', JSON.stringify(currentValues));
  };

  const removeGiftRow = (nameToRemove: string) => {
    const currentValues = giftList
      .filter(item => item.name !== nameToRemove)
      .reduce((acc, curr) => {
        acc[curr.name] = { value: curr.value, team: curr.team, icon: curr.icon };
        return acc;
      }, {} as Record<string, any>);

    handleFieldChange('gift_values', JSON.stringify(currentValues));
  };

  // Match Action Controllers
  const triggerMatchAction = async (action: 'start' | 'pause' | 'reset' | 'reset-scores') => {
    try {
      await fetch(`${API_URL}/api/match/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      fetchSettings();
    } catch (err) {
      console.error(err);
    }
  };

  // Connect TikTok Streamer
  const handleTikTokConnect = async (connect: boolean) => {
    setIsTikTokConnecting(true);
    const endpoint = connect ? 'connect' : 'disconnect';
    try {
      const response = await fetch(`${API_URL}/api/tiktok/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tiktokUser })
      });
      const data = await response.json();
      if (data.success) {
        setTimeout(fetchSettings, 1000);
        if (!connect) {
          setIsTikTokConnecting(false);
        }
      } else {
        alert(data.message || 'Error al conectar/desconectar TikTok');
        setIsTikTokConnecting(false);
      }
    } catch (err) {
      console.error(err);
      setIsTikTokConnecting(false);
    }
  };

  // Clear connecting state when tiktokState confirms connection or error
  useEffect(() => {
    if (isTikTokConnecting) {
      if (tiktokState.connected) {
        setIsTikTokConnecting(false);
      } else if (tiktokState.error && !tiktokState.reconnecting) {
        setIsTikTokConnecting(false);
      }
    }
  }, [tiktokState]);

  // Safety timeout for connecting state (15s)
  useEffect(() => {
    if (!isTikTokConnecting) return;
    const timer = setTimeout(() => setIsTikTokConnecting(false), 15000);
    return () => clearTimeout(timer);
  }, [isTikTokConnecting]);

  // Simulator API Triggers
  const simulateEvent = async (body: Record<string, any>) => {
    try {
      await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Penalty visual kick boost
  const triggerPenalty = (side: 'local' | 'visitor') => {
    simulateEvent({
      type: 'gift',
      username: `Penal_${side.toUpperCase()}`,
      giftName: side === 'local' ? 'Sombrero' : 'Perfume',
      count: 2.5 // adds extra diamonds
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"></div>
          
          <div className="flex flex-col items-center mb-6">
            <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mb-4 animate-pulse-slow">
              <Shield className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="font-sports text-2xl uppercase tracking-wider text-center text-neon-gold text-amber-500">
              Battle Control Panel
            </h1>
            <p className="text-sm text-slate-400 mt-1">TikTok World Cup Arena Admin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Contraseña de Acceso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresar contraseña..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>

            {loginError && (
              <p className="text-sm text-red-400 flex items-center gap-2 mt-2">
                <AlertTriangle className="h-4 w-4" /> {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 disabled:from-amber-600/50 disabled:to-yellow-500/50 disabled:cursor-not-allowed text-slate-950 font-bold uppercase tracking-wider py-3 rounded-lg shadow-lg hover:shadow-yellow-500/15 transition-all mt-4 flex items-center justify-center gap-2"
            >
              {isLoginLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {isLoginLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Dashboard Banner */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-white/5 glass-card">
          <div>
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500 text-neon-gold" />
              <h1 className="font-sports text-2xl uppercase tracking-wider text-slate-100">
                TikTok World Cup Battle <span className="text-amber-500 text-neon-gold">Console</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">Controla los equipos, configura los regalos, activa eventos y simula donaciones para OBS Studio.</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-xs font-semibold text-slate-300">
                Socket: {isConnected ? 'Sincronizado' : isConnecting ? 'Conectando...' : 'Desconectado'}
              </span>
              {!isConnected && !isConnecting && (
                <button
                  onClick={initSocket}
                  className="ml-1 text-[10px] text-amber-400 hover:text-amber-300 underline"
                >
                  Reconectar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700" title={`${API_URL}/api/ping`}>
              <span className={`h-2.5 w-2.5 rounded-full ${pingStatus === 'success' ? 'bg-green-500' : pingStatus === 'error' ? 'bg-red-500' : 'bg-slate-500'}`}></span>
              <span className="text-xs font-semibold text-slate-300">
                Ping: {pingStatus === 'success' ? `${pingLatency}ms` : pingStatus === 'error' ? 'Falló' : '...'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {Math.floor(pingCountdown / 60)}:{(pingCountdown % 60).toString().padStart(2, '0')}
              </span>
              {pingTime && <span className="text-[10px] text-slate-500">{pingTime}</span>}
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Column Left: Stream connection & settings */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* 1. TikTok Streamer Connection */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Radio className="h-5 w-5" />
                <h2 className="font-sports text-sm uppercase tracking-wider text-slate-200">TikTok Live Connector</h2>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Usuario de TikTok Live (Streamer)
                  </label>
                  <input
                    type="text"
                    value={tiktokUser}
                    onChange={(e) => setTiktokUser(e.target.value)}
                    placeholder="@el_streamer"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleTikTokConnect(true)}
                    disabled={tiktokState.connected || isTikTokConnecting || tiktokState.reconnecting}
                    className="flex-1 font-bold uppercase text-[10px] tracking-wider py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 border disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: tiktokState.connected ? 'rgba(34,197,94,0.15)' : isTikTokConnecting || tiktokState.reconnecting ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.12)',
                      color: tiktokState.connected ? '#22c55e' : isTikTokConnecting || tiktokState.reconnecting ? '#eab308' : '#22c55e',
                      borderColor: tiktokState.connected ? 'rgba(34,197,94,0.4)' : isTikTokConnecting || tiktokState.reconnecting ? 'rgba(234,179,8,0.4)' : 'rgba(34,197,94,0.3)'
                    }}
                  >
                    {(isTikTokConnecting || tiktokState.reconnecting) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {isTikTokConnecting ? 'Conectando...' : tiktokState.reconnecting ? 'Reconectando...' : tiktokState.connected ? 'Conectado' : 'Conectar Live'}
                  </button>
                  <button
                    onClick={() => handleTikTokConnect(false)}
                    disabled={!tiktokState.connected}
                    className="flex-1 bg-red-700/20 text-red-400 hover:bg-red-700/40 border border-red-600/30 font-bold uppercase text-[10px] tracking-wider py-2.5 rounded-lg transition-all"
                  >
                    Desconectar
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <span className={`h-2 w-2 rounded-full ${
                    tiktokState.connected ? 'bg-green-500 animate-pulse' :
                    tiktokState.reconnecting ? 'bg-yellow-400 animate-pulse' :
                    tiktokState.error === 'offline' ? 'bg-red-500' :
                    tiktokState.error === 'stream_ended' ? 'bg-orange-500' :
                    tiktokState.error ? 'bg-red-500' :
                    'bg-slate-600'
                  }`}></span>
                  <span className="text-slate-400">
                    {tiktokState.connected ? `Transmitiendo como @${tiktokState.username}` :
                     tiktokState.reconnecting ? `Reconectando... (${tiktokState.reconnectAttempt})` :
                     tiktokState.error === 'offline' ? `@${tiktokState.username} no está en vivo` :
                     tiktokState.error === 'stream_ended' ? 'Stream finalizado' :
                     tiktokState.error === 'disconnected' ? 'Conexión perdida' :
                     tiktokState.error === 'max_reconnect' ? 'Conexión perdida - Máx. reintentos' :
                     tiktokState.error ? `Error: ${tiktokState.error.slice(0, 40)}` :
                     'No conectado'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Speech / TTS Control */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Volume2 className="h-5 w-5" />
                <h2 className="font-sports text-sm uppercase tracking-wider text-slate-200">Control de Voz</h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Voz activa</label>
                  <button
                    onClick={() => setSpeechSettings({ speechEnabled: !speechEnabled })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${speechEnabled ? 'bg-green-600' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${speechEnabled ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1 flex justify-between">
                    <span>Velocidad</span>
                    <span className="text-amber-500">{speechRate.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechSettings({ speechRate: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1 flex justify-between">
                    <span>Volumen</span>
                    <span className="text-amber-500">{Math.round(speechVolume * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={speechVolume}
                    onChange={(e) => setSpeechSettings({ speechVolume: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                    Voz
                  </label>
                  <select
                    value={speechVoiceURI}
                    onChange={(e) => setSpeechSettings({ speechVoiceURI: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100 font-bold"
                  >
                    <option value="">Voz por defecto</option>
                    {voices.map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                    Texto al seguir
                  </label>
                  <input
                    type="text"
                    value={settings.speech_follow_text || 'también quiere entrar a la cancha'}
                    onChange={(e) => handleFieldChange('speech_follow_text', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100 font-bold"
                    placeholder="también quiere entrar a la cancha"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                    Texto al donar
                  </label>
                  <input
                    type="text"
                    value={settings.speech_gift_text || 'tiene la pelota'}
                    onChange={(e) => handleFieldChange('speech_gift_text', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100 font-bold"
                    placeholder="tiene la pelota"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                    Texto al hacer gol
                  </label>
                  <input
                    type="text"
                    value={settings.speech_goal_text || 'hizo gol'}
                    onChange={(e) => handleFieldChange('speech_goal_text', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100 font-bold"
                    placeholder="hizo gol"
                  />
                </div>

                <button
                  onClick={() => speak('Hola, esto es una prueba de voz')}
                  className="w-full bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 border border-amber-600/30 font-bold uppercase text-[10px] tracking-wider py-2.5 rounded-lg transition-all"
                >
                  Probar Voz
                </button>
              </div>
            </div>

            {/* 3. Volume and Config Settings */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Settings className="h-5 w-5" />
                <h2 className="font-sports text-sm uppercase tracking-wider text-slate-200">Parámetros del Juego</h2>
              </div>
              
              <div className="space-y-4">
                {/* Individual Volume Controllers */}
                <div className="space-y-3">
                  <span className="text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5 text-xs">
                    <Volume2 className="h-4 w-4" /> Volumen Individual de Sonidos
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'vol_whistle', label: 'Silbato' },
                      { id: 'vol_kick', label: 'Pateo' },
                      { id: 'vol_goal', label: 'Gol' },
                      { id: 'vol_cheer', label: 'Multitud' },
                      { id: 'vol_beep', label: 'Alarma' },
                      { id: 'vol_win', label: 'Victoria' },
                      { id: 'vol_grass', label: 'Pasto' },
                      { id: 'vol_drum', label: 'Bombos' },
                      { id: 'vol_band', label: 'Banda' },
                    ].map(sound => (
                      <div key={sound.id} className="text-xs">
                        <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1 flex justify-between">
                          <span>{sound.label}</span>
                          <span className="text-amber-500">{Math.round(parseFloat((settings as any)[sound.id] ?? volume.toString()) * 100)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={parseFloat((settings as any)[sound.id] ?? volume.toString())}
                          onChange={(e) => handleFieldChange(sound.id, e.target.value)}
                          className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="border-slate-800" />

                {/* Team Selection Selection */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Equipo Local (Izq.)
                    </label>
                    <select
                      value={localTeamId}
                      onChange={(e) => handleFieldChange('local_team_id', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 font-bold"
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Equipo Visitante (Der.)
                    </label>
                    <select
                      value={visitorTeamId}
                      onChange={(e) => handleFieldChange('visitor_team_id', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 font-bold"
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Goal distances */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Distancia al Arco (Diamantes)
                    </label>
                    <input
                      type="number"
                      value={goalDiamonds}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setGoalDiamonds(val);
                        handleFieldChange('goal_distance_diamonds', val);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Largo Cancha (Pixeles)
                    </label>
                    <input
                      type="number"
                      value={goalPixels}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setGoalPixels(val);
                        handleFieldChange('goal_distance_pixels', val);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                    />
                  </div>
                </div>

                {/* Player Scale */}
                <div className="text-xs">
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1 flex justify-between">
                    <span>Tamaño de Jugadores (%)</span>
                    <span className="text-amber-500">{settings.player_scale || '100'}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={settings.player_scale || '100'}
                    onChange={(e) => handleFieldChange('player_scale', e.target.value)}
                    className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer mt-2"
                  />
                </div>

                {/* Ball Scale */}
                <div className="text-xs">
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1 flex justify-between">
                    <span>Tamaño del Balón (%)</span>
                    <span className="text-amber-500">{settings.ball_scale || '100'}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={settings.ball_scale || '100'}
                    onChange={(e) => handleFieldChange('ball_scale', e.target.value)}
                    className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer mt-2"
                  />
                </div>

                {/* Scoreboard Text Scale */}
                <div className="text-xs">
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1 flex justify-between">
                    <span>Tamaño Textos Marcador (%)</span>
                    <span className="text-amber-500">{scoreboardTextScale}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={scoreboardTextScale}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setScoreboardTextScale(val);
                      handleFieldChange('scoreboard_text_scale', val);
                    }}
                    className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer mt-2"
                  />
                </div>

                {/* Match Limit Modes */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Modo del Partido
                    </label>
                    <select
                      value={matchMode}
                      onChange={(e) => handleFieldChange('match_mode', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 font-bold"
                    >
                      <option value="goals">Por Goles</option>
                      <option value="time">Por Tiempo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Límite (Goles / Minutos)
                    </label>
                    <input
                      type="number"
                      value={matchLimit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setMatchLimit(val);
                        handleFieldChange('match_limit', val);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                    />
                  </div>
                </div>

                {/* Overlay Resolution Selection */}
                <div className="text-xs">
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                    Resolución del Overlay (OBS)
                  </label>
                  <select
                    value={settings.overlay_resolution || '1920x1080'}
                    onChange={(e) => handleFieldChange('overlay_resolution', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 font-bold"
                  >
                    <option value="1920x1080">Horizontal Full HD (1920x1080)</option>
                    <option value="1280x720">Horizontal HD (1280x720)</option>
                    <option value="1080x1920">Vertical TikTok (1080x1920)</option>
                    <option value="auto">Ajustar al Navegador (Auto)</option>
                  </select>
                </div>
                
                <hr className="border-slate-800" />

                {/* Top Donors Configuration */}
                <div className="space-y-3">
                  <h3 className="font-sports text-[11px] uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1.5">
                    <Trophy className="h-3 w-3" /> Estilo Top Donadores
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Cantidad (Top N)
                      </label>
                      <input
                        type="number"
                        value={settings.top_donors_count || '3'}
                        onChange={(e) => handleFieldChange('top_donors_count', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Espaciado (Gap px)
                      </label>
                      <input
                        type="number"
                        value={settings.top_donors_gap || '8'}
                        onChange={(e) => handleFieldChange('top_donors_gap', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Tamaño Icono (px)
                      </label>
                      <input
                        type="number"
                        value={settings.top_donors_icon_size || '32'}
                        onChange={(e) => handleFieldChange('top_donors_icon_size', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Tamaño Fuente (px)
                      </label>
                      <input
                        type="number"
                        value={settings.top_donors_font_size || '16'}
                        onChange={(e) => handleFieldChange('top_donors_font_size', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Familia Tipográfica
                      </label>
                      <input
                        type="text"
                        value={settings.top_donors_font_family || 'Arial'}
                        onChange={(e) => handleFieldChange('top_donors_font_family', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                        placeholder="Ej. 'Inter', 'Roboto', 'Oswald'"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1 flex justify-between">
                        <span>Opacidad Fondo (%)</span>
                        <span className="text-amber-500">{settings.top_donors_bg_opacity || '60'}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.top_donors_bg_opacity || '60'}
                        onChange={(e) => handleFieldChange('top_donors_bg_opacity', e.target.value)}
                        className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer mt-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Mostrar Nombre
                      </label>
                      <select
                        value={settings.top_donors_show_name || 'true'}
                        onChange={(e) => handleFieldChange('top_donors_show_name', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      >
                        <option value="true">Sí (Nombre + Avatar)</option>
                        <option value="false">No (Solo Avatar)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Mostrar Diamantes
                      </label>
                      <select
                        value={settings.top_donors_show_diamonds ?? 'true'}
                        onChange={(e) => handleFieldChange('top_donors_show_diamonds', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      >
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Mostrar en
                      </label>
                      <select
                        value={settings.top_donors_display || 'list'}
                        onChange={(e) => handleFieldChange('top_donors_display', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      >
                        <option value="list">Lista lateral</option>
                        <option value="pitch">Dentro de la cancha</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-800" />
                
                {/* Donor Card Configuration */}
                <div className="space-y-3">
                  <h3 className="font-sports text-[11px] uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Alerta de Donación Central
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Tamaño / Escala (%)
                      </label>
                      <input
                        type="number"
                        value={settings.donor_card_scale || '100'}
                        onChange={(e) => handleFieldChange('donor_card_scale', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Posición Y (%)
                      </label>
                      <input
                        type="number"
                        value={settings.donor_card_y || '50'}
                        onChange={(e) => handleFieldChange('donor_card_y', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100 font-bold"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Column Center: Match Actions & Live Simulator */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* 4. Match Play Controls */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500">
                  <Play className="h-5 w-5" />
                  <h2 className="font-sports text-sm uppercase tracking-wider text-slate-200">Panel de Control de Partidos</h2>
                </div>
                <div className="px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20 text-xs font-bold text-amber-400 uppercase tracking-wide">
                  Estado: {matchState}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => triggerMatchAction('start')}
                  disabled={matchState === 'playing'}
                  className="flex-1 min-w-[130px] flex items-center justify-center gap-2 bg-amber-500 text-slate-950 hover:bg-yellow-400 disabled:opacity-40 disabled:hover:bg-amber-500 font-bold uppercase text-xs tracking-wider py-3 rounded-lg transition-all"
                >
                  <Play className="h-4 w-4 fill-slate-950" /> Iniciar Partido
                </button>
                
                <button
                  onClick={() => triggerMatchAction('pause')}
                  disabled={matchState !== 'playing'}
                  className="flex-1 min-w-[130px] flex items-center justify-center gap-2 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 font-bold uppercase text-xs tracking-wider py-3 rounded-lg border border-slate-700 transition-all"
                >
                  <Pause className="h-4 w-4" /> Pausar
                </button>

                <button
                  onClick={() => triggerMatchAction('reset')}
                  className="flex-1 min-w-[130px] flex items-center justify-center gap-2 bg-red-950 text-red-400 hover:bg-red-900 border border-red-800/40 font-bold uppercase text-xs tracking-wider py-3 rounded-lg transition-all"
                >
                  <RotateCcw className="h-4 w-4" /> Reiniciar Todo
                </button>

                <button
                  onClick={() => triggerMatchAction('reset-scores')}
                  className="flex-1 min-w-[130px] flex items-center justify-center gap-2 bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800 font-bold uppercase text-xs tracking-wider py-3 rounded-lg transition-all"
                >
                  Reiniciar Goles
                </button>
              </div>
            </div>

            {/* 5. Special Event Boost Activators */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Zap className="h-5 w-5" />
                <h2 className="font-sports text-sm uppercase tracking-wider text-slate-200">Eventos Especiales en Vivo</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                {/* Gold Goal */}
                <button
                  onClick={() => handleFieldChange('event_gold_goal', settings.event_gold_goal === 'true' ? 'false' : 'true')}
                  className={`px-4 py-3 rounded-lg font-bold border transition-all text-xs flex flex-col items-center gap-1 ${
                    settings.event_gold_goal === 'true'
                      ? 'bg-amber-500 border-amber-400 text-slate-950'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Trophy className="h-5 w-5 mb-0.5" />
                  <span>Gol de Oro</span>
                  <span className="text-[9px] opacity-60 uppercase font-semibold">
                    {settings.event_gold_goal === 'true' ? 'Activo' : 'Inactivo'}
                  </span>
                </button>

                {/* Multiplier x2 */}
                <button
                  onClick={() => handleFieldChange('event_multiplier', settings.event_multiplier === '2' ? '1' : '2')}
                  className={`px-4 py-3 rounded-lg font-bold border transition-all text-xs flex flex-col items-center gap-1 ${
                    settings.event_multiplier === '2'
                      ? 'bg-yellow-500 border-yellow-400 text-slate-950'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="h-5 w-5 mb-0.5" />
                  <span>Multiplicador x2</span>
                  <span className="text-[9px] opacity-60 uppercase font-semibold">
                    {settings.event_multiplier === '2' ? 'Activo' : 'Inactivo'}
                  </span>
                </button>

                {/* Turbo visual speed */}
                <button
                  onClick={() => handleFieldChange('event_turbo', settings.event_turbo === 'true' ? 'false' : 'true')}
                  className={`px-4 py-3 rounded-lg font-bold border transition-all text-xs flex flex-col items-center gap-1 ${
                    settings.event_turbo === 'true'
                      ? 'bg-emerald-600 border-emerald-400 text-slate-950'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Zap className="h-5 w-5 mb-0.5" />
                  <span>Turbo</span>
                  <span className="text-[9px] opacity-60 uppercase font-semibold">
                    {settings.event_turbo === 'true' ? 'Activo' : 'Inactivo'}
                  </span>
                </button>

                {/* Live Penalty buttons */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => triggerPenalty('local')}
                    className="flex-1 bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/20 font-bold uppercase text-[9px] tracking-wider py-1.5 rounded-lg transition-all"
                  >
                    Penal Local (+50)
                  </button>
                  <button
                    onClick={() => triggerPenalty('visitor')}
                    className="flex-1 bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/20 font-bold uppercase text-[9px] tracking-wider py-1.5 rounded-lg transition-all"
                  >
                    Penal Visitante (+50)
                  </button>
                </div>
              </div>
            </div>

            {/* 6. Real-Time TikTok Live Events Simulator */}
            <div className="glass-card rounded-2xl border border-amber-500/10 p-6 relative overflow-hidden bg-slate-900/30">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-500/10 via-amber-500/50 to-amber-500/10"></div>
              
              <div className="flex items-center gap-2 text-amber-500 mb-4">
                <Sparkles className="h-5 w-5" />
                <h2 className="font-sports text-sm uppercase tracking-wider text-slate-200">Consola de Simulación TikTok Live</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Parameters */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Nombre del Usuario Simulado
                    </label>
                    <input
                      type="text"
                      value={simUser}
                      onChange={(e) => setSimUser(e.target.value)}
                      placeholder="e.g. Leo_Messi"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Immediate Social Actions buttons */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                      Acciones Sociales Rápidas
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => simulateEvent({ type: 'follow', username: simUser })}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold py-2 rounded-lg border border-slate-700 uppercase"
                      >
                        + Seguidor
                      </button>
                      <button
                        onClick={() => simulateEvent({ type: 'share', username: simUser })}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold py-2 rounded-lg border border-slate-700 uppercase"
                      >
                        + Compartir
                      </button>
                      <button
                        onClick={() => simulateEvent({ type: 'join', username: simUser })}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold py-2 rounded-lg border border-slate-700 uppercase"
                      >
                        + Unirse
                      </button>
                    </div>
                  </div>

                  {/* Likes Simulator */}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase text-slate-400 font-semibold mb-1">
                        Cantidad de Likes
                      </label>
                      <select
                        value={simLikeCount}
                        onChange={(e) => setSimLikeCount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-bold"
                      >
                        <option value={10}>10 Likes</option>
                        <option value={50}>50 Likes</option>
                        <option value={100}>100 Likes</option>
                        <option value={500}>500 Likes</option>
                      </select>
                    </div>
                    <button
                      onClick={() => simulateEvent({ type: 'like', username: simUser, likeCount: simLikeCount })}
                      className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 border border-amber-600/30 text-[10px] font-bold py-2.5 rounded-lg uppercase"
                    >
                      Enviar Likes
                    </button>
                  </div>
                </div>

                {/* Gifts Simulator Grid */}
                <div className="space-y-3">
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    Simular Regalos (Haz Clic para Enviar)
                  </label>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    
                    {/* Local team-aligned gifts */}
                    <div className="space-y-1.5">
                      <span className="block text-[9px] uppercase font-bold text-blue-400 text-center bg-blue-900/10 py-1 rounded">
                        Apoyan al Local
                      </span>
                      <button
                        onClick={() => simulateEvent({ type: 'gift', username: simUser, giftName: 'Rosa', count: 1 })}
                        className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between"
                      >
                        <span>🌹 Rosa</span>
                        <span className="font-bold text-amber-500">1💎</span>
                      </button>
                      <button
                        onClick={() => simulateEvent({ type: 'gift', username: simUser, giftName: 'Sombrero', count: 1 })}
                        className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between"
                      >
                        <span>🎩 Sombrero</span>
                        <span className="font-bold text-amber-500">99💎</span>
                      </button>
                      <button
                        onClick={() => simulateEvent({ type: 'gift', username: simUser, giftName: 'Leon', count: 1 })}
                        className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between"
                      >
                        <span>🦁 León</span>
                        <span className="font-bold text-amber-500">29.9k💎</span>
                      </button>
                    </div>

                    {/* Visitor team-aligned gifts */}
                    <div className="space-y-1.5">
                      <span className="block text-[9px] uppercase font-bold text-yellow-400 text-center bg-yellow-900/10 py-1 rounded">
                        Apoyan al Visitante
                      </span>
                      <button
                        onClick={() => simulateEvent({ type: 'gift', username: simUser, giftName: 'TikTok', count: 1 })}
                        className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between"
                      >
                        <span>⚡ TikTok</span>
                        <span className="font-bold text-amber-500">1💎</span>
                      </button>
                      <button
                        onClick={() => simulateEvent({ type: 'gift', username: simUser, giftName: 'Perfume', count: 1 })}
                        className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between"
                      >
                        <span>🧪 Perfume</span>
                        <span className="font-bold text-amber-500">20💎</span>
                      </button>
                      <button
                        onClick={() => simulateEvent({ type: 'gift', username: simUser, giftName: 'Universo', count: 1 })}
                        className="w-full text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between"
                      >
                        <span>🌌 Universo</span>
                        <span className="font-bold text-amber-500">34.9k💎</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            {/* 7. Editable Gifts to Diamonds Table */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Settings className="h-5 w-5" />
                <h2 className="font-sports text-sm uppercase tracking-wider text-slate-200">Valuación de Regalos Personalizados</h2>
              </div>

              <div className="space-y-4">
                {/* Inputs to add new */}
                <div className="grid grid-cols-4 gap-2 items-end">
                  <div className="col-span-1">
                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-1">Nombre Regalo</label>
                    <select
                      value={newGiftName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setNewGiftName(name);
                        const gift = TIKTOK_GIFTS.find(g => g.name === name);
                        if (gift) setNewGiftValue(gift.defaultPrice);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
                    >
                      {TIKTOK_GIFTS.map(g => (
                        <option key={g.name} value={g.name}>{g.icon} {g.name} ({g.defaultPrice}💎)</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-1">Valor</label>
                    <input
                      type="number"
                      value={newGiftValue}
                      onChange={(e) => setNewGiftValue(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none font-bold"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[9px] uppercase text-slate-400 font-semibold mb-1">Equipo</label>
                    <select
                      value={newGiftTeam}
                      onChange={(e) => setNewGiftTeam(e.target.value as 'local' | 'visitor')}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none font-bold"
                    >
                      <option value="local">Local</option>
                      <option value="visitor">Visitante</option>
                    </select>
                  </div>
                  <button
                    onClick={addGiftRow}
                    className="bg-amber-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 h-[30px] col-span-1"
                  >
                    <Plus className="h-4 w-4" /> Agregar
                  </button>
                </div>

                {/* Gift Scale Control */}
                <div className="flex items-center gap-3 text-xs">
                  <label className="block text-[10px] uppercase text-slate-400 font-semibold whitespace-nowrap">
                    Tamaño Regalos (%)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={giftCardScale}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setGiftCardScale(val);
                      handleFieldChange('gift_card_scale', val);
                    }}
                    className="w-full accent-amber-500 bg-slate-900 h-1.5 rounded-lg cursor-pointer"
                  />
                  <span className="font-bold text-amber-500 min-w-[3ch] text-right">{giftCardScale}%</span>
                </div>

                {/* Table grid */}
                <div className="max-h-[350px] overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[9px]">
                        <th className="px-4 py-2">Regalo</th>
                        <th className="px-4 py-2">Equipo</th>
                        <th className="px-4 py-2">Diamantes</th>
                        <th className="px-4 py-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {[...giftList].reverse().map(item => (
                        <tr key={item.name} className="hover:bg-slate-900/30 text-slate-200">
                          <td className="px-4 py-2.5 font-semibold flex items-center gap-2">
                            <span>{item.icon}</span> <span>{item.name}</span>
                          </td>
                          <td className="px-4 py-2.5 font-semibold">
                            <span className={item.team === 'local' ? 'text-blue-400' : 'text-yellow-400'}>
                              {item.team === 'local' ? 'Local' : 'Visitante'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-amber-400">{item.value} 💎</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => removeGiftRow(item.name)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
