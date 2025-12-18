import React, { useEffect, useState } from 'react';
import { getAllReports } from '../services/airtableService';
import { FetchedIncident } from '../types';
import { INCIDENT_TYPES } from '../constants';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  TooltipProps
} from 'recharts';

interface DashboardProps {
  baseId: string;
  onNavigate: (view: 'create' | 'recent') => void;
}

// Severity mapping for criticality calculation
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

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl text-[10px] z-50 ring-1 ring-white/5">
        <p className="text-white font-black mb-1 uppercase tracking-wider">{label}</p>
        <div className="space-y-1">
          <p className="text-blue-400 font-bold flex justify-between gap-4">
            <span>RISK IMPACT:</span>
            <span>{payload[0].value}</span>
          </p>
          {payload[1] && (
            <p className="text-slate-400 font-bold flex justify-between gap-4">
              <span>LOG COUNT:</span>
              <span>{payload[1].value}</span>
            </p>
          )}
        </div>
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
  
  // Calculate site statistics weighted by criticality
  const siteStats = reports.reduce((acc, curr) => {
    const site = curr.fields["Site / Location"] || 'Other';
    const type = curr.fields["Incident Type"] || 'Other';
    const severity = SEVERITY_MAP[type] || 1;
    
    if (!acc[site]) {
      acc[site] = { count: 0, severityScore: 0 };
    }
    acc[site].count += 1;
    acc[site].severityScore += severity;
    return acc;
  }, {} as Record<string, { count: number, severityScore: number }>);

  // Sort sites by criticality (Severity Score)
  const siteChartData = Object.entries(siteStats)
    .map(([name, stats]) => ({ 
      name, 
      count: stats.count, 
      criticality: stats.severityScore 
    }))
    .sort((a, b) => b.criticality - a.criticality)
    .slice(0, 8);

  const renderSafetyStatusMap = () => {
    const r = 35;
    const c = 2 * Math.PI * r;
    const openPercent = total > 0 ? openCount / total : 0;
    const openOffset = c * (1 - openPercent);
    
    return (
      <div className="relative h-48 w-48 mx-auto flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
          <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
          <circle 
            cx="50" cy="50" r={r} 
            fill="transparent" 
            stroke="#065f46" 
            strokeWidth="12" 
            strokeDasharray={c} 
            strokeDashoffset={0} 
            strokeLinecap="round"
          />
          <circle 
            cx="50" cy="50" r={r} 
            fill="transparent" 
            stroke="#f59e0b" 
            strokeWidth="12" 
            strokeDasharray={c} 
            strokeDashoffset={openOffset} 
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center text-center">
            <span className="text-5xl font-black text-white leading-none tracking-tighter">{total}</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Total Logs</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
          <span className="text-xs text-slate-500 font-black uppercase tracking-[0.4em]">Acquiring Evidence Status...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SAFETY STATUS MAP */}
          <div className="bg-white/[0.03] backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-10">Safety Status Map</h3>
              <div className="flex-grow flex items-center justify-center py-4">
                {renderSafetyStatusMap()}
              </div>
              <div className="flex justify-center gap-10 mt-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)]"></div>
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Open</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 bg-[#065f46] rounded-full"></div>
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Closed</span>
                </div>
              </div>
          </div>

          {/* DISTRIBUTION BY SITE - Criticality Weighted Graph */}
          <div className="bg-white/[0.03] backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-10 text-center">Criticality By Site</h3>
              <div className="flex-1 w-full min-h-[250px]">
                {siteChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={siteChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#475569" 
                        fontSize={9} 
                        tick={{fill: '#64748b', fontWeight: '900', textTransform: 'capitalize'}}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                      {/* Bars represent the Criticality Score */}
                      <Bar 
                        dataKey="criticality" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]} 
                        barSize={24}
                        animationDuration={1500}
                      >
                         {siteChartData.map((entry, index) => (
                           <Cell 
                             key={`cell-${index}`} 
                             fillOpacity={1 - (index * 0.08)} 
                             fill="#3b82f6"
                           />
                         ))}
                      </Bar>
                      {/* Line represents the Trend of criticality */}
                      <Line 
                        type="monotone" 
                        dataKey="criticality" 
                        stroke="#0f172a" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#0f172a', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                        animationDuration={2000}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-800 text-[10px] font-black uppercase tracking-[0.5em]">
                    Empty Dataset
                  </div>
                )}
              </div>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] text-center mt-4">Weighted by Incident Severity</p>
          </div>
        </div>
      )}

      {/* MENU BUTTONS */}
      <div className="flex flex-col gap-6 pt-6">
          <button
            onClick={() => onNavigate('create')}
            className="group relative w-full h-40 flex items-center bg-blue-600/10 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden hover:bg-blue-600/20 transition-all hover:border-blue-500/40 active:scale-[0.98] duration-300 px-8"
          >
            <div className="w-24 h-24 bg-blue-600 rounded-[1.8rem] flex items-center justify-center shadow-[0_15px_30px_rgba(37,99,235,0.3)] group-hover:scale-105 transition-transform shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 4v16m8-8H4" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <div className="flex-1 text-left ml-10">
               <h3 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">Report Incident</h3>
               <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.5em] mt-2 opacity-80">Start New Capture</p>
            </div>
            <div className="text-blue-500/50 group-hover:text-blue-400 group-hover:translate-x-3 transition-all duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 5l7 7-7 7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
          </button>

          <button
            onClick={() => onNavigate('recent')}
            className="group relative w-full h-40 flex items-center bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden hover:bg-slate-900/60 transition-all hover:border-white/20 active:scale-[0.98] duration-300 px-8"
          >
            <div className="w-24 h-24 bg-slate-800 rounded-[1.8rem] flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform shrink-0 border border-white/5">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <div className="flex-1 text-left ml-10">
               <h3 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">Recent Logs</h3>
               <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2 opacity-80">View Historical Evidence</p>
            </div>
            <div className="text-slate-700 group-hover:text-slate-500 group-hover:translate-x-3 transition-all duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 5l7 7-7 7" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
          </button>
      </div>
    </div>
  );
};
