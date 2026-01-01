
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
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface DashboardProps {
  baseId: string;
  onNavigate: (view: 'create' | 'recent' | 'my-tasks' | 'personnel' | 'checklists' | 'risk-assessment' | 'training-management' | 'compliance-tracker' | 'audit-trail' | 'incident-report') => void;
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
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 p-4 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.2)] text-[10px] z-50">
        <p className="text-blue-400 font-black mb-3 uppercase tracking-[0.2em] border-b border-white/10 pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-slate-400 font-bold uppercase">{entry.name}:</span>
              </div>
              <span className="text-white font-black font-mono text-xs">{entry.value}</span>
            </div>
          ))}
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
  const [activeCategory, setActiveCategory] = useState<'operations' | 'management'>('operations');
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());

  const isLight = appTheme === 'light';

  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return reports.filter(r => new Date(r.createdTime) >= last7Days);
  }, [reports]);

  const stats = useMemo(() => {
    const total = reports.length;
    const closed = reports.filter(r => r.fields["Action taken"]?.trim()).length;
    const open = total - closed;
    const critical = reports.filter(r => SEVERITY_MAP[r.fields["Observation Type"] || ''] > 7).length;
    return { total, open, closed, critical };
  }, [reports]);

  const siteStats = useMemo(() => {
    const data = weeklyReports.reduce((acc, curr) => {
      const site = curr.fields["Site / Location"] || 'Other';
      const type = curr.fields["Observation Type"] || 'Other';
      const severity = SEVERITY_MAP[type] || 1;
      
      if (!acc[site]) acc[site] = { count: 0, severityScore: 0 };
      acc[site].count += 1;
      acc[site].severityScore += severity;
      return acc;
    }, {} as Record<string, { count: number, severityScore: number }>);

    return Object.entries(data)
      .map(([name, s]) => ({ name, count: s.count, criticality: s.severityScore }))
      .sort((a, b) => b.criticality - a.criticality)
      .slice(0, 5);
  }, [weeklyReports]);

  const myTaskCount = useMemo(() => {
    return reports.filter(r => 
        r.fields["Assigned To"] === userName && 
        (!r.fields["Action taken"] || r.fields["Action taken"].trim().length === 0)
    ).length;
  }, [reports, userName]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      
      {/* 1. FUTURISTIC HEADER TICKER */}
      <div className={`flex items-center justify-between px-6 py-3 rounded-2xl border backdrop-blur-md overflow-hidden ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-blue-950/20 border-blue-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)]'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-blue-400'}`}>System Nominal</span>
          </div>
          <div className={`h-4 w-[1px] ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}></div>
          <div className="flex items-center gap-2">
             <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>UTC Sync:</span>
             <span className={`text-[10px] font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{systemTime}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6">
           <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Grid ID:</span>
              <span className="text-[10px] font-mono text-blue-500 font-black">HSE-G-2.5</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-emerald-500 uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">Authorized</span>
           </div>
        </div>
      </div>

      {/* 2. HERO / SAFETY PULSE */}
      <div className={`group relative px-6 sm:px-12 py-12 rounded-[2.5rem] border-2 overflow-hidden transition-all duration-500 form-container-glow ${
        isLight ? 'bg-white border-blue-500/10' : 'bg-[#020617] border-blue-500/30'
      }`}>
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
           <div className="flex items-center gap-3 mb-6">
              <div className="h-[2px] w-8 bg-blue-600"></div>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">HSEGUARDIAN CORE</span>
              <div className="h-[2px] w-8 bg-blue-600"></div>
           </div>
           <h2 className={`text-xl sm:text-2xl font-black tracking-tight max-w-4xl leading-tight mb-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>
             HSEGUARDIAN ISN'T JUST SOFTWARE. IT'S YOUR PROACTIVE SAFETY NERVE CENTER. A UNIFIED SYSTEM CAPTURING AND MANAGING ALL SAFETY OBSERVATIONS AND DATA IN REAL TIME.
           </h2>
           <p className={`text-sm sm:text-base font-medium max-w-2xl leading-relaxed opacity-60 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
             Consolidating real time telemetry from work sites into a unified command grid. Ensure zero harm through high integrity data acquisition and remediation.
           </p>
        </div>
      </div>

      <LocationPrompt appTheme={appTheme} onPermissionGranted={() => setLocationRefreshKey(prev => prev + 1)} />
      <WeatherWidget key={locationRefreshKey} appTheme={appTheme} />

      {/* 3. KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
         <KPICard label="Total Observations" value={stats.total} icon="eye" color="blue" isLight={isLight} />
         <KPICard label="Active Hazards" value={stats.open} icon="alert" color="rose" isLight={isLight} trend="High" />
         <KPICard label="Resolved Events" value={stats.closed} icon="check" color="emerald" isLight={isLight} />
         <KPICard label="Critical Threats" value={stats.critical} icon="shield" color="amber" isLight={isLight} />
      </div>

      {/* 4. ANALYTICS CENTER */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Scanning Grid...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Site Severity Bar Chart */}
          <div className={`lg:col-span-7 p-8 rounded-[2.5rem] border shadow-2xl flex flex-col relative overflow-hidden min-h-[400px] ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'
          }`}>
             <div className="flex items-center justify-between mb-10">
                <div>
                   <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Site Heat Map</h3>
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Weighted Severity Index</p>
                </div>
                <div className={`p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 font-black text-[9px] uppercase tracking-widest`}>7D Data</div>
             </div>

             <div className="flex-1 w-full flex items-center justify-center">
                {siteStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={siteStats} layout="vertical" margin={{ left: 40, right: 40 }}>
                       <XAxis type="number" hide />
                       <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke={isLight ? "#64748b" : "#94a3b8"} 
                        fontSize={10} 
                        fontWeight="bold"
                        width={100}
                        axisLine={false}
                        tickLine={false}
                       />
                       <Tooltip content={<CustomTooltip />} />
                       <Bar dataKey="criticality" radius={[0, 8, 8, 0]} barSize={20}>
                          {siteStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : index === 1 ? '#fbbf24' : '#3b82f6'} />
                          ))}
                       </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center opacity-20">
                     <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"/></svg>
                     <p className="text-[10px] font-black mt-4 uppercase">Null Activity Detected</p>
                  </div>
                )}
             </div>
          </div>

          {/* Engagement Overview */}
          <div className={`lg:col-span-5 p-8 rounded-[2.5rem] border shadow-2xl flex flex-col justify-between relative overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'
          }`}>
             <div>
                <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Compliance Pulse</h3>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Real time Resolution Ratio</p>
             </div>

             <div className="py-8 flex flex-col items-center">
                <div className="relative w-48 h-48 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="50%" cy="50%" r="42%" fill="none" stroke={isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)"} strokeWidth="12" />
                      <circle 
                        cx="50%" cy="50%" r="42%" 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="12" 
                        strokeDasharray="264" 
                        strokeDashoffset={264 - (264 * (stats.closed / (stats.total || 1)))} 
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                      <span className={`text-5xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {Math.round((stats.closed / (stats.total || 1)) * 100)}%
                      </span>
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Integrity</span>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                   <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Open Priority</span>
                   <span className="text-xl font-black text-rose-500">{stats.open}</span>
                </div>
                <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                   <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Archived Log</span>
                   <span className="text-xl font-black text-emerald-500">{stats.closed}</span>
                </div>
             </div>
          </div>

        </div>
      )}

      {/* 5. NAVIGATION TERMINAL */}
      <div className="pt-8">
          <div className="flex justify-between items-center mb-8 px-2">
             <div className="flex flex-col">
               <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Dispatch Terminal</h3>
               <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Access System Nodes</p>
             </div>
             <div className={`p-1 rounded-2xl border flex items-center shadow-lg ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <button 
                  onClick={() => setActiveCategory('operations')}
                  className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'operations' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  Ops
                </button>
                <button 
                  onClick={() => setActiveCategory('management')}
                  className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'management' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  Mgmt
                </button>
             </div>
          </div>

          <div className={`relative p-8 rounded-[3rem] border transition-all duration-500 overflow-hidden bg-transparent border-2 border-blue-400 shadow-[0_0_60px_rgba(59,130,246,0.5),0_20px_40px_rgba(0,0,0,0.6)]`}>
             <div className="absolute inset-0 z-0 pointer-events-none animate-in fade-in duration-1000">
                <img 
                  src={activeCategory === 'operations' 
                    ? "https://i.pinimg.com/1200x/d7/c6/a9/d7c6a95b5b86b28ecd15ff4bb2c1b8eb.jpg" 
                    : "https://i.pinimg.com/736x/30/62/41/306241b5dae6934889cc99ee5f2a67a9.jpg"
                  } 
                  className="w-full h-full object-cover" 
                  alt="Terminal Background" 
                />
             </div>
             
             <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {activeCategory === 'operations' ? (
                   <>
                     <TerminalButton onClick={() => onNavigate('incident-report')} icon="alert" label="Incident" color="rose" transparent />
                     <TerminalButton onClick={() => onNavigate('create')} icon="plus" label="Observation" color="blue" transparent />
                     <TerminalButton onClick={() => onNavigate('my-tasks')} icon="user" label="My Tasks" color="emerald" count={myTaskCount} transparent />
                     <TerminalButton onClick={() => onNavigate('recent')} icon="list" label="Evidence" color="slate" transparent />
                     <TerminalButton onClick={() => onNavigate('checklists')} icon="check" label="Checklists" color="amber" transparent />
                     <TerminalButton onClick={() => onNavigate('personnel')} icon="users" label="Personnel" color="indigo" transparent />
                   </>
                ) : (
                   <>
                     <TerminalButton onClick={() => onNavigate('risk-assessment')} icon="shield" label="Risk RA" color="rose" transparent />
                     <TerminalButton onClick={() => onNavigate('training-management')} icon="book" label="Training" color="violet" transparent />
                     <TerminalButton onClick={() => onNavigate('compliance-tracker')} icon="award" label="Compliance" color="cyan" transparent />
                     <TerminalButton onClick={() => onNavigate('audit-trail')} icon="history" label="Audit Trail" color="zinc" transparent />
                   </>
                )}
             </div>
          </div>
      </div>

    </div>
  );
};

