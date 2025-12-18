
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
  // Fix: Removed 'profile' from navigation options as it is handled as an overlay, fixing App.tsx type mismatch
  onNavigate: (view: 'create' | 'recent') => void;
  // Added appTheme to fix prop mismatch in App.tsx
  appTheme?: 'dark' | 'light';
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

// Fix: Using any for the tooltip props to bypass Recharts version-specific generic type mismatches for payload and label
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-2 rounded-lg shadow-2xl text-[9px] z-50">
        <p className="text-white font-black mb-0.5 uppercase tracking-wider">{label}</p>
        <div className="space-y-0.5">
          <p className="text-blue-400 font-bold flex justify-between gap-3">
            <span>RISK:</span>
            <span>{payload[0].value}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ baseId, onNavigate, appTheme = 'dark' }) => {
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
    const r = 42; // Increased radius from 30
    const strokeWidth = 12; // Increased stroke from 10
    const c = 2 * Math.PI * r;
    const openPercent = total > 0 ? openCount / total : 0;
    const openOffset = c * (1 - openPercent);
    
    return (
      <div className="relative h-48 w-48 sm:h-64 sm:w-64 mx-auto flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90 drop-shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          <circle 
            cx="50" cy="50" r={r} 
            fill="transparent" 
            stroke="#065f46" 
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
            <span className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tighter">{total}</span>
            <span className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Total Obs</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* PROACTIVE SAFETY TEXT - MOVED TO TOP */}
      <div className="px-4 sm:px-8 py-6 bg-white/[0.03] border border-white/10 rounded-[2rem] text-center backdrop-blur-md shadow-lg">
        <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-4xl mx-auto">
          HSE Guardian isn't just software; it's your proactive safety nerve center. 
          It’s a unified system that captures, manages, and analyzes all your safety observations, 
          near misses, and incident data in real-time. Move from reactive record-keeping to predictive insights, 
          and empower every employee to be a guardian of your safety culture.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Acquiring Data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* SAFETY STATUS MAP */}
          <div className="bg-white/[0.03] backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col items-center relative overflow-hidden min-h-[320px] sm:min-h-[400px] justify-center">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 absolute top-6">Safety Status Map</h3>
              <div className="flex-grow flex items-center justify-center">
                {renderSafetyStatusMap()}
              </div>
              <div className="flex justify-center gap-6 mt-4 absolute bottom-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Open</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-[#065f46] rounded-full"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Closed</span>
                </div>
              </div>
          </div>

          {/* DISTRIBUTION BY SITE */}
          <div className="bg-white/[0.03] backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col relative overflow-hidden min-h-[320px] sm:min-h-[400px]">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 text-center mt-2">Criticality By Site</h3>
              <div className="flex-1 w-full flex items-center justify-center">
                {siteChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="85%">
                    <ComposedChart data={siteChartData} margin={{ top: 5, right: 15, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#475569" 
                        fontSize={8} 
                        tick={{fill: '#64748b', fontWeight: '800'}}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                      <Bar 
                        dataKey="criticality" 
                        fill="#3b82f6" 
                        radius={[3, 3, 0, 0]} 
                        barSize={24}
                      >
                         {siteChartData.map((entry, index) => (
                           <Cell 
                             key={`cell-${index}`} 
                             fillOpacity={1 - (index * 0.08)} 
                             fill="#3b82f6"
                           />
                         ))}
                      </Bar>
                      <Line 
                        type="monotone" 
                        dataKey="criticality" 
                        stroke="#0f172a" 
                        strokeWidth={2} 
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-700 text-[9px] font-black uppercase tracking-widest">
                    No Data Available
                  </div>
                )}
              </div>
          </div>
        </div>
      )}

      {/* MENU CARD SECTION - Reduced heights for more compact UI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2">
          <button
            onClick={() => onNavigate('create')}
            className="group relative h-24 sm:h-28 flex items-center bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[2rem] overflow-hidden hover:bg-white/[0.08] transition-all hover:border-blue-500/30 active:scale-[0.98] duration-300 px-6 sm:px-8"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform shrink-0 border border-blue-400/30">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 4v16m8-8H4" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <div className="flex-1 text-left ml-4 sm:ml-6">
               <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">Report Incident</h3>
               <p className="text-[8px] sm:text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mt-1 opacity-80">Capture New Event</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('recent')}
            className="group relative h-24 sm:h-28 flex items-center bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[2rem] overflow-hidden hover:bg-white/[0.08] transition-all active:scale-[0.98] duration-300 px-6 sm:px-8"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform shrink-0 border border-white/10">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002 2" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
            </div>
            <div className="flex-1 text-left ml-4 sm:ml-6">
               <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">Recent Logs</h3>
               <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1 opacity-80">Review Evidence</p>
            </div>
          </button>
      </div>
    </div>
  );
};
