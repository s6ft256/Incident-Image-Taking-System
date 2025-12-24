
import React, { useEffect, useState, useMemo } from 'react';
import { getAllReports } from '../services/airtableService';
import { FetchedObservation, UserProfile } from '../types';
import { WeatherWidget } from './WeatherWidget';
import { LocationPrompt } from './LocationPrompt';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';

interface DashboardProps {
  baseId: string;
  onNavigate: (view: 'create' | 'recent' | 'my-tasks' | 'personnel') => void;
  appTheme?: 'dark' | 'light';
}

const PROFILE_KEY = 'hse_guardian_profile';

const SEVERITY_MAP: Record<string, number> = {
  'Fire Risk': 10,
  'Chemical Spill': 9,
  'Respiratory Hazard': 8,
  'Equipment Failure': 7,
  'Environmental': 6,
  'Unsafe Condition': 4,
  'Unsafe Act': 2,
  'Near Miss': 1,
  'Other': 1
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const countData = payload.find((p: any) => p.dataKey === 'count');
    const riskData = payload.find((p: any) => p.dataKey === 'criticality');
    
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl text-[10px] z-50 ring-1 ring-white/20">
        <p className="text-white font-black mb-3 uppercase tracking-[0.2em] border-b border-white/10 pb-2">{label}</p>
        <div className="space-y-2">
          {countData && (
            <div className="flex justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-slate-400 font-bold uppercase">Volume:</span>
              </div>
              <span className="text-blue-400 font-black font-mono text-xs">{countData.value} Obs.</span>
            </div>
          )}
          {riskData && (
            <div className="flex justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <span className="text-slate-400 font-bold uppercase">Criticality:</span>
              </div>
              <span className="text-rose-400 font-black font-mono text-xs">{riskData.value} Pts</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ baseId, onNavigate, appTheme = 'dark' }) => {
  const [reports, setReports] = useState<FetchedObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [locationRefreshKey, setLocationRefreshKey] = useState(0);

  const isLight = appTheme === 'light';

  useEffect(() => {
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) {
        try {
            const profile: UserProfile = JSON.parse(savedProfile);
            setUserName(profile.name);
        } catch(e) {}
    }

    const loadData = async () => {
      try {
        const data = await getAllReports({ baseId });
        setReports(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [baseId]);

  const weeklyReports = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return reports.filter(r => new Date(r.createdTime) >= startOfWeek);
  }, [reports]);

  const total = weeklyReports.length;
  const closedCount = weeklyReports.filter(r => r.fields["Action taken"] && r.fields["Action taken"].trim().length > 0).length;
  const openCount = total - closedCount;

  const myTaskCount = useMemo(() => {
    return reports.filter(r => 
        r.fields["Assigned To"] === userName && 
        (!r.fields["Action taken"] || r.fields["Action taken"].trim().length === 0)
    ).length;
  }, [reports, userName]);
  
  const siteStats = useMemo(() => {
    return weeklyReports.reduce((acc, curr) => {
      const site = curr.fields["Site / Location"] || 'Other';
      const type = curr.fields["Observation Type"] || 'Other';
      const severity = SEVERITY_MAP[type] || 1;
      
      if (!acc[site]) {
        acc[site] = { count: 0, severityScore: 0 };
      }
      acc[site].count += 1;
      acc[site].severityScore += severity;
      return acc;
    }, {} as Record<string, { count: number, severityScore: number }>);
  }, [weeklyReports]);

  const siteChartData = useMemo(() => {
    return (Object.entries(siteStats) as [string, { count: number, severityScore: number }][])
      .map(([name, stats]) => ({ 
        name, 
        count: stats.count, 
        criticality: stats.severityScore 
      }))
      .sort((a, b) => b.criticality - a.criticality)
      .slice(0, 10);
  }, [siteStats]);

  const renderSafetyStatusMap = () => {
    const r = 42;
    const strokeWidth = 12;
    const c = 2 * Math.PI * r;
    const openPercent = total > 0 ? openCount / total : 0;
    const openOffset = c * (1 - openPercent);
    
    return (
      <div className="relative h-48 w-48 sm:h-64 sm:w-64 mx-auto flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <circle cx="50" cy="50" r={r} fill="transparent" stroke={isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} strokeWidth={strokeWidth} />
          <circle 
            cx="50" cy="50" r={r} 
            fill="transparent" 
            stroke="#10b981" 
            strokeWidth={strokeWidth} 
            strokeDasharray={c} 
            strokeDashoffset={0} 
            strokeLinecap="round"
          />
          <circle 
            cx="50" cy="50" r={r} 
            fill="transparent" 
            stroke="#f59e0b" 
            strokeWidth={strokeWidth} 
            strokeDasharray={c} 
            strokeDashoffset={openOffset} 
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center text-center">
            <span className={`text-4xl sm:text-6xl font-black leading-none tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>{total}</span>
            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>TOTAL OBVS</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className={`px-6 sm:px-12 py-10 rounded-[2.5rem] text-center shadow-2xl border-2 border-blue-500/30 relative overflow-hidden bg-[#020617]`}>
        <div className="absolute inset-0 bg-blue-600/5 pointer-events-none"></div>
        <p className="text-sm sm:text-lg font-black leading-relaxed max-w-4xl mx-auto uppercase tracking-wider text-white">
          HSE Guardian isn't just software. It's your proactive safety nerve center. A unified system capturing and managing all safety observations and data in real-time.
        </p>
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-center gap-6 text-[11px] font-black uppercase tracking-[0.3em] text-red-500">
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> PERFORMANCE MONITOR</span>
          <span className="opacity-30 text-white">•</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div> ANALYTICS LIVE</span>
        </div>
      </div>

      <LocationPrompt 
        appTheme={appTheme} 
        onPermissionGranted={() => setLocationRefreshKey(prev => prev + 1)} 
      />

      <WeatherWidget key={locationRefreshKey} appTheme={appTheme} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Acquiring Data...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <div className={`lg:col-span-4 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border shadow-xl flex flex-col items-center relative overflow-hidden min-h-[320px] sm:min-h-[400px] justify-center ${isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
                <h3 className={`text-[9px] font-black uppercase tracking-[0.3em] mb-4 absolute top-6 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>CUMULATIVE SAFETY MAP</h3>
                <div className="flex-grow flex items-center justify-center">
                  {renderSafetyStatusMap()}
                </div>
                <div className="flex justify-center gap-6 mt-4 absolute bottom-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Open</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#10b981] rounded-full"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Closed</span>
                  </div>
                </div>
            </div>

            <div className={`lg:col-span-8 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border shadow-xl flex flex-col relative overflow-hidden min-h-[400px] ${isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
                <div className="flex items-center justify-between mb-8 px-4">
                   <div>
                     <h3 className={`text-lg font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>Site Criticality Analysis</h3>
                     <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Current Period Trend</p>
                   </div>
                   <div className="flex gap-4">
                     <div className="flex flex-col items-end">
                       <span className="text-blue-500 text-[9px] font-black uppercase tracking-tighter">VOL.</span>
                       <span className={`text-xs font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{weeklyReports.length}</span>
                     </div>
                     <div className="w-[1px] h-8 bg-white/10"></div>
                     <div className="flex flex-col items-end">
                       <span className="text-rose-500 text-[9px] font-black uppercase tracking-tighter">AGG. SEV.</span>
                       <span className={`text-xs font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {Object.values(siteStats).reduce((a: number, b: { severityScore: number }) => a + b.severityScore, 0)}
                       </span>
                     </div>
                   </div>
                </div>

                <div className="flex-1 w-full flex items-center justify-center overflow-visible px-2">
                  {siteChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={siteChartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorCrit" x1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          vertical={false} 
                          stroke={isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)"} 
                        />
                        <XAxis 
                          dataKey="name" 
                          stroke={isLight ? "#94a3b8" : "#475569"} 
                          fontSize={9} 
                          tick={{fill: isLight ? '#64748b' : '#94a3b8', fontWeight: '800'}}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          yAxisId="left"
                          orientation="left"
                          stroke={isLight ? "#94a3b8" : "#475569"}
                          fontSize={9}
                          tick={{fill: '#3b82f6', fontWeight: '800'}}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke={isLight ? "#94a3b8" : "#475569"}
                          fontSize={9}
                          tick={{fill: '#f43f5e', fontWeight: '800'}}
                          axisLine={false}
                          tickLine={false}
                          width={30}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          verticalAlign="top" 
                          align="center" 
                          iconType="circle" 
                          wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em', paddingBottom: '30px' }}
                        />
                        <Area
                          yAxisId="left"
                          name="Observations"
                          type="monotone"
                          dataKey="count"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorCount)"
                          activeDot={{ r: 6, strokeWidth: 2, stroke: isLight ? '#fff' : '#020617' }}
                        />
                        <Area
                          yAxisId="right"
                          name="Severity Score"
                          type="monotone"
                          dataKey="criticality"
                          stroke="#f43f5e"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorCrit)"
                          activeDot={{ r: 6, strokeWidth: 2, stroke: isLight ? '#fff' : '#020617' }}
                        />
                        <ReferenceLine yAxisId="left" y={0} stroke={isLight ? "#cbd5e1" : "#1e293b"} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-700 text-[9px] font-black uppercase tracking-widest animate-pulse">
                      No Activity Detected...
                    </div>
                  )}
                </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
          <button
            onClick={() => onNavigate('create')}
            className={`group relative h-24 sm:h-28 flex items-center backdrop-blur-xl border rounded-2xl sm:rounded-[2rem] overflow-hidden transition-all active:scale-[0.98] duration-300 px-6 sm:px-8 ${
              isLight ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-300' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-blue-500/30'
            }`}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform shrink-0 border border-blue-400/30">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 4v16m8-8H4" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <div className="flex-1 text-left ml-4 sm:ml-6">
               <h3 className={`text-lg sm:text-xl font-black tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Log Observation</h3>
               <p className="text-[8px] sm:text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mt-1 opacity-80">Capture New Event</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('my-tasks')}
            className={`group relative h-24 sm:h-28 flex items-center backdrop-blur-xl border rounded-2xl sm:rounded-[2rem] overflow-hidden transition-all active:scale-[0.98] duration-300 px-6 sm:px-8 ${
              isLight ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-emerald-300' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-emerald-500/30'
            }`}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform shrink-0 border border-emerald-400/30 relative">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
               {myTaskCount > 0 && (
                 <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
                    {myTaskCount}
                 </span>
               )}
            </div>
            <div className="flex-1 text-left ml-4 sm:ml-6">
               <h3 className={`text-lg sm:text-xl font-black tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>My Tasks</h3>
               <p className="text-[8px] sm:text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-1 opacity-80">Personal Queue</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('personnel')}
            className={`group relative h-24 sm:h-28 flex items-center backdrop-blur-xl border rounded-2xl sm:rounded-[2rem] overflow-hidden transition-all active:scale-[0.98] duration-300 px-6 sm:px-8 ${
              isLight ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-300' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-indigo-500/30'
            }`}
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform shrink-0 border border-indigo-400/30">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <div className="flex-1 text-left ml-4 sm:ml-6">
               <h3 className={`text-lg sm:text-xl font-black tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Personnel</h3>
               <p className="text-[8px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1 opacity-80">Identity Grid</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('recent')}
            className={`group relative h-24 sm:h-28 flex items-center backdrop-blur-xl border rounded-2xl sm:rounded-[2rem] overflow-hidden transition-all active:scale-[0.98] duration-300 px-6 sm:px-8 ${
              isLight ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
            }`}
          >
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform shrink-0 border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-white/10'
            }`}>
               <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 sm:h-8 sm:w-8 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <div className="flex-1 text-left ml-4 sm:ml-6">
               <h3 className={`text-lg sm:text-xl font-black tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Observation Log</h3>
               <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-80 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Review Evidence</p>
            </div>
          </button>
      </div>
    </div>
  );
};
