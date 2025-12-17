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

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-lg text-xs z-50">
        <p className="text-slate-200 font-semibold">{label}</p>
        <p className="text-blue-400">
          Incidents: {payload[0].value}
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

  // Calculations
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
    .slice(0, 10); // Show top 10 sites

  const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

  // --- SVG Chart Helpers ---
  const renderPieChart = () => {
    if (total === 0) return null;
    
    // Simple pie logic
    const openPercent = openCount / total;
    // Circle circumference = 2 * PI * R
    const r = 40;
    const c = 2 * Math.PI * r;
    const openOffset = c * (1 - openPercent);

    return (
      <div className="relative h-48 w-48 mx-auto flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 120 120" className="transform -rotate-90">
          {/* Background/Closed Circle (Emerald) */}
          <circle cx="60" cy="60" r={r} fill="transparent" stroke="#10b981" strokeWidth="20" />
          {/* Foreground/Open Circle (Amber) */}
          <circle 
            cx="60" cy="60" r={r} 
            fill="transparent" 
            stroke="#f59e0b" 
            strokeWidth="20" 
            strokeDasharray={c} 
            strokeDashoffset={openOffset} 
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold text-white">{total}</span>
            <span className="text-[10px] text-slate-400 uppercase">Total</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 mb-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">HSE Dashboard</h2>
        <p className="text-slate-400 text-xs">Overview of critical system incidents</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center">
               <span className="text-3xl font-bold text-white">{total}</span>
               <span className="text-[10px] text-slate-400 uppercase font-semibold">Reports</span>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full m-2 animate-pulse"></div>
               <span className="text-3xl font-bold text-amber-400">{openCount}</span>
               <span className="text-[10px] text-amber-500/80 uppercase font-semibold">Open</span>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center">
               <span className="text-3xl font-bold text-emerald-400">{closedCount}</span>
               <span className="text-[10px] text-emerald-500/80 uppercase font-semibold">Closed</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Pie Chart */}
            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 border-b border-slate-700/50 pb-2">Status Distribution</h3>
                <div className="flex-grow flex flex-col justify-center">
                  {renderPieChart()}
                  <div className="flex justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                          <span className="text-xs text-slate-300">Open ({openCount})</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <span className="text-xs text-slate-300">Closed ({closedCount})</span>
                      </div>
                  </div>
                </div>
            </div>

            {/* Sites Bar Chart (Vertical Layout) */}
            <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col min-h-[300px]">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 border-b border-slate-700/50 pb-2">Incidents by Location</h3>
                <div className="flex-1 w-full min-h-[250px]">
                  {siteChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={siteChartData} 
                        layout="vertical" 
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          stroke="#94a3b8" 
                          fontSize={11} 
                          width={80} 
                          tick={{fill: '#cbd5e1'}} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.4}} />
                        <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]} barSize={20}>
                          {siteChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      No location data available
                    </div>
                  )}
                </div>
            </div>
          </div>
        </>
      )}

      {/* Main Navigation Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700/50">
          <button
            onClick={() => onNavigate('create')}
            className="group relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-900/60 to-blue-800/40 border border-blue-500/30 hover:border-blue-400 transition-all hover:shadow-lg hover:shadow-blue-900/20"
          >
            <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-3 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 group-hover:text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <div className="text-left">
                    <h3 className="text-lg font-bold text-white">New Report</h3>
                    <p className="text-xs text-blue-200">Capture incident details</p>
                </div>
            </div>
            <div className="bg-slate-900/30 p-1.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
          </button>

          <button
            onClick={() => onNavigate('recent')}
            className="group relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-800/40 border border-slate-600 hover:border-slate-400 transition-all hover:shadow-lg hover:shadow-slate-900/20"
          >
             <div className="flex items-center gap-4">
                <div className="bg-slate-700/40 p-3 rounded-lg group-hover:bg-slate-700/60 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Recent Logs</h3>
                    <p className="text-xs text-slate-400">View & Resolve entries</p>
                </div>
            </div>
            <div className="bg-slate-900/30 p-1.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
          </button>
      </div>
    </div>
  );
};