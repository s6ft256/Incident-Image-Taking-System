
import React, { useEffect, useState } from 'react';
import { getLocalWeather, WeatherData, getWeatherSafetyTip } from '../services/weatherService';

interface WeatherWidgetProps {
  appTheme?: 'dark' | 'light';
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ appTheme = 'dark' }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isLight = appTheme === 'light';

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const data = await getLocalWeather();
        setWeather(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className={`h-24 sm:h-28 flex items-center justify-center rounded-[2rem] border animate-pulse ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.04] border-white/10'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Syncing Environment...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`h-24 sm:h-28 flex items-center justify-between px-8 rounded-[2rem] border ${
        isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/20 border-rose-500/20'
      }`}>
        <div className="flex items-center gap-4">
          <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Weather Unavailable</h4>
            <p className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter mt-0.5">{error || "GPS Sync Required"}</p>
          </div>
        </div>
      </div>
    );
  }

  const safetyTip = getWeatherSafetyTip(weather);

  return (
    <div className={`group relative h-24 sm:h-28 flex items-center backdrop-blur-xl border rounded-[2rem] overflow-hidden transition-all duration-300 px-6 sm:px-8 ${
      isLight ? 'bg-white border-slate-200' : 'bg-white/[0.04] border-white/10'
    }`}>
      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0 border transition-transform group-hover:scale-105 ${
        weather.isDay 
          ? 'bg-amber-500 border-amber-400 text-white' 
          : 'bg-slate-800 border-slate-700 text-blue-400'
      }`}>
        {weather.isDay ? (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </div>

      <div className="flex-1 ml-5 sm:ml-6 flex items-center justify-between">
        <div className="text-left">
          <div className="flex items-baseline gap-2">
            <h3 className={`text-2xl sm:text-3xl font-black tracking-tighter leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {weather.temp}°C
            </h3>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{weather.condition}</span>
          </div>
          <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {weather.city}
          </p>
        </div>

        <div className={`hidden sm:flex flex-col items-end border-l pl-6 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
          <div className="flex gap-4">
            <div className="text-right">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-tighter">Humidity</span>
              <span className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{weather.humidity}%</span>
            </div>
            <div className="text-right">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-tighter">Wind</span>
              <span className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{weather.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center px-4 ${
        safetyTip.includes("CRITICAL") || safetyTip.includes("ALERT") || safetyTip.includes("HAZARD")
          ? 'bg-rose-600/90 text-white'
          : 'bg-blue-600/20 text-blue-500'
      }`}>
        <span className="text-[7px] font-black uppercase tracking-[0.3em] truncate">
          {safetyTip}
        </span>
      </div>
    </div>
  );
};
