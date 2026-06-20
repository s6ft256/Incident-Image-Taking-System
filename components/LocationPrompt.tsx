
import React, { useState, useEffect } from 'react';
import { getPositionWithRefinement } from '../utils/geolocation';

interface LocationPromptProps {
  appTheme?: 'dark' | 'light';
  onPermissionGranted: () => void;
}

export const LocationPrompt: React.FC<LocationPromptProps> = ({ appTheme = 'dark', onPermissionGranted }) => {
  const [status, setStatus] = useState<PermissionState | 'loading'>('loading');
  const [isSyncing, setIsSyncing] = useState(false);
  const isLight = appTheme === 'light';

  useEffect(() => {
    if (!navigator.permissions || !navigator.permissions.query) {
      setStatus('granted'); // Fallback if API not supported
      return;
    }

    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setStatus(result.state);
        result.onchange = () => setStatus(result.state);
      } catch (e) {
        setStatus('granted');
      }
    };

    checkPermission();
  }, []);

  const requestGPS = () => {
    setIsSyncing(true);
    void (async () => {
      try {
        await getPositionWithRefinement();
        setStatus('granted');
        onPermissionGranted();
      } catch {
        // If denied/unavailable, we keep the prompt but maybe show extra help
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  if (status === 'granted' || status === 'loading') return null;

  return (
    <div className="animate-in slide-in-from-top-4 duration-500 mb-6">
      <div className={`p-5 rounded-[2rem] border-2 flex flex-col sm:flex-row items-center gap-5 transition-all shadow-2xl relative overflow-hidden ${
        isLight 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-blue-600/10 border-blue-500/30'
      }`}>
        {/* Radar Effect */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <div className="w-24 h-24 border-4 border-blue-500 rounded-full animate-ping"></div>
        </div>

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border-2 ${
          isLight ? 'bg-white border-blue-100 text-blue-600' : 'bg-slate-900 border-blue-500/30 text-blue-400'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2c3.31 0 6 2.69 6 6 0 5.25-6 13-6 13S6 13.25 6 8c0-3.31 2.69-6 6-6z"/>
            <circle cx="12" cy="8" r="2"/>
          </svg>
        </div>

        <div className="flex-1 text-center sm:text-left z-10">
          <h4 className={`text-sm font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {status === 'denied' ? 'GPS Protocol Restricted' : 'Precision Optimization Required'}
          </h4>
          <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {status === 'denied' 
              ? 'Location services are disabled. Access to the safety grid requires manual browser permission override.' 
              : 'Enable high-accuracy GPS to automatically map hazard coordinates and verify evidence integrity.'}
          </p>
        </div>

        <button 
          onClick={requestGPS}
          disabled={isSyncing}
          className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 shadow-xl border border-blue-400/20 flex items-center justify-center gap-3"
        >
          {isSyncing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Synchronizing...</span>
            </>
          ) : (
            status === 'denied' ? 'Re-Establish Link' : 'Optimize Signal'
          )}
        </button>
      </div>
    </div>
  );
};
