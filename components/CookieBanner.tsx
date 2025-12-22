
import React, { useState, useEffect } from 'react';

interface CookieBannerProps {
  appTheme?: 'dark' | 'light';
  onViewDetails: () => void;
}

const COOKIE_CONSENT_KEY = 'hse_guardian_cookies_accepted';

export const CookieBanner: React.FC<CookieBannerProps> = ({ appTheme = 'dark', onViewDetails }) => {
  const [isVisible, setIsVisible] = useState(false);
  const isLight = appTheme === 'light';

  useEffect(() => {
    const accepted = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!accepted) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-[100] sm:left-auto sm:right-6 sm:max-w-md animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className={`p-6 sm:p-8 rounded-[2.5rem] border shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all ${
        isLight ? 'bg-white/90 border-slate-200' : 'bg-[#020617]/90 border-white/10 ring-1 ring-white/5'
      }`}>
        <div className="flex items-start gap-5 mb-6">
           <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-blue-400/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                 <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
           </div>
           <div className="flex-1">
             <h4 className={`text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Cookie Security</h4>
             <p className={`text-[11px] font-black uppercase tracking-widest mt-1 ${isLight ? 'text-blue-600' : 'text-blue-500'}`}>Integrity Handshake</p>
           </div>
        </div>

        <p className={`text-xs leading-relaxed mb-6 font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          HSE Guardian uses <span className="text-blue-500 font-bold">Essential</span> cookies for secure login sessions and <span className="text-blue-500 font-bold">Preference</span> cookies to remember your visual theme. By using this terminal, you acknowledge these operational requirements.
        </p>

        <div className="flex gap-3">
          <button 
            onClick={onViewDetails}
            className={`flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
              isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            Review Details
          </button>
          <button 
            onClick={handleAccept}
            className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/20"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
