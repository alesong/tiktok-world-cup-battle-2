import React from 'react';
import { Trophy, Shield, Tv, AlertTriangle, ArrowRight } from 'lucide-react';

export const Home: React.FC = () => {
  const getAbsoluteUrl = (path: string) => {
    return `${window.location.protocol}//${window.location.host}${path}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-4xl glass-card rounded-3xl p-8 md:p-10 border border-white/5 shadow-2xl relative overflow-hidden my-8">
        
        {/* Glow backdrop decorative spots */}
        <div className="absolute top-0 right-0 h-[250px] w-[250px] bg-amber-500/10 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 left-0 h-[200px] w-[200px] bg-green-500/10 rounded-full blur-[100px] -z-10"></div>

        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-500 via-amber-500 to-green-500"></div>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="h-16 w-16 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Trophy className="h-9 w-9 text-slate-950" />
          </div>
          <h1 className="font-sports font-black text-3xl md:text-4xl uppercase tracking-wider text-slate-100">
            TikTok World Cup <span className="text-amber-500 text-neon-gold">Battle</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            La plataforma interactiva de fútbol en tiempo real definitiva para transmisiones de TikTok Live utilizando OBS Studio.
          </p>
        </div>

        {/* Grid with links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Card: OBS Studio Overlay */}
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-green-500/30 transition-all duration-300">
            <div>
              <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20 mb-4">
                <Tv className="h-5 w-5 text-green-400" />
              </div>
              <h2 className="font-sports text-lg uppercase tracking-wider text-slate-200 mb-2">Overlay para OBS Studio</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Agrega esta URL como fuente de navegador en OBS Studio. Resolucion óptima: 1920x1080 (60 FPS). Activa "Controlar audio por OBS" si lo deseas.
              </p>
            </div>
            
            <div className="space-y-3 mt-4">
              <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-[11px] font-mono select-all text-green-400 truncate">
                {getAbsoluteUrl('/overlay')}
              </div>
              <a
                href="/overlay"
                className="w-full bg-green-700/20 text-green-400 hover:bg-green-700/35 border border-green-600/30 font-bold uppercase text-[10px] tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                Abrir Overlay <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Card: Administration Dashboard */}
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300">
            <div>
              <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 mb-4">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="font-sports text-lg uppercase tracking-wider text-slate-200 mb-2">Consola de Control (Admin)</h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Administra los partidos, cambia las alineaciones de las selecciones del mundial, edita el valor de los regalos y simula donaciones de TikTok.
              </p>
            </div>
            
            <div className="space-y-3 mt-4">
              <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-[11px] font-mono select-all text-amber-400 truncate">
                {getAbsoluteUrl('/admin')}
              </div>
              <a
                href="/admin"
                className="w-full bg-amber-600/20 text-amber-400 hover:bg-amber-600/35 border border-amber-500/30 font-bold uppercase text-[10px] tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all"
              >
                Abrir Consola <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>

        </div>

        {/* OBS Configuration Notice */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-amber-500 font-extrabold uppercase tracking-wide">
            <AlertTriangle className="h-4 w-4" /> Configuración Clave para OBS Studio
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Agrega una nueva **Fuente de Navegador** (Browser Source) en tu escena de OBS.</li>
            <li>Configura la resolución a **Ancho: 1920** y **Alto: 1080**.</li>
            <li>Establece los FPS a **60** para garantizar un movimiento de balón ultra-suave.</li>
            <li>En OBS, inicia el partido en la **Consola de Control** en tu navegador normal para comenzar.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};
export default Home;
