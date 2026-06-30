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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  const observationsByType = useMemo(() => {
    if (!Array.isArray(reports)) return [];
    const map = reports.reduce<Record<string, number>>((acc, report) => {
      const type = String(report.fields["Observation Type"] || 'Unknown');
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(map)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [reports]);

  const topObservationType = observationsByType.length ? observationsByType[0] : null;
  const topSite = siteStats[0];

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

  const getSystemStatusText = () => {
    if (!stats.total) return 'No observations yet — start with a field report.';
    const ratio = stats.open / stats.total;
    if (ratio > 0.6) return 'Backlog rising — prioritize open actions immediately.';
    if (ratio > 0.3) return 'Stable, but monitor open reports closely.';
    return 'Healthy response cadence — keeping the site safe.';
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
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">Welcome back to your dashboard. This command center gives you a real-time picture of active safety observations, incident trends, and priority response tasks.</p>
          </div>

          <button
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className={`inline-flex items-center justify-center rounded-3xl border px-4 py-3 text-sm font-black uppercase tracking-[0.25em] transition ${isLight ? 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800' : 'bg-slate-100 text-slate-900 border-white/10 hover:bg-slate-200'}`}
            aria-expanded={isDrawerOpen}
            aria-label={isDrawerOpen ? 'Close control terminal' : 'Open control terminal'}
          >
            {isDrawerOpen ? 'Close Control Terminal' : 'Open Control Terminal'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className={`rounded-3xl p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Top Site</div>
            <div className={`mt-3 text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{topSite?.name || 'No data'}</div>
            <div className="mt-2 text-xs text-slate-400">{topSite ? `${topSite.count} reports • ${topSite.riskLevel} risk` : 'Collect observations to surface the most active location.'}</div>
          </div>
          <div className={`rounded-3xl p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Common Hazard</div>
            <div className={`mt-3 text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{topObservationType?.type || 'No data'}</div>
            <div className="mt-2 text-xs text-slate-400">{topObservationType ? `${topObservationType.count} reports` : 'Hazard types will appear here once data is available.'}</div>
          </div>
          <div className={`rounded-3xl p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Open Ratio</div>
            <div className={`mt-3 text-xl font-black ${stats.total && stats.open / stats.total > 0.5 ? 'text-rose-400' : 'text-emerald-400'}`}>{stats.total ? `${Math.round((stats.open / stats.total) * 100)}%` : '0%'}</div>
            <div className="mt-2 text-xs text-slate-400">The share of unresolved reports in the current dataset.</div>
          </div>
          <div className={`rounded-3xl p-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Assigned Tasks</div>
            <div className={`mt-3 text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{myTaskCount}</div>
            <div className="mt-2 text-xs text-slate-400">Open reports currently assigned to you.</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-6">
        <div className={`rounded-3xl p-5 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Total Observations</div>
          <div className={`mt-4 text-4xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{stats.total}</div>
          <div className="mt-3 text-sm text-slate-400">Live count of all tracked field observations.</div>
        </div>

        <div className={`rounded-3xl p-5 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Open Actions</div>
          <div className={`mt-4 text-4xl font-black ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>{stats.open}</div>
          <div className="mt-3 text-sm text-slate-400">Observation items still awaiting corrective action.</div>
        </div>

        <div className={`rounded-3xl p-5 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Resolved Reports</div>
          <div className={`mt-4 text-4xl font-black ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>{stats.closed}</div>
          <div className="mt-3 text-sm text-slate-400">Observations where action has been documented.</div>
        </div>

        <div className={`rounded-3xl p-5 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
          <div className="flex items-start gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Your Priority</div>
            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-200'}`}>{myTaskCount} assigned</span>
          </div>
          <div className={`mt-4 text-4xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{myTaskCount}</div>
          <div className="mt-3 text-sm text-slate-400">Reports assigned directly to you and still open.</div>
        </div>
      </div>

      <div
        className={`flex items-center justify-between px-6 py-3 rounded-2xl border backdrop-blur-md overflow-hidden ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-blue-950/20 border-blue-500/20 shadow-md'}`}
        aria-label="System Status"
      >
        <div className="flex items-center gap-2 min-w-[140px]">
          <div
            className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"
            aria-hidden="true"
          ></div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>System Nominal</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>UTC Sync:</span>
          <span className={`text-[10px] font-mono font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{systemTime}</span>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[160px] justify-end text-right">
          <div className="hidden sm:flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Grid ID:</span>
            <span className={`text-[10px] font-mono font-black ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>HSE-G-2.5</span>
          </div>
          <span
            className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}
            role="status"
          >
            Authorized
          </span>
          <span className="hidden md:block text-[9px] text-slate-400 uppercase tracking-[0.35em] font-black">{getSystemStatusText()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-6">
        <div className={`rounded-3xl p-6 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}> 
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Observation Pulse</div>
              <div className={`mt-4 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{stats.open}</div>
            </div>
            <div className="text-right">
              <div className={`text-[10px] font-black uppercase tracking-[0.35em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Open Ratio</div>
              <div className={`mt-2 text-2xl font-black ${stats.total ? (stats.open / stats.total > 0.5 ? 'text-rose-400' : 'text-emerald-400') : (isLight ? 'text-slate-900' : 'text-white')}`}>{stats.total ? `${Math.round((stats.open / stats.total) * 100)}%` : '0%'}</div>
            </div>
          </div>
          <div className="mt-6 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full ${stats.total ? (stats.open / stats.total > 0.5 ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-slate-700'}`} style={{ width: `${stats.total ? Math.min(100, Math.round((stats.open / stats.total) * 100)) : 0}%` }} />
          </div>
          <p className="mt-4 text-sm text-slate-400">Open observations that need follow-up. Keep the open ratio below 40%.</p>
        </div>

        <div className={`rounded-3xl p-6 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Top Site Risk</div>
          <div className={`mt-4 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{topSite?.name || 'No data'}</div>
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {topSite ? (
              <>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black ${topSite.riskLevel === 'Critical' ? 'bg-red-600 text-white' : topSite.riskLevel === 'High' ? 'bg-orange-500 text-white' : topSite.riskLevel === 'Moderate' ? 'bg-amber-300 text-slate-900' : 'bg-emerald-500 text-white'}`}>{topSite.riskLevel}</span>
                <span className="text-sm text-slate-400">{topSite.count} observations</span>
              </>
            ) : (
              <span className="text-sm text-slate-400">No recent site trends available yet.</span>
            )}
          </div>
          {topSite && <p className="mt-4 text-sm text-slate-400">Average severity {topSite.avgSeverity.toFixed(1)} across the most active location.</p>}
        </div>

        <div className={`rounded-3xl p-6 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/10'} shadow-sm`}>
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Top Observation Types</div>
          <div className="mt-4 space-y-3">
            {observationsByType.length ? observationsByType.map((item) => (
              <div key={item.type} className="flex items-center justify-between rounded-2xl border px-4 py-3 bg-slate-950/60 border-white/10">
                <div>
                  <div className="text-sm font-black text-white">{item.type}</div>
                  <div className="text-[11px] text-slate-400">{item.count} reports</div>
                </div>
                <div className="text-sm font-black text-slate-200">{Math.round((item.count / (stats.total || 1)) * 100)}%</div>
              </div>
            )) : (
              <div className="rounded-2xl border px-4 py-5 border-dashed border-slate-500 text-sm text-slate-400">No observation type data available.</div>
            )}
          </div>
        </div>
      </div>

      <LocationPrompt appTheme={appTheme} onPermissionGranted={() => setLocationRefreshKey((prev) => prev + 1)} />
      <WeatherWidget key={locationRefreshKey} appTheme={appTheme} />

      <div
        id="control-drawer"
        role="dialog"
        aria-modal="true"
        className={`fixed left-0 top-40 z-30 flex h-[calc(100vh-10rem)] w-full max-w-[92vw] lg:w-[350px] flex-col gap-4 overflow-y-auto rounded-[2rem] border bg-slate-950/95 p-5 shadow-2xl transition-all duration-300 backdrop-blur-xl ${isDrawerOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-400">Command Console</div>
            <h2 className="mt-2 text-lg font-black text-white">Top-left Operations</h2>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close command console"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className={`rounded-3xl border ${isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/80 border-white/10'} p-4`}>
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">
            <span>Summary</span>
            <span>{getFleetHealthLabel()}</span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-200">
              <div className="font-black text-base">{stats.total}</div>
              <div className="mt-1 text-[11px] text-slate-400">Total active observations</div>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-200">
              <div className="font-black text-base">{stats.open}</div>
              <div className="mt-1 text-[11px] text-slate-400">Open actions pending</div>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-200">
              <div className="font-black text-base">{myTaskCount}</div>
              <div className="mt-1 text-[11px] text-slate-400">Assigned to you</div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border bg-slate-950/90 p-4 text-white shadow-inner shadow-slate-900/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Modes</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['operations', 'management'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                aria-pressed={activeCategory === c}
                className={`rounded-2xl px-3 py-3 text-left text-xs font-black uppercase tracking-[0.2em] transition ${activeCategory === c ? 'bg-slate-800 text-white shadow-lg ring-1 ring-sky-400/20' : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {activeCategory === 'operations' ? (
            [
              { view: 'incident-report', icon: 'alert', label: 'Incident', color: 'rose' },
              { view: 'create', icon: 'plus', label: 'Observation', color: 'blue' },
              { view: 'my-tasks', icon: 'user', label: 'My Tasks', color: 'emerald', badge: myTaskCount },
              { view: 'recent', icon: 'list', label: 'Registry', color: 'slate' },
              { view: 'checklists', icon: 'check', label: 'Inspect', color: 'amber' },
              { view: 'personnel', icon: 'users', label: 'Personnel', color: 'indigo' },
            ].map((item) => (
              <TerminalButton key={item.label} onClick={() => onNavigate(item.view as any)} icon={item.icon} label={item.label} color={item.color} count={item.badge || 0} isLight={isLight} />
            ))
          ) : (
            [
              { view: 'risk-assessment', icon: 'shield', label: 'Risk RA', color: 'rose' },
              { view: 'training-management', icon: 'book', label: 'Training', color: 'violet' },
              { view: 'compliance-tracker', icon: 'award', label: 'Compliance', color: 'cyan' },
              { view: 'audit-trail', icon: 'history', label: 'Audit', color: 'zinc' },
            ].map((item) => (
              <TerminalButton key={item.label} onClick={() => onNavigate(item.view as any)} icon={item.icon} label={item.label} color={item.color} count={0} isLight={isLight} />
            ))
          )}
        </div>

        <div className="mt-auto rounded-[2rem] border border-slate-800 bg-slate-950/90 p-4 text-sm text-slate-300">
          <div className="font-black uppercase tracking-[0.35em] text-slate-500">Quick Data</div>
          <div className="mt-3 space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Top Site</div>
              <div className="mt-2 font-bold text-white">{topSite?.name || 'None'}</div>
              <div className="text-[11px] text-slate-400">{topSite ? `${topSite.count} reports • ${topSite.riskLevel}` : 'No site data yet'}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Top Hazard</div>
              <div className="mt-2 font-bold text-white">{topObservationType?.type || 'None'}</div>
              <div className="text-[11px] text-slate-400">{topObservationType ? `${topObservationType.count} reports` : 'No observation data yet'}</div>
            </div>
          </div>
        </div>
      </div>

      {pythonAnalytics ? (
        <div
          className={`p-8 rounded-[2.5rem] border shadow-md ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'}`}
          aria-label="Analytics Snapshot"
        >
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
      ) : (
        <div className={`p-6 rounded-[2rem] border shadow-md ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5 backdrop-blur-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Insights Overview</h3>
              <p className="text-sm text-slate-400 mt-1">A quick snapshot of the most active sites and observation types.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`rounded-3xl p-5 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Most Active Location</div>
              <div className={`mt-4 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{topSite?.name || 'No data'}</div>
              <div className="mt-2 text-sm text-slate-400">{topSite ? `${topSite.count} observations • ${topSite.riskLevel} risk` : 'No active site data available.'}</div>
            </div>
            <div className={`rounded-3xl p-5 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">Most Common Risk Type</div>
              <div className={`mt-4 text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{topObservationType?.type || 'No data'}</div>
              <div className="mt-2 text-sm text-slate-400">{topObservationType ? `${topObservationType.count} reports` : 'No dominant type yet.'}</div>
            </div>
          </div>
        </div>
      )}

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

const TerminalButton = ({ onClick, icon, label, color, count, isLight }: any) => {
  const colors: any = { 
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
      <div className={`w-11 h-11 rounded-3xl flex items-center justify-center mb-3 shadow-lg ${colors[color]}`}>{getIcon(icon)}</div>
      <span className={`text-[10px] font-black uppercase tracking-[0.25em] text-center ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{label}</span>
      {count > 0 && <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-xl">{count}</div>}
    </button>
  );
};
