
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
    <div className={`flex flex-col min-h-screen w-full bg-[#020617] animate-in slide-in-from-bottom-5 duration-500`}>
      {/* Viewer Header Area - Non-sticky so it scrolls away */}
      <div className={`p-4 ${isLight ? 'bg-slate-50' : 'bg-[#020617]'}`}>
        <div className={`flex items-center justify-between px-6 py-4 rounded-[2rem] border shadow-2xl transition-all ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-white/10'
        }`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className={`p-3 rounded-2xl border transition-all ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="flex flex-col">
              <h3 className={`text-lg font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Active Inspection Terminal</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Secure Handshake Established</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest ${
              isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              Live Sync
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Fully expanded and scrollable */}
      <div className="flex-grow relative bg-white mx-4 mb-4 rounded-[2rem] overflow-hidden shadow-2xl">
        {isLoading && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center z-40 min-h-[600px] ${
            isLight ? 'bg-white' : 'bg-[#020617]'
          }`}>
             <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Establishing Secure Tunnel...</p>
          </div>
        )}
        
        <iframe 
          src={url}
          className="w-full border-0 min-h-[1000px] sm:min-h-[1400px]"
          onLoad={() => setIsLoading(false)}
          title="Inspection Framework"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
          allow="camera; geolocation; microphone"
        />
      </div>

      {/* Viewer Footer */}
      <div className={`px-4 py-8 border-t shrink-0 flex items-center justify-center gap-8 ${
        isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#020617] border-white/5'
      }`}>
        <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em]">HSE Guardian Bridge Protocol • Encrypted Session</p>
      </div>
    </div>
  );
};
