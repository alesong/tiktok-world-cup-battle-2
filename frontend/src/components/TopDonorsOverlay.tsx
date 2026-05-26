import React, { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { Trophy, Star } from 'lucide-react';

export const TopDonorsOverlay: React.FC = () => {
  const { initSocket, donors, settings } = useGameStore();

  const count = parseInt(settings.top_donors_count || '3', 10);
  const gap = parseInt(settings.top_donors_gap || '8', 10);
  const iconSize = parseInt(settings.top_donors_icon_size || '32', 10);
  const fontSize = parseInt(settings.top_donors_font_size || '16', 10);
  const fontFamily = settings.top_donors_font_family || 'Arial';
  const bgOpacity = parseInt(settings.top_donors_bg_opacity || '60', 10) / 100;
  const showName = settings.top_donors_show_name !== 'false';

  useEffect(() => {
    initSocket();
  }, []);

  return (
    <div className="antialiased font-sans w-full h-full p-4 flex flex-col justify-end bg-transparent overflow-hidden">
      <div className={`w-full h-full glass-card rounded-2xl border border-white/5 shadow-2xl p-4 flex flex-col gap-3 relative pointer-events-auto`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"></div>
        
        <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
          <Trophy className="h-5 w-5 text-amber-500 text-neon-gold" />
          <h3 className="font-sports text-xs uppercase tracking-widest font-extrabold text-slate-300">
            TOP DONADORES
          </h3>
        </div>

        {/* Donors List */}
        <div className="flex-1 overflow-hidden flex flex-col" style={{ gap: `${gap}px` }}>
          {donors.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-xs text-slate-500 italic">
              ¡Regala para liderar la tabla!
            </div>
          ) : (
            donors.slice(0, count).map((d, index) => (
              <div
                key={d.username}
                className={`flex items-center border border-white/5 rounded-xl px-3 py-2 animate-pulse-slow ${showName ? 'justify-between w-full' : 'w-fit gap-4'}`}
                style={{ backgroundColor: `rgba(2, 6, 23, ${bgOpacity})` }}
              >
                <div className="flex items-center" style={{ gap: `${gap}px` }}>
                  <span className={`text-[10px] font-bold font-sports h-5 w-5 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-yellow-500 text-slate-950' :
                    index === 1 ? 'bg-slate-300 text-slate-950' :
                    index === 2 ? 'bg-amber-600 text-slate-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {index + 1}
                  </span>
                  <img
                    src={d.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${d.username}`}
                    alt="avatar"
                    className="rounded-full border border-white/10"
                    style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
                  />
                  {showName && (
                    <span className="font-bold text-slate-300 max-w-[120px] truncate" style={{ fontSize: `${fontSize}px`, fontFamily }}>
                      {d.username}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-black text-amber-400" style={{ fontSize: `${fontSize}px`, fontFamily }}>{d.diamonds}</span>
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 animate-spin-slow" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default TopDonorsOverlay;