const KPICard = ({ label, value, icon, color, isLight, trend }: any) => {
  const colorMap: any = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  };

  return (
    <div className={`p-6 rounded-[2.5rem] border shadow-xl relative overflow-hidden group transition-all hover:translate-y-[-4px] ${
      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'
    }`}>
       <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 border transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          {icon === 'eye' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          {icon === 'alert' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          {icon === 'check' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
          {icon === 'shield' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
       </div>
       <div className="space-y-1">
          <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
          <div className="flex items-baseline gap-2">
             <span className={`text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>{value}</span>
             {trend && <span className="text-[8px] font-black text-rose-500 uppercase bg-rose-500/10 px-1.5 rounded animate-pulse">{trend}</span>}
          </div>
       </div>
    </div>
  );
};

const TerminalButton = ({ onClick, icon, label, color, count, transparent }: any) => {
  const colors: any = {
    blue: 'bg-blue-600 shadow-blue-500/20',
    rose: 'bg-rose-600 shadow-rose-500/20',
    emerald: 'bg-emerald-600 shadow-emerald-500/20',
    slate: 'bg-slate-700 shadow-slate-500/20',
    amber: 'bg-amber-600 shadow-amber-500/20',
    indigo: 'bg-indigo-600 shadow-indigo-500/20',
    violet: 'bg-violet-600 shadow-violet-500/20',
    cyan: 'bg-cyan-600 shadow-cyan-500/20',
    zinc: 'bg-zinc-800 shadow-zinc-500/20'
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
      case 'plus': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
      case 'user': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
      case 'list': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
      case 'check': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
      case 'users': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
      case 'shield': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
      case 'book': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
      case 'award': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>;
      case 'history': return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
      default: return null;
    }
  };

  return (
    <button 
      onClick={onClick}
      className={`group relative h-32 flex flex-col items-center justify-center p-4 rounded-[2.5rem] border transition-all active:scale-95 shadow-xl backdrop-blur-sm ${
        transparent 
          ? 'bg-transparent border-2 border-blue-400/60 shadow-[0_0_20px_rgba(59,130,246,0.4),0_10px_20px_rgba(0,0,0,0.4)] hover:bg-blue-500/10 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.7),0_15px_30px_rgba(0,0,0,0.5)]' 
          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-blue-500/50'
      }`}
    >
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3 transition-transform group-hover:scale-110 shadow-2xl border border-white/10 ${colors[color]}`}>
          {getIcon(icon)}
          {count ? (
            <div className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
               {count}
            </div>
          ) : null}
       </div>
       <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${transparent ? 'text-white drop-shadow-md' : 'text-slate-400 group-hover:text-white'}`}>{label}</span>
       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity text-white">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
       </div>
    </button>
  );
};
