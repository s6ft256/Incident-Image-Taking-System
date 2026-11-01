import React, { useState, useMemo, useEffect } from 'react';
import { WeatherWidget } from './WeatherWidget';
import { LocationPrompt } from './LocationPrompt';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { can, roleLabel, Permission } from '../services/permissions';

interface DashboardProps {
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

type DashboardView = Parameters<DashboardProps['onNavigate']>[0];

interface ControlItem {
  view: DashboardView;
  icon: string;
  label: string;
  color: string;
  badge?: number;
  // When set, the item is only shown to roles granted this permission.
  permission?: Permission;
}

const OPERATION_ITEMS: ControlItem[] = [
  { view: 'incident-report', icon: 'alert', label: 'Incident', color: 'rose', permission: 'submit-incident' },
  { view: 'create', icon: 'plus', label: 'Observation', color: 'blue', permission: 'submit-observation' },
  { view: 'my-tasks', icon: 'user', label: 'My Tasks', color: 'emerald' },
  { view: 'recent', icon: 'list', label: 'Registry', color: 'slate' },
  { view: 'checklists', icon: 'check', label: 'Inspect', color: 'amber', permission: 'submit-checklist' },
  { view: 'personnel', icon: 'users', label: 'Personnel', color: 'indigo', permission: 'review-report' },
];

const MANAGEMENT_ITEMS: ControlItem[] = [
  { view: 'risk-assessment', icon: 'shield', label: 'Risk RA', color: 'rose', permission: 'review-report' },
  { view: 'training-management', icon: 'book', label: 'Training', color: 'violet', permission: 'review-report' },
  { view: 'compliance-tracker', icon: 'award', label: 'Compliance', color: 'cyan', permission: 'view-audit-log' },
  { view: 'audit-trail', icon: 'history', label: 'Audit', color: 'zinc', permission: 'view-audit-log' },
];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, appTheme = 'dark' }) => {
  const { state, refetchData } = useAppContext();
  const { userProfile, allReports: reports, allIncidents: incidents } = state;

  const [locationRefreshKey, setLocationRefreshKey] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const isLight = appTheme === 'light';

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

  const incidentStats = useMemo(() => {
    const closed = incidents.filter(
      (incident) => String(incident.fields.Status || '').toLowerCase() === 'closed'
    ).length;
    return {
      total: incidents.length,
      open: incidents.length - closed,
    };
  }, [incidents]);

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

    const riskScore = (score: number) => {
      if (score >= 8) return 'Critical';
      if (score >= 6) return 'High';
      if (score >= 4) return 'Moderate';
      return 'Low';
    };

    return Object.keys(data)
      .map(name => {
        const count = data[name].count;
        const avgSeverity = count ? data[name].severityScore / count : 0;
        return {
          name,
          count,
          criticality: data[name].severityScore,
          avgSeverity,
          riskLevel: riskScore(avgSeverity),
          riskIndex: avgSeverity,
        };
      })
      .sort((a, b) => b.criticality - a.criticality)
      .slice(0, 5);
  }, [reports]);

  const myTaskCount = useMemo(() => {
    if (!Array.isArray(reports) || !userProfile?.name) return 0;
    return reports.filter(r => {
      const assignee = r.fields["Assigned To"];
      const action = r.fields["Action taken"];
      const isMyTask = assignee === userProfile.name;
      const isOpen = !action || (typeof action === 'string' && action.trim().length === 0);
      return isMyTask && isOpen;
    }).length;
  }, [reports, userProfile?.name]);

  const role = userProfile?.role;
  const visibleOperations = useMemo(
    () => OPERATION_ITEMS.filter(item => !item.permission || can(role, item.permission)),
    [role]
  );
  const visibleManagement = useMemo(
    () => MANAGEMENT_ITEMS.filter(item => !item.permission || can(role, item.permission)),
    [role]
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRiskColor = (avgSeverity: number) => {
    if (avgSeverity >= 8) return '#ef4444';
    if (avgSeverity >= 6) return '#f59e0b';
    if (avgSeverity >= 4) return '#facc15';
    return '#22c55e';
  };

  const getFleetHealthLabel = () => {
    if (!stats.total) return 'No data';
    const percent = (stats.closed / stats.total) * 100;
    if (percent >= 80) return 'Healthy';
    if (percent >= 50) return 'Needs attention';
    return 'At risk';
  };

  return (
    <div className={`space-y-6 pb-12 animate-in fade-in duration-700 transition-all`} role="main">
      <div className="px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{getGreeting()}, {userProfile?.name || 'User'}!</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20'}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
                {roleLabel(role)}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${can(role, 'review-report') ? (isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20') : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-slate-300 ring-1 ring-white/10')}`}>
                {can(role, 'review-report') ? 'Level 2 Clearance' : 'Level 1 Clearance'}
              </span>
            </div>
          </div>
        </div>

        {state.error && (
          <div
            role="alert"
            className={`mt-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              isLight
                ? 'border-amber-300 bg-amber-50 text-amber-950'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
            }`}
          >
            <div>
              <p className="text-sm font-bold">Some live data could not be loaded.</p>
              <p className="mt-1 break-words text-xs opacity-80">{state.error}</p>
            </div>
            <button
              type="button"
              onClick={() => void refetchData()}
              className="rounded-xl border border-current/20 px-4 py-2 text-xs font-bold"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-[11px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Quick Actions</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {visibleOperations.map((item) => (
              <TerminalButton
                key={item.label}
                onClick={() => onNavigate(item.view)}
                icon={item.icon}
                label={item.label}
                color={item.color}
                count={item.label === 'My Tasks' ? myTaskCount : item.badge || 0}
                isLight={isLight}
              />
            ))}
          </div>
          {visibleManagement.length > 0 && (
            <>
              <h2 className={`mt-6 mb-3 text-[11px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Management</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {visibleManagement.map((item) => (
                  <TerminalButton
                    key={item.label}
                    onClick={() => onNavigate(item.view)}
                    icon={item.icon}
                    label={item.label}
                    color={item.color}
                    count={item.badge || 0}
                    isLight={isLight}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-3xl p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Open Observations</div>
            <div className={`mt-2 text-3xl font-black ${stats.open > 0 ? (isLight ? 'text-rose-700' : 'text-rose-300') : (isLight ? 'text-slate-900' : 'text-white')}`}>{stats.open}</div>
          </div>
          <div className={`rounded-3xl p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Open Incidents</div>
            <div className={`mt-2 text-3xl font-black ${incidentStats.open > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{incidentStats.open}</div>
          </div>
          <div className={`rounded-3xl p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">My Tasks</div>
            <div className={`mt-2 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{myTaskCount}</div>
          </div>
          <div className={`rounded-3xl p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Resolved</div>
            <div className={`mt-2 text-3xl font-black ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>{stats.closed}</div>
          </div>
        </div>
      </div>

      <div
        className={`mx-6 flex items-center justify-between px-5 py-3 rounded-2xl border backdrop-blur-md ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-blue-950/20 border-blue-500/20 shadow-md'}`}
        aria-label="System Status"
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`}
            aria-hidden="true"
          ></div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{isOnline ? 'System Nominal' : 'Offline — Queuing Locally'}</span>
        </div>
        <span
          className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
            !isOnline || state.error
              ? isLight
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}
          role="status"
        >
          {!isOnline ? 'Offline' : state.error ? 'Degraded' : state.isLoading ? 'Syncing' : 'Connected'}
        </span>
      </div>

      <LocationPrompt appTheme={appTheme} onPermissionGranted={() => setLocationRefreshKey((prev) => prev + 1)} />
      <WeatherWidget key={locationRefreshKey} appTheme={appTheme} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-8 p-8 rounded-[2.5rem] border shadow-md flex flex-col relative overflow-hidden min-h-[350px] ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'}`}>
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Site Risk Matrix</h3>
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Weighted Criticality Index</p>
              </div>
           </div>
           <div className="flex-1 w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteStats} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" stroke={isLight ? "#64748b" : "#94a3b8"} fontSize={10} fontWeight="bold" width={100} axisLine={false} tickLine={false} />
                   <Bar dataKey="criticality" radius={[0, 8, 8, 0]} barSize={18}>
                      {siteStats.map((item, index) => (
                        <Cell key={`cell-${index}`} fill={getRiskColor(item.avgSeverity)} />
                      ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {siteStats.map(site => (
                <div key={site.name} className="flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold" style={{ borderColor: isLight ? '#cbd5e1' : '#334155', backgroundColor: isLight ? '#f8fafc' : '#0f172a' }}>
                  <span>{site.name}</span>
                  <span className={`px-2 py-0.5 rounded-full ${site.riskLevel === 'Critical' ? 'bg-red-600 text-white' : site.riskLevel === 'High' ? 'bg-orange-500 text-white' : site.riskLevel === 'Moderate' ? 'bg-yellow-400 text-black' : 'bg-emerald-500 text-white'}`}>{site.riskLevel}</span>
                </div>
              ))}
           </div>
        </div>

        <div className={`lg:col-span-4 p-8 rounded-[2.5rem] border shadow-md flex flex-col justify-center items-center relative overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'}`}>
           <h3 className={`text-xl font-black tracking-tight mb-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>Fleet Health</h3>
           <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                 <circle cx="50%" cy="50%" r="42%" fill="none" stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'} strokeWidth="12" />
                 <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#38bdf8" strokeWidth="12" strokeDasharray="264" strokeDashoffset={264 - (264 * (stats.closed / (stats.total || 1)))} strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <div className="absolute flex flex-col items-center">
                 <span className={`text-4xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{Math.round((stats.closed / (stats.total || 1)) * 100)}%</span>
                 <span className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">Resolution Rate</span>
              </div>
           </div>
           <div className="mt-6 text-center">
              <div className={`text-sm font-black uppercase tracking-[0.25em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{getFleetHealthLabel()}</div>
              <div className="mt-2 text-xs text-slate-400">{stats.closed}/{stats.total} reports closed</div>
           </div>
        </div>
      </div>
    </div>
  );
};

const TERMINAL_BUTTON_COLORS: Record<string, string> = {
    blue: 'bg-blue-600 text-white', 
    rose: 'bg-rose-600 text-white', 
    emerald: 'bg-emerald-600 text-white', 
    slate: 'bg-slate-700 text-white', 
    amber: 'bg-amber-500 text-slate-900', 
    indigo: 'bg-indigo-600 text-white', 
    violet: 'bg-violet-600 text-white', 
    cyan: 'bg-cyan-500 text-slate-900', 
    zinc: 'bg-zinc-800 text-white' 
};

interface TerminalButtonProps {
  onClick: () => void;
  icon: string;
  label: string;
  color: string;
  count: number;
  isLight: boolean;
}

const TerminalButton: React.FC<TerminalButtonProps> = ({ onClick, icon, label, color, count, isLight }) => {
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
    <button
      onClick={onClick}
      className={`relative h-28 rounded-3xl p-4 flex flex-col items-center justify-center transition-all duration-300 group border shadow-sm ${isLight ? `bg-white/80 border-slate-200 hover:shadow-md` : `bg-slate-900/80 border-white/10 hover:bg-slate-800 hover:border-white/20 shadow-black/10`}`}
      aria-label={label}
    >
      <div className={`w-11 h-11 rounded-3xl flex items-center justify-center mb-3 shadow-lg ${TERMINAL_BUTTON_COLORS[color] || 'bg-slate-700 text-white'}`}>{getIcon(icon)}</div>
      <span className={`text-[10px] font-black uppercase tracking-[0.25em] text-center ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{label}</span>
      {count > 0 && <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-xl">{count}</div>}
    </button>
  );
};
