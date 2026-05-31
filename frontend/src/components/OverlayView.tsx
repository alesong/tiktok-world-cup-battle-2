import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { globalSoundSynth } from '../audio/SoundSynth.js';
import { Trophy, Zap, Sparkles, Heart, Award } from 'lucide-react';
import Phaser from 'phaser';
import { GameScene } from '../game/GameScene.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const OverlayView: React.FC = () => {
  const {
    initSocket,
    matchState,
    ballProgress,
    localScore,
    visitorScore,
    localTeam,
    visitorTeam,
    donors,
    settings,

    timeLeft,
    likeProgress,
    lastLiker,
    upcomingReward,
    rewardTimeLeft,
    likeCelebration,
    lastDonor
  } = useGameStore();

  // Load settings from localStorage on mount (cross-tab sync)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tiktok_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[Overlay] localStorage mount:', parsed.scoreboard_text_scale, parsed.top_donors_icon_size);
        useGameStore.setState({ settings: { ...useGameStore.getState().settings, ...parsed } });
      }
    } catch { /* ignore */ }
  }, []);

  // Poll settings periodically as a fallback for socket updates
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings?t=${Date.now()}`);
        const data = await res.json();
        console.log('[Overlay] poll got settings:', data.settings?.scoreboard_text_scale, data.settings?.top_donors_icon_size);
        if (data.settings) {
          const currentSettings = useGameStore.getState().settings;
          useGameStore.setState({ settings: { ...currentSettings, ...data.settings }, donors: data.donors || [] });
        }
      } catch { /* ignore */ }
    };
    fetchSettings();
    pollRef.current = setInterval(fetchSettings, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Cross-tab settings sync via localStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tiktok_settings' && e.newValue) {
        try {
          const stored = JSON.parse(e.newValue);
          console.log('[Overlay] storage event:', stored.scoreboard_text_scale, stored.top_donors_icon_size);
          useGameStore.setState({ settings: { ...useGameStore.getState().settings, ...stored } });
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Initialize socket connection and sound synthesis reference
  useEffect(() => {
    initSocket();

    // Inject the synthetic sound class into the Zustand store for runtime triggers
    useGameStore.setState({ soundSynth: globalSoundSynth });

    // Mount Phaser Game Scene
    const config = {
      type: Phaser.AUTO,
      width: 1920,
      height: 1080,
      parent: 'phaser-game-container',
      transparent: true, // Let the CSS background gradients leak through
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: 'arcade'
      },
      scene: [GameScene]
    };

    const game = new Phaser.Game(config);

    return () => {
      if (game) {
        game.destroy(true);
      }
    };
  }, []);

  // Helpers for timer conversions
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Determine current lead team and color for styling
  const isTurbo = settings.event_turbo === 'true';
  const isGoldGoal = settings.event_gold_goal === 'true';
  const isMultiplier = settings.event_multiplier === '2';

  // Calculate ball progress bar fill percent
  const maxDiamonds = parseInt(settings.goal_distance_diamonds || '200', 10);
  const fillPercent = Math.max(0, Math.min(100, 50 + ((ballProgress / maxDiamonds) * 50))); // ranges 0% to 100%

  const resolution = settings.overlay_resolution || '1920x1080';
  const isVertical = resolution === '1080x1920';
  const parsedWidth = parseInt(resolution.split('x')[0], 10);
  const scale = parsedWidth > 0 ? parsedWidth / 1920 : 1;
  const textScale = parseInt(settings.scoreboard_text_scale || '100', 10) / 100;

  // Parse gifts from settings
  let giftListLocal: any[] = [];
  let giftListVisitor: any[] = [];
  try {
    const parsedGifts = JSON.parse(settings.gift_values || '{}');
    const allGifts = Object.entries(parsedGifts).map(([name, data]: [string, any]) => {
      if (typeof data === 'number') {
        return { name, value: data, team: 'local', icon: '🎁' };
      }
      return { name, value: Number(data.value), team: data.team || 'local', icon: data.icon || '🎁' };
    });
    giftListLocal = allGifts.filter(g => g.team === 'local');
    giftListVisitor = allGifts.filter(g => g.team === 'visitor');
  } catch (e) {
    // ignore
  }

  // Top donors settings
  const donorsCount = parseInt(settings.top_donors_count || '3', 10);
  const donorsGap = parseInt(settings.top_donors_gap || '8', 10);
  const donorsIconSize = parseInt(settings.top_donors_icon_size || '32', 10);
  const donorsFontSize = parseInt(settings.top_donors_font_size || '16', 10);
  const donorsFontFamily = settings.top_donors_font_family || 'Arial';
  const donorsBgOpacity = parseInt(settings.top_donors_bg_opacity || '60', 10) / 100;
  const donorsShowName = settings.top_donors_show_name !== 'false';
  const donorsShowDiamonds = settings.top_donors_show_diamonds !== 'false';
  const donorsBorderWidth = parseInt(settings.top_donors_border_width || '3', 10);

  const topDonorsLocal = donors.filter(d => d.teamId === localTeam?.id).slice(0, donorsCount);
  const topDonorsVisitor = donors.filter(d => d.teamId === visitorTeam?.id).slice(0, donorsCount);
  const donorsDisplay = settings.top_donors_display || 'list';
  const giftCardScale = parseInt(settings.gift_card_scale || '100', 10) / 100;
  const giftCardMargin = parseInt(settings.gift_card_margin || '100', 10) / 100;

  console.log(`[Overlay] resolution=${resolution} scale=${scale} textScale=${textScale} donorsIconSize=${donorsIconSize} gift_card_margin=${settings.gift_card_margin} giftCardMargin=${giftCardMargin}`);

  const allTopDonors = donors.slice(0, donorsCount);

  // Random positions for pitch display mode
  const [donorPositions, setDonorPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Content-based key to detect actual donor roster changes
  const donorsKey = allTopDonors.map(d => d.username).join(',');

  // Set initial positions when donors change in pitch mode
  useEffect(() => {
    if (donorsDisplay !== 'pitch') return;
    const positions: Record<string, { x: number; y: number }> = {};
    allTopDonors.forEach(d => {
      positions[d.username] = {
        x: 25 + Math.random() * 50,
        y: 30 + Math.random() * 40
      };
    });
    setDonorPositions(prev => ({ ...prev, ...positions }));
  }, [donorsDisplay, donorsKey]);

  // Ensure any new donor without a position gets one (catches content changes without length change)
  useEffect(() => {
    if (donorsDisplay !== 'pitch') return;
    const missing = allTopDonors.filter(d => !donorPositions[d.username]);
    if (missing.length === 0) return;
    setDonorPositions(prev => {
      const next = { ...prev };
      missing.forEach(d => {
        next[d.username] = {
          x: 25 + Math.random() * 50,
          y: 30 + Math.random() * 40
        };
      });
      return next;
    });
  }, [donorsDisplay, donorsKey]);

  // Auto-move randomly (keeps interval alive throughout match, pauses movement during breaks)
  useEffect(() => {
    if (donorsDisplay !== 'pitch') return;
    const isActive = matchState === 'playing';
    const move = () => {
      if (!isActive) return;
      setDonorPositions(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const current = next[k];
          next[k] = {
            x: Math.max(25, Math.min(75, current.x + (Math.random() - 0.5) * 20)),
            y: Math.max(30, Math.min(70, current.y + (Math.random() - 0.5) * 16))
          };
        });
        return next;
      });
    };
    if (isActive) move();
    const id = window.setInterval(move, 7000 + Math.random() * 5000);
    return () => clearInterval(id);
  }, [donorsDisplay, matchState]);

  let containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    backgroundImage: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
  };

  if (resolution === '1920x1080') {
    containerStyle = { ...containerStyle, width: '1920px', height: '1080px' };
  } else if (resolution === '1280x720') {
    containerStyle = { ...containerStyle, width: '1280px', height: '720px' };
  } else if (resolution === '1080x1920') {
    containerStyle = { ...containerStyle, width: '1080px', height: '1920px' };
  } else {
    containerStyle = { ...containerStyle, width: '100%', height: '100%' };
  }

  return (
    <div
      style={containerStyle}
      className="antialiased font-sans"
      onClick={() => globalSoundSynth.play('kick', 0)}
    >

      {/* Background container for Phaser canvas */}
      <div
        id="phaser-game-container"
        className={isVertical ? "absolute left-0 w-full aspect-[16/9] top-1/2 -translate-y-1/2 z-0" : "absolute inset-0 z-0"}
      ></div>

      {/* --- HUD FOREGROUND OVERLAYS --- */}
      <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between pointer-events-none">

        {/* 1. TOP HUD CONTAINER (Scoreboard + Gifts + Donors) */}
        <div className="w-full flex flex-col items-center">
          {/* SCOREBOARD */}
          <div className="w-full flex justify-center items-start px-[2vw]">
            <div
              className="relative glass-card flex items-center justify-between rounded-full border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden"
              style={{
                padding: `${0.83 * scale}vw ${1.67 * scale}vw`,
                minHeight: `${4.17 * scale}vw`,
                width: `${isVertical ? 95 : 92}%`
              }}
            >
              {/* Glossy overlay background */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>

              {/* Local Team Info */}
              <div className="flex items-center w-1/3 justify-end" style={{ gap: `${0.83 * scale}vw` }}>
                <span className="font-sports font-extrabold uppercase tracking-wider text-slate-100 truncate" style={{ fontSize: `${1.04 * scale * textScale}vw` }}>
                  {localTeam?.name || 'ARGENTINA'}
                </span>
                <div
                  className="rounded-full border border-white/20 bg-slate-900 shadow-md flex items-center justify-center select-none"
                  style={{ width: `${2.5 * scale}vw`, height: `${2.5 * scale}vw`, fontSize: `${1.56 * scale * textScale}vw` }}
                >
                  {localTeam?.flag || '🇦🇷'}
                </div>
              </div>

              {/* Scores & Clock */}
              <div className="flex items-center justify-center w-1/3 z-10" style={{ gap: `${1.25 * scale}vw`, padding: `0 ${1 * scale}vw` }}>
                <span className="font-sports font-black text-neon-green text-green-400 text-right" style={{ fontSize: `${2.08 * scale * textScale}vw`, minWidth: `${2.34 * scale}vw` }}>
                  {localScore}
                </span>

                {/* Timer clock HUD */}
                <div
                  className="flex flex-col items-center justify-center bg-slate-950/80 rounded-xl border border-white/5 shadow-inner"
                  style={{ padding: `${0.31 * scale}vw ${0.83 * scale}vw` }}
                >
                  <span className="font-sports font-bold text-slate-300 tracking-wider" style={{ fontSize: `${0.94 * scale * textScale}vw` }}>
                    {settings.match_mode === 'time' ? formatTime(timeLeft) : 'LIVE'}
                  </span>
                  <span className="uppercase tracking-widest text-amber-500 font-extrabold text-neon-gold" style={{ fontSize: `${0.47 * scale * textScale}vw` }}>
                    BATTLE
                  </span>
                </div>

                <span className="font-sports font-black text-neon-red text-red-500 text-left" style={{ fontSize: `${2.08 * scale * textScale}vw`, minWidth: `${2.34 * scale}vw` }}>
                  {visitorScore}
                </span>
              </div>

              {/* Visitor Team Info */}
              <div className="flex items-center w-1/3 justify-start" style={{ gap: `${0.83 * scale}vw` }}>
                <div
                  className="rounded-full border border-white/20 bg-slate-900 shadow-md flex items-center justify-center select-none"
                  style={{ width: `${2.5 * scale}vw`, height: `${2.5 * scale}vw`, fontSize: `${1.56 * scale * textScale}vw` }}
                >
                  {visitorTeam?.flag || '🇧🇷'}
                </div>
                <span className="font-sports font-extrabold uppercase tracking-wider text-slate-100 truncate" style={{ fontSize: `${1.04 * scale * textScale}vw` }}>
                  {visitorTeam?.name || 'BRASIL'}
                </span>
              </div>

              {/* Progress indicators at bottom edge of scoreboard */}
              <div className="absolute bottom-0 left-0 right-0 bg-slate-950/70" style={{ height: `${0.26 * scale}vw` }}>
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 transition-all duration-300"
                  style={{ width: `${fillPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* GIFTS AND DONORS HUD */}
          <div className={`w-full flex pointer-events-none ${isVertical ? 'flex-col items-center gap-[1.5vw]' : 'flex-row justify-between items-start'} ${isVertical ? '' : 'px-[2.5vw]'}`} style={{ marginTop: `${0.83 * scale}vw` }}>
            {/* LOCAL SIDE */}
            <div className={`flex flex-col ${isVertical ? 'w-full items-center' : 'items-start'}`} style={{ gap: `${0.63 * scale}vw`, width: isVertical ? '100%' : `${23 * scale}vw` }}>
              {/* Gifts */}
              <div className="flex flex-nowrap items-center" style={{ gap: `${0.42 * giftCardScale * scale * giftCardMargin}vw` }}>
                {giftListLocal.map(gift => {
                  const isHighlighted = lastDonor?.giftName === gift.name;
                  return (
                    <div
                      key={gift.name}
                      className={`flex flex-col items-center bg-slate-900/80 rounded-xl border transition-all duration-300 ${isHighlighted ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.9)] z-10' : 'border-white/10 shadow-xl'}`}
                      style={{ transform: `scale(${giftCardScale * (isHighlighted ? 1.1 : 1)})`, padding: `${0.31 * scale * giftCardMargin}vw`, margin: `0 ${0.21 * scale * giftCardMargin}vw` }}
                    >
                      <span className="drop-shadow-lg" style={{ fontSize: `${1.56 * scale}vw`, marginBottom: `${0.1 * scale}vw` }}>{gift.icon}</span>
                      <span className="font-sports font-bold text-white tracking-wider uppercase text-center" style={{ fontSize: `${0.52 * scale}vw` }}>{gift.value} PASOS</span>
                      <div className="text-amber-500 font-black animate-pulse" style={{ fontSize: `${1.04 * scale}vw`, marginTop: `${0.1 * scale}vw` }}>➔</div>
                    </div>
                  );
                })}
              </div>

              {/* Top Jugadores Local */}
              {(donorsDisplay !== 'pitch') && (
                <div className={`flex flex-col ${isVertical ? 'items-center w-full' : 'w-full'}`} style={{ gap: `${donorsGap * scale}px` }}>
                  <h3 className={`font-sports text-white/80 tracking-widest uppercase ${isVertical ? 'text-center' : ''}`} style={{ fontSize: `${0.52 * scale}vw`, marginBottom: `${0.1 * scale}vw` }}>Top Jugadores</h3>
                  {topDonorsLocal.map((donor, idx) => (
                    <div key={donor.username} className={`flex items-center rounded-lg border border-white/5 shadow-md ${donorsShowName ? 'w-full' : 'w-fit'}`} style={{ gap: `${0.42 * scale}vw`, padding: `${0.31 * scale}vw`, backgroundColor: `rgba(15, 23, 42, ${donorsBgOpacity})` }}>
                      {idx === 0 ? (
                        <span className="relative" style={{ width: `${1.04 * scale}vw`, height: `${0.83 * scale}vw` }}>
                          <span className="absolute drop-shadow-lg" style={{ fontSize: `${1.2 * scale}vw`, top: '-50%', left: '-20%' }}>👑</span>
                        </span>
                      ) : (
                        <span className="text-amber-500 font-black" style={{ fontSize: `${0.83 * scale}vw`, width: `${1.04 * scale}vw` }}>#{idx + 1}</span>
                      )}
                      <img src={donor.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${donor.username}`} className="rounded-full border border-white/20" alt="avatar" width={donorsIconSize * scale} height={donorsIconSize * scale} style={{ width: `${donorsIconSize * scale}px`, height: `${donorsIconSize * scale}px` }} />
                      {donorsShowName && <span className="text-white font-bold truncate flex-1" style={{ fontSize: `${donorsFontSize * scale}px`, fontFamily: donorsFontFamily }}>{donor.username}</span>}
                      {donorsShowDiamonds && <span className="text-amber-400 font-bold" style={{ fontSize: `${donorsFontSize * scale}px`, fontFamily: donorsFontFamily }}>{donor.diamonds} 💎</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* VISITOR SIDE */}
            <div className={`flex flex-col ${isVertical ? 'w-full items-center' : 'items-end'}`} style={{ gap: `${0.63 * scale}vw`, width: isVertical ? '100%' : `${23 * scale}vw` }}>
              {/* Gifts */}
              <div className="flex flex-nowrap items-center" style={{ gap: `${0.42 * giftCardScale * scale * giftCardMargin}vw` }}>
                {giftListVisitor.map(gift => {
                  const isHighlighted = lastDonor?.giftName === gift.name;
                  return (
                    <div
                      key={gift.name}
                      className={`flex flex-col items-center bg-slate-900/80 rounded-xl border transition-all duration-300 ${isHighlighted ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.9)] z-10' : 'border-white/10 shadow-xl'}`}
                      style={{ transform: `scale(${giftCardScale * (isHighlighted ? 1.1 : 1)})`, padding: `${0.31 * scale * giftCardMargin}vw`, margin: `0 ${0.21 * scale * giftCardMargin}vw` }}
                    >
                      <span className="drop-shadow-lg" style={{ fontSize: `${1.56 * scale}vw`, marginBottom: `${0.1 * scale}vw` }}>{gift.icon}</span>
                      <span className="font-sports font-bold text-white tracking-wider uppercase text-center" style={{ fontSize: `${0.52 * scale}vw` }}>{gift.value} PASOS</span>
                      <div className="text-amber-500 font-black animate-pulse" style={{ fontSize: `${1.04 * scale}vw`, marginTop: `${0.1 * scale}vw` }}>←</div>
                    </div>
                  );
                })}
              </div>

              {/* Top Jugadores Visitor */}
              {(donorsDisplay !== 'pitch') && (
                <div className={`flex flex-col ${isVertical ? 'items-center w-full' : 'w-full'}`} style={{ gap: `${donorsGap * scale}px` }}>
                  <h3 className={`font-sports text-white/80 tracking-widest uppercase ${isVertical ? 'text-center' : 'text-right'}`} style={{ fontSize: `${0.52 * scale}vw`, marginBottom: `${0.1 * scale}vw` }}>Top Jugadores</h3>
                  {topDonorsVisitor.map((donor, idx) => (
                    <div key={donor.username} className={`flex items-center rounded-lg border border-white/5 shadow-md ${donorsShowName ? 'w-full' : 'w-fit'}`} style={{ gap: `${0.42 * scale}vw`, padding: `${0.31 * scale}vw`, backgroundColor: `rgba(15, 23, 42, ${donorsBgOpacity})` }}>
                      {donorsShowDiamonds && <span className="text-amber-400 font-bold" style={{ fontSize: `${donorsFontSize * scale}px`, fontFamily: donorsFontFamily }}>{donor.diamonds} 💎</span>}
                      {donorsShowName && <span className="text-white font-bold truncate flex-1 text-right" style={{ fontSize: `${donorsFontSize * scale}px`, fontFamily: donorsFontFamily }}>{donor.username}</span>}
                      <img src={donor.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${donor.username}`} className="rounded-full border border-white/20" alt="avatar" style={{ width: `${donorsIconSize * scale}px`, height: `${donorsIconSize * scale}px` }} />
                      {idx === 0 ? (
                        <span className="relative" style={{ width: `${1.04 * scale}vw`, height: `${0.83 * scale}vw` }}>
                          <span className="absolute drop-shadow-lg" style={{ fontSize: `${1.2 * scale}vw`, top: '-50%', left: '-20%' }}>👑</span>
                        </span>
                      ) : (
                        <span className="text-amber-500 font-black text-right" style={{ fontSize: `${0.83 * scale}vw`, width: `${1.04 * scale}vw` }}>#{idx + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. SOCIAL ALERTS */}
        <div className={`flex w-full ${isVertical ? 'flex-col items-center justify-end gap-6 flex-1 mb-8' : 'justify-end items-end h-[680px]'}`}>


          {/* Social alerts notification box + events floating tags */}
          <div className={`flex flex-col gap-4 ${isVertical ? 'items-center mt-2 w-full order-first mb-4' : 'items-end self-end mb-4 mr-2'}`}>

            {/* Event Glowing Tags */}
            <div className={`flex gap-2 ${isVertical ? 'flex-row flex-wrap justify-center' : 'flex-col items-end'}`}>
              {isMultiplier && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-yellow-500 text-slate-950 font-black text-xs uppercase shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-300 animate-pulse">
                  <Sparkles className="h-4 w-4 fill-slate-950" /> MULTIPLICADOR X2 ACTIVO
                </div>
              )}
              {isGoldGoal && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300 animate-pulse">
                  <Trophy className="h-4 w-4 fill-slate-950" /> GOL DE ORO
                </div>
              )}
              {isTurbo && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs uppercase shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-300 animate-pulse">
                  <Zap className="h-4 w-4 fill-slate-950" /> TURBO VELOCIDAD
                </div>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* PITCH MODE: Floating Top Donors (z-45 to stay above celebration overlay) */}
      {donorsDisplay === 'pitch' && allTopDonors.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ top: '30%', bottom: '14%', zIndex: 45 }}>
          <style>{`
            @keyframes donor-float {
              0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
              50% { transform: translate(-50%, -50%) translateY(-10px); }
            }
          `}</style>
          {allTopDonors.map((donor, idx) => {
            const pos = donorPositions[donor.username];
            if (!pos) return null;
            const isLocal = donor.teamId === localTeam?.id;
            return (
              <div
                key={donor.username}
                className="absolute flex flex-col items-center transition-all duration-15000 ease-in-out"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  animation: `donor-float ${2.5 + (idx * 0.3)}s ease-in-out infinite`,
                  animationDelay: `${idx * 0.6}s`
                }}
              >
                {idx === 0 && <span className="absolute z-10 drop-shadow-lg" style={{ fontSize: `${donorsIconSize * scale * 0.8}px`, top: `-${donorsIconSize * scale * 0.7}px` }}>👑</span>}
                <div className="rounded-full shadow-lg bg-slate-800 flex items-center justify-center overflow-hidden" style={{ width: `${donorsIconSize * scale}px`, height: `${donorsIconSize * scale}px`, border: `${donorsBorderWidth}px solid ${idx === 0 ? '#eab308' : isLocal ? 'rgba(96,165,250,0.7)' : 'rgba(251,191,36,0.7)'}` }}>
                  <img
                    src={donor.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${donor.username}`}
                    alt={donor.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                {donorsShowName && (
                  <span className="text-white font-bold mt-[0.3vw] px-[0.4vw] py-[0.15vw] rounded-full whitespace-nowrap" style={{ backgroundColor: `rgba(15, 23, 42, ${donorsBgOpacity})`, fontSize: `${donorsFontSize * scale}px`, fontFamily: donorsFontFamily }}>
                    {donor.username}
                  </span>
                )}
                {donorsShowDiamonds && (
                  <span className="text-amber-400 font-bold mt-[0.15vw] px-[0.4vw] py-[0.15vw] rounded-full whitespace-nowrap" style={{ backgroundColor: `rgba(15, 23, 42, ${donorsBgOpacity})`, fontSize: `${(donorsFontSize - 2) * scale}px`, fontFamily: donorsFontFamily }}>
                    {donor.diamonds} 💎
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- DONOR CENTER SCREEN ALERT --- */}
      <div
        className={`absolute left-1/2 z-50 transition-all duration-500 pointer-events-none ${lastDonor ? 'opacity-100' : 'opacity-0'}`}
        style={{
          top: `${settings.donor_card_y || '50'}%`,
          transform: `translate(-50%, -50%) scale(${(parseInt(settings.donor_card_scale || '100', 10) / 100) * (lastDonor ? 1 : 0.5)})`
        }}
      >
        {lastDonor && (
          <div className="flex flex-col items-center gap-4 bg-slate-900/95 px-12 py-8 rounded-3xl border-2 border-cyan-400 shadow-[0_0_60px_rgba(6,182,212,0.6)]">
            <img src={lastDonor.avatar} alt="avatar" className="rounded-full border-4 border-cyan-400 shadow-xl" style={{ width: `${Math.max(donorsIconSize * scale * 3, 48)}px`, height: `${Math.max(donorsIconSize * scale * 3, 48)}px` }} />
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-4xl font-black text-white text-center">{lastDonor.username}</span>
              <span className="text-2xl font-bold text-cyan-400 uppercase tracking-widest text-center">¡Está jugando en la cancha!</span>
            </div>
            <Sparkles className="w-14 h-14 text-cyan-400 fill-cyan-400 animate-spin-slow" />
          </div>
        )}
      </div>

      {/* 3. LIKE PROGRESS BAR HUD */}
      <div className={`absolute left-1/2 -translate-x-1/2 w-full max-w-2xl flex flex-col items-center gap-3 pointer-events-auto z-30 ${isVertical ? 'bottom-20' : 'bottom-12'}`}>
        {/* Last Liker */}
        <div className={`transition-all duration-300 h-12 ${lastLiker ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {lastLiker && (
            <div className="flex items-center gap-3 bg-slate-900/95 px-5 py-2 rounded-full border border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.4)]">
              <img src={lastLiker.avatar} alt="avatar" className="w-10 h-10 rounded-full border-2 border-pink-500 shadow-md" />
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white">{lastLiker.username}</span>
                <span className="text-sm font-bold text-pink-400 uppercase tracking-wider">Está en la tribuna</span>
              </div>
              <Heart className="w-8 h-8 text-pink-500 fill-pink-500 animate-bounce" />
            </div>
          )}
        </div>

        {/* Progress Bar Container */}
        <div className={`w-full relative h-10 bg-slate-950/80 border border-white/20 rounded-full shadow-2xl p-1 flex items-center ${likeCelebration ? 'animate-pulse shadow-[0_0_40px_rgba(236,72,153,0.8)]' : ''}`}>

          {rewardTimeLeft > 0 ? (
            // Active Reward Countdown View
            <div className="w-full flex items-center justify-center gap-3">
              {upcomingReward === 'event_gold_goal' && <Trophy className="w-6 h-6 text-amber-500 text-neon-gold" />}
              {upcomingReward === 'event_multiplier' && <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />}
              {upcomingReward === 'event_turbo' && <Zap className="w-6 h-6 text-emerald-400 fill-emerald-400" />}

              <span className="font-sports font-black text-2xl text-white drop-shadow-md">
                {formatTime(rewardTimeLeft)}
              </span>

              <span className="font-sports font-bold text-sm text-amber-400 uppercase tracking-wide ml-2">
                {upcomingReward === 'event_gold_goal' && 'GOL DE ORO ACTIVO'}
                {upcomingReward === 'event_multiplier' && 'MULTIPLICADOR X2 ACTIVO'}
                {upcomingReward === 'event_turbo' && 'TURBO ACTIVO'}
              </span>
            </div>
          ) : (
            // Normal Progress Bar View
            <>
              <div className="absolute left-4 z-10 flex flex-col justify-center drop-shadow-md">
                <div className="font-sports font-black text-sm text-white/90 uppercase flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-pink-500 fill-pink-500" /> META DE LIKES
                </div>
                <span className="text-[9px] text-white/60 font-bold uppercase tracking-wider -mt-0.5 ml-5">
                  (Para adquirir una recompensa)
                </span>
              </div>

              <div className="absolute right-14 z-10 font-sports font-black text-sm text-white/90 drop-shadow-md">
                {`${likeProgress}/10K`}
              </div>

              {/* The fill */}
              <div
                className="h-full bg-gradient-to-r from-pink-600 via-purple-500 to-indigo-500 rounded-full transition-all duration-300 relative shadow-[0_0_20px_rgba(236,72,153,0.5)] flex justify-end items-center"
                style={{ width: `${(likeProgress / 10000) * 100}%` }}
              >
                {/* Tip flash */}
                {likeProgress > 0 && (
                  <div className="w-8 h-12 bg-white/50 blur-md rounded-full -mr-4 animate-pulse"></div>
                )}
              </div>

              {/* The reward Icon at the very end */}
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.8)] flex items-center justify-center mb-1">
                  {upcomingReward === 'event_gold_goal' && <Trophy className="w-7 h-7 text-amber-500 text-neon-gold" />}
                  {upcomingReward === 'event_multiplier' && <Sparkles className="w-7 h-7 text-yellow-400 fill-yellow-400" />}
                  {upcomingReward === 'event_turbo' && <Zap className="w-7 h-7 text-emerald-400 fill-emerald-400" />}
                </div>
                <div className="bg-slate-950/90 px-2 py-0.5 rounded border border-amber-500/50 shadow-lg pointer-events-auto">
                  {upcomingReward === 'event_gold_goal' && <span className="text-[10px] font-sports font-black text-amber-500 uppercase whitespace-nowrap">Gol de Oro</span>}
                  {upcomingReward === 'event_multiplier' && <span className="text-[10px] font-sports font-black text-yellow-400 uppercase whitespace-nowrap">Multiplicador x2</span>}
                  {upcomingReward === 'event_turbo' && <span className="text-[10px] font-sports font-black text-emerald-400 uppercase whitespace-nowrap">Turbo</span>}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* --- HIGH-IMPACT GOAL SCREEN (Mounts on celebration state) --- */}
      {matchState === 'celebrating' && (
        <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-center items-center pointer-events-none animate-pulse">
          <div className="flex flex-col items-center justify-center max-w-[1200px] text-center p-10 relative">

            {/* Flash spotlight background */}
            <div className="absolute -z-10 h-[500px] w-[500px] bg-amber-500/20 rounded-full blur-[120px] animate-ping"></div>

            <div className="text-8xl select-none select-none select-none animate-bounce-slow">
              ⚽🔥⚽
            </div>

            <h1 className="font-sports font-black text-neon-gold text-[120px] leading-none uppercase text-amber-500 mt-4 tracking-tighter scale-110">
              GOOOOOOOOOL
            </h1>

            <div className="flex items-center gap-4 mt-6 px-8 py-3 rounded-full bg-slate-900 border border-white/10 shadow-2xl">
              <span className="text-4xl font-sports font-extrabold text-slate-200">
                DE {(localScore > visitorScore ? localTeam?.name : visitorTeam?.name) || 'BATTLE TEAM'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* --- FUT STYLE END-GAME MVP SCREEN --- */}
      {matchState === 'finished' && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-center items-center pointer-events-none">
          <div className="flex flex-col items-center justify-center max-w-[1200px] text-center p-10 relative">

            {/* Spinning Golden Rays */}
            <div className="absolute -z-10 h-[800px] w-[800px] opacity-15 animate-spin-slow">
              <svg viewBox="0 0 100 100" className="w-full h-full text-yellow-500 fill-current">
                <path d="M50 50 L0 0 L10 0 Z" />
                <path d="M50 50 L20 0 L30 0 Z" />
                <path d="M50 50 L40 0 L50 0 Z" />
                <path d="M50 50 L60 0 L70 0 Z" />
                <path d="M50 50 L80 0 L90 0 Z" />
                <path d="M50 50 L100 0 L100 10 Z" />
                <path d="M50 50 L100 20 L100 30 Z" />
                <path d="M50 50 L100 40 L100 50 Z" />
                <path d="M50 50 L100 60 L100 70 Z" />
                <path d="M50 50 L100 80 L100 90 Z" />
                <path d="M50 50 L100 100 L90 100 Z" />
                <path d="M50 50 L80 100 L70 100 Z" />
                <path d="M50 50 L60 100 L50 100 Z" />
                <path d="M50 50 L40 100 L30 100 Z" />
                <path d="M50 50 L20 100 L10 100 Z" />
                <path d="M50 50 L0 100 L0 90 Z" />
                <path d="M50 50 L0 80 L0 70 Z" />
                <path d="M50 50 L0 60 L0 50 Z" />
                <path d="M50 50 L0 40 L0 30 Z" />
                <path d="M50 50 L0 20 L0 10 Z" />
              </svg>
            </div>

            <div className="flex flex-col items-center justify-center max-w-[500px]">
              <span className="font-sports font-black text-sm text-amber-500 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                <Award className="h-5 w-5 text-amber-500 text-neon-gold animate-bounce" /> FIN DEL PARTIDO
              </span>

              {/* Winning Team Presentation */}
              <div className="relative w-full max-w-[800px] flex flex-col items-center animate-bounce-slow">
                <div className="text-6xl mb-4 p-8 bg-slate-900/80 rounded-full border-4 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.5)]">
                  {localScore >= visitorScore ? localTeam?.flag : visitorTeam?.flag}
                </div>

                <h2 className="font-sports font-black text-6xl text-white uppercase tracking-widest mb-2 drop-shadow-lg text-center">
                  {localScore >= visitorScore ? localTeam?.name : visitorTeam?.name}
                </h2>
                <h3 className="font-sports font-bold text-2xl text-amber-500 uppercase tracking-widest mb-8 text-neon-gold">
                  ¡Equipo Ganador!
                </h3>

                {/* Top 3 Donors of Winning Team */}
                <div className="w-full flex justify-center gap-6 mt-4">
                  {(localScore >= visitorScore ? topDonorsLocal : topDonorsVisitor).slice(0, 3).map((donor, idx) => (
                    <div key={donor.username} className={`flex flex-col items-center bg-gradient-to-b from-slate-800 to-slate-950 p-6 rounded-2xl border border-white/10 shadow-2xl ${idx === 0 ? 'scale-110 -translate-y-4 border-yellow-500/50' : 'scale-95'}`}>
                      <div className="relative mb-4">
                        {idx === 0 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-4xl">👑</div>}
                        <img
                          src={donor.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${donor.username}`}
                          alt="avatar"
                          className={`rounded-full border-4 ${idx === 0 ? 'border-yellow-500' : 'border-slate-400'}`}
                          style={{ width: `${Math.max(donorsIconSize * scale * (idx === 0 ? 3 : 2.5), 48)}px`, height: `${Math.max(donorsIconSize * scale * (idx === 0 ? 3 : 2.5), 48)}px` }}
                        />
                      </div>
                      <span className="font-sports font-bold text-xl text-white truncate max-w-[150px]">{donor.username}</span>
                      <span className="text-amber-400 font-extrabold flex items-center gap-1 mt-1 text-lg">
                        {donor.diamonds} 💎
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 text-xs text-slate-500 italic bg-slate-900/50 px-6 py-2 rounded-full border border-white/5">
                Reiniciar desde la consola administrativa en /admin
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default OverlayView;
