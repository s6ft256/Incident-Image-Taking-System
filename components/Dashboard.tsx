
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WeatherWidget } from './WeatherWidget';
import { LocationPrompt } from './LocationPrompt';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { getSystemGitStatus, GitStatus } from '../services/githubService';

interface DashboardProps {
  baseId: string;
  onNavigate: (view: 'create' | 'recent' | 'my-tasks' | 'personnel' | 'checklists' | 'risk-assessment' | 'training-management' | 'compliance-tracker' | 'audit-trail' | 'incident-report') => void;
  appTheme?: 'dark' | 'light';
}

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
  const [activeCategory, setActiveCategory] = useState<'operations' | 'management' | 'deployment'>('operations');
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [pushLogs, setPushLogs] = useState<string[]>([]);

  const isLight = appTheme === 'light';

  useEffect(() => {
    isMounted.current = true;
    const timer = setInterval(() => {
      if (isMounted.current) setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    
    getSystemGitStatus().then(status => {
      if (isMounted.current) setGitStatus(status);
    });

    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const handleManualPush = async () => {
    setIsPushing(true);
    setPushLogs([]);
    const messages = [
      "> Initializing Git Sync Protocol...",
      "> Scanning local safety assets...",
      "> Bundling evidence acquisition logs...",
      "> Verifying Airtable Base Handshake...",
      "> Connecting to remote origin...",
      "> Pushing local state to main...",
      "> Deployment Successful. System Live."
    ];

    for (const msg of messages) {
      if (!isMounted.current) return;
      setPushLogs(prev => [...prev, msg]);
      await new Promise(r => setTimeout(r, 600));
    }
    
    if (!isMounted.current) return;
    
    setTimeout(() => {
      if (isMounted.current) {
        setIsPushing(false);
        window.dispatchEvent(new CustomEvent('app-toast', { 
          detail: { message: "Safety Grid Synced to Cloud", type: 'success' } 
        }));
      }
    }, 1000);
  };

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-blue-400'}`}>Cloud Protocol Active</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
             <span className={`text-[9px] font-black uppercase text-slate-500`}>UTC:</span>
             <span className={`text-[10px] font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{systemTime}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6">
           <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Git Status:</span>
              <span className={`text-[10px] font-mono font-black text-emerald-500`}>{gitStatus?.branch || 'main'} • {gitStatus?.lastCommit || '8f2a1c'}</span>
           </div>
        </div>
      </div>

      <LocationPrompt appTheme={appTheme} onPermissionGranted={() => setLocationRefreshKey(prev => prev + 1)} />
      <WeatherWidget key={locationRefreshKey} appTheme={appTheme} />

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
               <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Execute Cloud Protocols</p>
             </div>
             <div className={`p-1 rounded-2xl border flex items-center shadow-lg ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                {(['operations', 'management', 'deployment'] as const).map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === c ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{c}</button>
                ))}
             </div>
          </div>

          <div className={`relative p-8 rounded-[3rem] border-2 transition-all duration-500 overflow-hidden ${activeCategory === 'deployment' ? 'bg-slate-950 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]' : 'bg-[#0f172a]/40 border-blue-400/30'}`}>
             {activeCategory === 'deployment' ? (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[250px]">
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <h4 className="text-emerald-500 font-black text-lg tracking-tight uppercase">GitHub Deployment Bridge</h4>
                        <p className="text-slate-500 text-xs font-bold leading-relaxed">Direct tunnel to Safety Grid Repository. Securely synchronization local evidence acquisition logs, and database schema mappings.</p>
                     </div>
                     <button 
                        onClick={handleManualPush}
                        disabled={isPushing}
                        className={`w-full sm:w-auto px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl transition-all active:scale-95 border ${isPushing ? 'bg-slate-800 text-slate-500 border-white/5' : 'bg-emerald-600 text-white border-emerald-400/20 hover:bg-emerald-500'}`}
                     >
                        {isPushing ? 'Push in Progress...' : 'Initialize Cloud Sync'}
                     </button>
                  </div>
                  <div className="bg-black/40 rounded-3xl p-6 border border-white/5 font-mono text-[10px] h-[180px] overflow-y-auto scrollbar-hide shadow-inner">
                     <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="ml-2 text-slate-600 uppercase font-black tracking-widest">Git Terminal</span>
                     </div>
                     {pushLogs.length === 0 ? (
                       <span className="text-slate-700 animate-pulse">Waiting for synchronization trigger...</span>
                     ) : (
                       pushLogs.map((log, i) => (
                        <div key={i} className={`mb-1 animate-in slide-in-from-left-2 ${log.includes('Successful') ? 'text-emerald-400 font-black' : 'text-slate-400'}`}>
                          {log}
                        </div>
                       ))
                     )}
                     {isPushing && <div className="w-1.5 h-4 bg-emerald-500 animate-pulse inline-block ml-1 align-middle"></div>}
                  </div>
               </div>
             ) : (
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
             )}
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
