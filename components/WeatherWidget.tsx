
import React, { useEffect, useState, useCallback } from 'react';
import { getLocalWeather, WeatherData, getWeatherSafetyTip, getWeatherDescription } from '../services/weatherService';

interface WeatherWidgetProps {
  appTheme?: 'dark' | 'light';
}

type GPSProgress = 'idle' | 'syncing' | 'mapping' | 'finalizing' | 'success' | 'error';

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ appTheme = 'dark' }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<GPSProgress>('idle');
  const isLight = appTheme === 'light';

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setGpsStatus('syncing');
      
      const data = await getLocalWeather();
      
      setGpsStatus('mapping');
      await new Promise(r => setTimeout(r, 600));
      
      setGpsStatus('finalizing');
      await new Promise(r => setTimeout(r, 400));
      
      setWeather(data);
      setGpsStatus('success');
    } catch (err: any) {
      setError(err.message);
      setGpsStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (loading) {
    return (
      <div className={`h-40 flex items-center justify-center rounded-[2.5rem] border overflow-hidden relative ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.04] border-white/10'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
        <div className="flex flex-col items-center gap-3 relative z-10 px-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">
              {gpsStatus === 'syncing' ? 'ADVANCED SATELLITE HUNT...' : 
               gpsStatus === 'mapping' ? 'RESOLVING SECTOR...' : 
               'VERIFYING GRID...'}
            </span>
            <p className={`text-[8px] font-bold uppercase tracking-[0.1em] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              Establishing Sub-Meter Precision Lock
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`h-40 flex items-center justify-between px-10 rounded-[2.5rem] border transition-all ${
        isLight ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-rose-950/20 border-rose-500/20 shadow-lg'
      }`}>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-inner animate-pulse">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Precision Protocol Failed</h4>
            <p className="text-[8px] font-bold text-rose-400/70 uppercase tracking-tighter mt-1 leading-relaxed max-w-[200px]">
              {error || "Signal Interrupted. Protocol suspended."}
            </p>
          </div>
        </div>
        <button 
          onClick={fetchWeather}
          className="px-8 py-5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-xl border border-rose-400/30 whitespace-nowrap"
        >
          Force Re-Sync
        </button>
      </div>
    );
  }

  const safetyTip = getWeatherSafetyTip(weather);
  const isAlert = safetyTip.includes("CRITICAL") || safetyTip.includes("ALERT") || safetyTip.includes("HAZARD") || safetyTip.includes("WARNING");

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
    if (code <= 3) return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><path d="M15.3 12.2a4.9 4.9 0 0 1-5.1 5.1 4.9 4.9 0 0 1-5.1-5.1 4.9 4.9 0 0 1 5.1-5.1 4.9 4.9 0 0 1 5.1 5.1z"/></svg>;
    if (code >= 95) return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16l4 4 4-4m-4-12v16"/></svg>;
  };

  return (
    <div className={`group relative flex flex-col backdrop-blur-3xl border rounded-[2.5rem] overflow-hidden transition-all duration-500 ${
      isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-white/[0.04] border-white/10 shadow-2xl'
    }`}>
      {/* Top Section: Main Weather & Stats */}
      <div className="flex flex-col sm:flex-row items-center p-6 sm:p-8 gap-6 sm:gap-10">
        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] flex items-center justify-center shadow-2xl shrink-0 border transition-all duration-700 group-hover:rotate-12 ${
          weather.isDay 
            ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/40' 
            : 'bg-indigo-950 border-indigo-500/50 text-blue-400 shadow-indigo-500/20'
        }`}>
          {weather.isDay ? (
            <svg className="w-10 h-10 drop-shadow-xl" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 drop-shadow-xl" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </div>

        <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-4">
              <h3 className={`text-5xl sm:text-6xl font-black tracking-tighter leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {weather.temp}°
              </h3>
              <div className="flex flex-col items-start">
                <span className="text-xs font-black text-blue-500 uppercase tracking-widest leading-none">{weather.condition}</span>
                {weather.accuracy !== undefined && (
                  <div className="flex items-center gap-2 mt-2 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                     <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Tactical Lock ±{weather.accuracy}m</span>
                  </div>
                )}
              </div>
            </div>
            <p className={`text-[11px] font-black uppercase tracking-[0.1em] mt-3 flex items-center justify-center sm:justify-start gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>{weather.city || "Verified Site"}</span>
            </p>
          </div>

          {/* Forecasting Trend Row */}
          <div className="flex items-end gap-3 sm:gap-5 pb-1 h-14">
             {weather.forecast?.map((f, i) => (
               <div key={i} className="flex flex-col items-center gap-1 group/item">
                  <span className={`text-[7px] font-black uppercase transition-colors ${i === 0 ? 'text-blue-500' : 'text-slate-600 group-hover/item:text-slate-400'}`}>
                    {i === 0 ? 'NOW' : `+${i}H`}
                  </span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                    f.code >= 95 ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' :
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10 text-slate-500'
                  }`}>
                    {getWeatherIcon(f.code)}
                  </div>
                  <span className={`text-[8px] font-black ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{f.temp}°</span>
               </div>
             ))}
          </div>

          <div className={`hidden lg:flex flex-col items-end border-l pl-10 shrink-0 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-right">
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Humidity</span>
                <span className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{weather.humidity}%</span>
              </div>
              <div className="text-right">
                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Wind Flow</span>
                <span className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{weather.windSpeed} <span className="text-[10px] opacity-40">km/h</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Advisory Banner */}
      <div className={`h-10 flex items-center justify-between px-8 border-t transition-all duration-700 ${
        isAlert ? 'bg-rose-600 text-white border-rose-500' : 'bg-blue-600/10 text-blue-500 border-white/5'
      }`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`flex items-center gap-2 shrink-0 ${isAlert ? 'animate-pulse' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 2v10M12 18h.01"/></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">EHS Advisory:</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] truncate">
            {safetyTip}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 opacity-60">
           <span className="text-[7px] font-black uppercase tracking-widest">Site ID: {weather.city.slice(0, 3).toUpperCase()}-{Math.floor(Math.random()*900)}</span>
           <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-slate-300' : 'bg-white/20'}`}></div>
           <span className="text-[7px] font-black uppercase tracking-widest">Updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>
    </div>
  );
};
