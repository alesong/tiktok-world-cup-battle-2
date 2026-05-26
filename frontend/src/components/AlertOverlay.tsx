import React, { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore.js';
import { Heart, Share2 } from 'lucide-react';

export const AlertOverlay: React.FC = () => {
  const { initSocket, activeAlert } = useGameStore();

  useEffect(() => {
    initSocket();
  }, []);

  return (
    <div className="antialiased font-sans w-full h-full p-4 flex flex-col justify-end items-end bg-transparent overflow-hidden">
      {/* Sliding Social Welcome Alert Toast */}
      {activeAlert && (
        <div className="glass-card-glow rounded-2xl border border-amber-500/20 px-6 py-4 flex items-center gap-4 min-w-[340px] max-w-[420px] shadow-[0_15px_40px_rgba(0,0,0,0.6)] animate-bounce-slow">
          <div className="relative">
            <img
              src={activeAlert.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${activeAlert.username}`}
              alt="alert avatar"
              className="h-12 w-12 rounded-full border border-amber-500/30"
            />
            <div className="absolute -bottom-1 -right-1 h-5.5 w-5.5 bg-amber-500 rounded-full flex items-center justify-center p-1 border border-slate-950 shadow">
              {activeAlert.type === 'follow' ? (
                <Heart className="h-3 w-3 text-slate-950 fill-slate-950" />
              ) : (
                <Share2 className="h-3 w-3 text-slate-950 fill-slate-950" />
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <span className="font-sports font-black text-sm text-slate-100 truncate max-w-[200px]">
              {activeAlert.username}
            </span>
            <span className="text-xs text-amber-400 font-bold uppercase tracking-wider mt-0.5">
              {activeAlert.details}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
export default AlertOverlay;
