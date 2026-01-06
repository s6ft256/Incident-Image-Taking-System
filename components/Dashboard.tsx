
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WeatherWidget } from './WeatherWidget';
import { LocationPrompt } from './LocationPrompt';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useAppContext } from '../context/AppContext';

interface DashboardProps {
  baseId: string;
  onNavigate: (view: 'create' | 'recent' | 'my-tasks' | 'personnel' | 'checklists' | 'risk-assessment' | 'training-management' | 'compliance-tracker' | 'audit-trail' | 'incident-report') => void;
  appTheme?: 'dark' | 'light';
}

type PythonAnalyticsSummary = {
  generatedAt?: string;
  sources?: { observations?: string; incidents?: string };
  observations?: { rows?: number; total?: number; open?: number; closed?: number; note?: string };
  incidents?: { rows?: number; note?: string };
  model?: { enabled?: boolean; accuracy?: number };
  assets?: {
    observationsByType?: string;
    observationsBySite?: string;
    incidentsOverTime?: string;
  };
};

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

export const Dashboard: React.FC<DashboardProps> = ({ baseId, onNavigate, appTheme = 'dark' }) => {
  const { state } = useAppContext();
  const { userProfile, allReports: reports } = state;

  const isMounted = useRef(true);
  const [locationRefreshKey, setLocationRefreshKey] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'operations' | 'management'>('operations');
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());
  const [pythonAnalytics, setPythonAnalytics] = useState<PythonAnalyticsSummary | null>(null);

  const isLight = appTheme === 'light';

  useEffect(() => {
    let cancelled = false;
    // Load optional, pre-generated assets produced by python/generate_dashboard_assets.py
    // If the file is missing, we silently skip rendering.
    void (async () => {
      try {
        const res = await fetch('/dashboard-assets/summary.json', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as PythonAnalyticsSummary;
        if (!cancelled) setPythonAnalytics(json);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    const timer = setInterval(() => {
      if (isMounted.current) setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    
    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const stats = useMemo(() => {
    if (!Array.isArray(reports)) return { total: 0, open: 0, closed: 0 };
    const total = reports.length;
    const closed = reports.filter(r => {
      const action = r.fields["Action taken"];
      return action && typeof action === 'string' && action.trim().length > 0;
    }).length;
    const open = total - closed;
    return { total, open, closed };
  }, [reports]);

  const siteStats = useMemo(() => {
    if (!Array.isArray(reports)) return [];
    const data = reports.reduce<Record<string, { count: number; severityScore: number }>>((acc, curr) => {
      const site = String(curr.fields["Site / Location"] || 'Other');
      const type = String(curr.fields["Observation Type"] || 'Other');
      const severity = SEVERITY_MAP[type] || 1;
      if (!acc[site]) acc[site] = { count: 0, severityScore: 0 };
      acc[site].count += 1;
      acc[site].severityScore += severity;
      return acc;
    }, {});
    return Object.keys(data)
      .map(name => ({ name, criticality: data[name].severityScore }))
      .sort((a, b) => b.criticality - a.criticality)
      .slice(0, 5);
  }, [reports]);

  const myTaskCount = useMemo(() => {
    if (!Array.isArray(reports)) return 0;
    return reports.filter(r => {
      const assignee = r.fields["Assigned To"];
      const action = r.fields["Action taken"];
      const isMyTask = assignee === userProfile?.name;
      const isOpen = !action || (typeof action === 'string' && action.trim().length === 0);
      return isMyTask && isOpen;
    }).length;
  }, [reports, userProfile?.name]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-700">
      <div className={`flex items-center justify-between px-6 py-3 rounded-2xl border backdrop-blur-md overflow-hidden ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-blue-950/20 border-blue-500/20 shadow-xl'}`}>
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>System Nominal</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>UTC Sync:</span>
          <span className={`text-[10px] font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{systemTime}</span>
        </div>

        <div className="flex items-center gap-3 min-w-[160px] justify-end">
          <div className="hidden sm:flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Grid ID:</span>
            <span className={`text-[10px] font-mono font-black ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>HSE-G-2.5</span>
          </div>
          <span className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
            Authorized
          </span>
        </div>
      </div>

      <div className={`relative px-6 sm:px-10 py-10 sm:py-14 rounded-[3rem] border shadow-2xl overflow-hidden ${isLight ? 'bg-white border-blue-200' : 'bg-slate-900/20 border-blue-500/20 backdrop-blur-md'}`}>
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className={`h-px w-10 sm:w-12 ${isLight ? 'bg-blue-600/30' : 'bg-blue-400/30'}`} />
          <span className={`text-[10px] font-black uppercase tracking-[0.35em] ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>HSEGUARDIAN CORE</span>
          <div className={`h-px w-10 sm:w-12 ${isLight ? 'bg-blue-600/30' : 'bg-blue-400/30'}`} />
        </div>

        <h1 className={`text-center text-2xl sm:text-4xl font-black tracking-tight leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>
          HSEGUARDIAN ISN'T JUST SOFTWARE. IT'S YOUR PROACTIVE SAFETY
          NERVE CENTER. A UNIFIED SYSTEM CAPTURING AND MANAGING ALL
          SAFETY OBSERVATIONS AND DATA IN REAL TIME.
        </h1>

        <p className={`text-center mt-6 text-sm sm:text-base font-semibold ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
          Consolidating real time telemetry from work sites into a unified command grid. Ensure
          zero harm through high integrity data acquisition and remediation.
        </p>
      </div>

      <LocationPrompt appTheme={appTheme} onPermissionGranted={() => setLocationRefreshKey(prev => prev + 1)} />
      <WeatherWidget key={locationRefreshKey} appTheme={appTheme} />

      {pythonAnalytics && (
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'}`}>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Analytics Snapshot</h3>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Generated offline (pandas / sklearn / matplotlib)</p>
            </div>
            {pythonAnalytics?.generatedAt && (
              <span className={`text-[9px] font-mono font-black ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{new Date(pythonAnalytics.generatedAt).toLocaleString()}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Observations</div>
              <div className={`text-2xl font-black mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{pythonAnalytics?.observations?.total ?? pythonAnalytics?.observations?.rows ?? 0}</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Open: {pythonAnalytics?.observations?.open ?? 0} • Closed: {pythonAnalytics?.observations?.closed ?? 0}</div>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Incidents</div>
              <div className={`text-2xl font-black mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{pythonAnalytics?.incidents?.rows ?? 0}</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Model: {pythonAnalytics?.model?.enabled ? `Accuracy ${(pythonAnalytics?.model?.accuracy * 100).toFixed(0)}%` : 'Not enough data'}</div>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sources</div>
              <div className={`text-[10px] font-mono font-black mt-2 break-words ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{pythonAnalytics?.sources?.observations ?? ''}</div>
              <div className={`text-[10px] font-mono font-black mt-2 break-words ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{pythonAnalytics?.sources?.incidents ?? ''}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {pythonAnalytics?.assets?.observationsByType && (
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Observations by type</div>
                <img src={pythonAnalytics.assets.observationsByType} alt="Observations by type" className="w-full rounded-xl" loading="lazy" />
              </div>
            )}
            {pythonAnalytics?.assets?.observationsBySite && (
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Observations by site</div>
                <img src={pythonAnalytics.assets.observationsBySite} alt="Observations by site" className="w-full rounded-xl" loading="lazy" />
              </div>
            )}
            {pythonAnalytics?.assets?.incidentsOverTime && (
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Incidents over time</div>
                <img src={pythonAnalytics.assets.incidentsOverTime} alt="Incidents over time" className="w-full rounded-xl" loading="lazy" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-8 p-8 rounded-[2.5rem] border shadow-2xl flex flex-col relative overflow-hidden min-h-[350px] ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'}`}>
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Site Risk Matrix</h3>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Weighted Criticality Index</p>
              </div>
           </div>
           <div className="flex-1 w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteStats} layout="vertical">
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={10} fontWeight="bold" width={80} axisLine={false} tickLine={false} />
                   <Bar dataKey="criticality" radius={[0, 8, 8, 0]} barSize={20}>
                      {siteStats.map((_, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#3b82f6'} />)}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className={`lg:col-span-4 p-8 rounded-[2.5rem] border shadow-2xl flex flex-col justify-center items-center relative overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'}`}>
           <h3 className={`text-xl font-black tracking-tight mb-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>Fleet Health</h3>
           <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                 <circle cx="50%" cy="50%" r="42%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                 <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="264" strokeDashoffset={264 - (264 * (stats.closed / (stats.total || 1)))} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute flex flex-col items-center">
                 <span className={`text-4xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{Math.round((stats.closed / (stats.total || 1)) * 100)}%</span>
                 <span className="text-[8px] font-black text-blue-500 uppercase">Integrity</span>
              </div>
           </div>
        </div>
      </div>

      <div className="pt-4">
          <div className="flex justify-between items-center mb-6 px-2">
             <div className="flex flex-col">
               <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Control Terminal</h3>
               <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Execute Operational Protocols</p>
             </div>
             <div className={`p-1 rounded-2xl border flex items-center shadow-lg ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                {(['operations', 'management'] as const).map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === c ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{c}</button>
                ))}
             </div>
          </div>

          <div className={`relative p-8 rounded-[3rem] border-2 transition-all duration-500 overflow-hidden bg-[#0f172a]/40 border-blue-400/30`}>
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {activeCategory === 'operations' ? (
                   <>
                     <TerminalButton onClick={() => onNavigate('incident-report')} icon="alert" label="Incident" color="rose" isLight={isLight} />
                     <TerminalButton onClick={() => onNavigate('create')} icon="plus" label="Observation" color="blue" isLight={isLight} />
                     <TerminalButton onClick={() => onNavigate('my-tasks')} icon="user" label="My Tasks" color="emerald" count={myTaskCount} isLight={isLight} />
                     <TerminalButton onClick={() => onNavigate('recent')} icon="list" label="Registry" color="slate" isLight={isLight} />
                     <TerminalButton onClick={() => onNavigate('checklists')} icon="check" label="Inspect" color="amber" isLight={isLight} />
                     <TerminalButton onClick={() => onNavigate('personnel')} icon="users" label="Personnel" color="indigo" isLight={isLight} />
                   </>
                ) : (
                  <>
                    <TerminalButton onClick={() => onNavigate('risk-assessment')} icon="shield" label="Risk RA" color="rose" isLight={isLight} />
                    <TerminalButton onClick={() => onNavigate('training-management')} icon="book" label="Training" color="violet" isLight={isLight} />
                    <TerminalButton onClick={() => onNavigate('compliance-tracker')} icon="award" label="Compliance" color="cyan" isLight={isLight} />
                    <TerminalButton onClick={() => onNavigate('audit-trail')} icon="history" label="Audit" color="zinc" isLight={isLight} />
                  </>
                )}
             </div>
          </div>
      </div>
    </div>
  );
};

const TerminalButton = ({ onClick, icon, label, color, count, isLight }: any) => {
  const colors: any = { 
    blue: 'bg-blue-600', 
    rose: 'bg-rose-600', 
    emerald: 'bg-emerald-600', 
    slate: 'bg-slate-700', 
    amber: 'bg-amber-600', 
    indigo: 'bg-indigo-600', 
    violet: 'bg-violet-600', 
    cyan: 'bg-cyan-600', 
    zinc: 'bg-zinc-800' 
  };
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
      case 'plus': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>;
      case 'user': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
      case 'list': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
      case 'check': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 12l2 2 4-4M7.83 11H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2.83"/></svg>;
      case 'users': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>;
      case 'shield': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
      case 'book': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5a2.5 2.5 0 0 1 0-5H20V5H6.5A2.5 2.5 0 0 1 4 2.5v17Z"/></svg>;
      case 'award': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 17 17 23 15.79 13.88"/></svg>;
      case 'history': return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
      default: return null;
    }
  };
  
  return (
    <button onClick={onClick} className={`relative h-28 rounded-3xl p-4 flex flex-col items-center justify-center transition-all duration-300 group border ${isLight ? `bg-white/50 border-slate-200` : `bg-black/40 border-white/10 hover:border-white/20`}`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white mb-2 shadow-xl ${colors[color]}`}>{getIcon(icon)}</div>
      <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{label}</span>
      {count > 0 && <div className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">{count}</div>}
    </button>
  );
};
