import React, { useEffect, useState } from 'react';
import { getAllReports } from '../services/airtableService';
import { FetchedIncident } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps
} from 'recharts';

interface DashboardProps {
  baseId: string;
  onNavigate: (view: 'create' | 'recent') => void;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-2xl text-xs z-50">
        <p className="text-white font-bold mb-1">{label}</p>
        <p className="text-blue-400 font-medium">
          Reports: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ baseId, onNavigate }) => {
  const [reports, setReports] = useState<FetchedIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const total = reports.length;
  const closedCount = reports.filter(r => r.fields["Action taken"] && r.fields["Action taken"].trim().length > 0).length;
  const openCount = total - closedCount;
  
  const siteCounts = reports.reduce((acc, curr) => {
    const site = curr.fields["Site / Location"] || 'Unknown';
    acc[site] = (acc[site] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const siteChartData = Object.entries(siteCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const BAR_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#818cf8'];

  const renderPieChart = () => {
    if (total === 0) return null;
    const openPercent = openCount / total;
    const r = 40;
    const c = 2 * Math.PI * r;
    const openOffset = c * (1 - openPercent);

    return (
      <div className="relative h-44 w-44 mx-auto flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 120 120" className="transform -rotate-90 drop-shadow-2xl">
          <circle cx="60" cy="60" r={r} fill="transparent" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="16" />
          <circle 
            cx="60" cy="60" r={r} 
            fill="transparent" 
            stroke="#f59e0b" 
            strokeWidth="16" 
            strokeDasharray={c} 
            strokeDashoffset={openOffset} 
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-black text-white">{total}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Total Logs</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section removed to clean up interface */}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Loading Analytics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Logs', value: total, color: 'text-white' },
              { label: 'Open', value: openCount, color: 'text-amber-400', pulse: true },
              { label: 'Resolved', value: closedCount, color: 'text-emerald-400' }
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center justify-center group hover:bg-white/10 transition-all">
                 <span className={`text-4xl font-black mb-1 ${stat.color} ${stat.pulse ? 'animate-pulse' : ''}`}>{stat.value}</span>
                 <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">Safety Status Map</h3>
                <div className="flex-grow">
                  {renderPieChart()}
                  <div className="flex justify-center gap-8 mt-10">
                      <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)]"></div>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Open</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full opacity-40"></div>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Closed</span>
                      </div>
                  </div>
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col min-h-[350px]">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">Distribution by Site</h3>
                <div className="flex-1 w-full min-h-[250px]">
                  {siteChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={siteChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="#94a3b8" 
                          fontSize={10} 
                          width={100} 
                          tick={{fill: '#94a3b8', fontWeight: 'bold'}} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                          {siteChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                      No Data Tracked
                    </div>
                  )}
                </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <button
            onClick={() => onNavigate('create')}
            className="group relative flex items-center justify-between p-6 rounded-3xl bg-blue-600/20 backdrop-blur-md border border-blue-500/30 hover:border-blue-400 transition-all hover:bg-blue-600/30 hover:shadow-2xl hover:shadow-blue-900/40"
          >
            <div className="flex items-center gap-5">
                <div className="bg-blue-600 p-4 rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <div className="text-left">
                    <h3 className="text-xl font-black text-white tracking-tight">Report Incident</h3>
                    <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Start New Capture</p>
                </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={() => onNavigate('recent')}
            className="group relative flex items-center justify-between p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 transition-all hover:bg-white/10 hover:shadow-2xl"
          >
             <div className="flex items-center gap-5">
                <div className="bg-slate-800 p-4 rounded-2xl shadow-xl group-hover:scale-110 transition-transform border border-white/5">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <div className="text-left">
                    <h3 className="text-xl font-black text-white tracking-tight">Recent Logs</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">View Historical Evidence</p>
                </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>
      </div>
    </div>
  );
};