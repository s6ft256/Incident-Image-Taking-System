
import React, { useState } from 'react';

interface InspectionViewerProps {
  url: string;
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

export const InspectionViewer: React.FC<InspectionViewerProps> = ({ url, appTheme, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const isLight = appTheme === 'light';

  return (
    <div className="flex flex-col h-screen w-full bg-[#020617] animate-in slide-in-from-bottom-5 duration-500 overflow-hidden">
      {/* Viewer Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 z-50 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-white/5 shadow-xl'
      }`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className={`p-2.5 rounded-xl border transition-all ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h3 className={`text-sm font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Secure Asset Inspection</h3>
            <div className="flex items-center gap-1.5 mt-1">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">{url.replace('https://', '')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className={`hidden sm:flex items-center px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
             isLight ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
           }`}>
             Live Inspection Mode
           </div>
           <button 
            onClick={() => window.open(url, '_blank')}
            className={`p-2.5 rounded-xl border transition-all ${
              isLight ? 'bg-white border-slate-200 text-slate-400 hover:text-blue-600' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'
            }`}
            title="Open in New Window"
           >
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
               <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
             </svg>
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow relative bg-white">
        {isLoading && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center z-40 ${
            isLight ? 'bg-white' : 'bg-[#020617]'
          }`}>
             <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Establishing Secure Tunnel...</p>
          </div>
        )}
        
        <iframe 
          src={url}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          title="Inspection Framework"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
          allow="camera; geolocation; microphone"
        />
      </div>

      {/* Viewer Footer */}
      <div className={`px-4 py-2 border-t shrink-0 flex items-center justify-center gap-8 ${
        isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#020617] border-white/5'
      }`}>
        <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em]">HSE Guardian Bridge Protocol • Encrypted Session</p>
      </div>
    </div>
  );
};
