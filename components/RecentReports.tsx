
import React, { useEffect, useState, useMemo } from 'react';
import { FetchedObservation, UserProfile, FetchedIncident } from '../types';
import { ARCHIVE_ACCESS_KEY, INCIDENT_STATUS, getRiskLevel, SEVERITY_LEVELS, LIKELIHOOD_LEVELS } from '../constants';
import { useAppContext } from '../context/AppContext';

interface RecentReportsProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
  filterAssignee?: string; 
  onPrint: (incident: FetchedIncident) => void;
}

type Tab = 'open' | 'assigned' | 'incidents' | 'closed';

const PROFILE_KEY = 'hse_guardian_profile';

interface DataFieldProps {
  label: string;
  value?: any;
  icon?: React.ReactNode;
  isLight?: boolean;
}

const DataField: React.FC<DataFieldProps> = ({ label, value, icon, isLight }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5">
      {icon && <span className="opacity-50">{icon}</span>}
      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
    </div>
    <div className={`text-[11px] font-bold leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {value === null || value === undefined ? '—' : 
       typeof value === 'object' ? JSON.stringify(value) : String(value)}
    </div>
  </div>
);

export const RecentReports: React.FC<RecentReportsProps> = ({ baseId, onBack, appTheme = 'dark', filterAssignee, onPrint }) => {
  const { state } = useAppContext();
  const { allReports, allIncidents, isLoading: loading } = state;
  
  const [activeTab, setActiveTab] = useState<Tab>(filterAssignee ? 'assigned' : 'incidents');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isArchiveUnlocked, setIsArchiveUnlocked] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [showRawMetadata, setShowRawMetadata] = useState<Record<string, boolean>>({});

  const isLight = appTheme === 'light';
  const isMyTasksMode = !!filterAssignee;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleUnlockArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKey === ARCHIVE_ACCESS_KEY) {
      setIsArchiveUnlocked(true);
      setAccessKey('');
    } else {
      setUnlockError(true);
      setTimeout(() => setUnlockError(false), 2000);
    }
  };

  const handleRowClick = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const toggleRawMetadata = (id: string) => {
    setShowRawMetadata(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tabFilteredReports = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    
    if (activeTab === 'incidents') {
      return allIncidents.filter(inc => {
        const title = String(inc.fields["Title"] || "").toLowerCase();
        const desc = String(inc.fields["Description"] || "").toLowerCase();
        return !query || title.includes(query) || desc.includes(query);
      });
    }
    
    return allReports.filter(report => {
      const actionTaken = String(report.fields["Action taken"] || "").trim();
      const isClosed = actionTaken.length > 0;
      const assignedTo = String(report.fields["Assigned To"] || "").trim();
      
      const obsText = String(report.fields["Observation"] || "").toLowerCase();
      const nameText = String(report.fields["Name"] || "").toLowerCase();
      const matchesSearch = !query || obsText.includes(query) || nameText.includes(query);
      
      const matchesAssignee = !filterAssignee || assignedTo === filterAssignee;

      if (activeTab === 'closed') return isClosed && matchesSearch && matchesAssignee;
      if (activeTab === 'assigned') return !isClosed && assignedTo && matchesSearch && matchesAssignee;
      return !isClosed && !assignedTo && matchesSearch && matchesAssignee;
    });
  }, [allReports, allIncidents, activeTab, searchTerm, filterAssignee]);

  return (
    <div className="animate-in slide-in-from-right duration-300 pb-24 max-w-7xl mx-auto">
      <div className="relative z-10 px-2 lg:px-0">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={onBack} className={`mr-4 transition-all p-2 rounded-xl hover:bg-white/5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h2 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{isMyTasksMode ? 'Personal Tasks' : 'System Grid'}</h2>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Real-time Safety Ledger</p>
            </div>
          </div>
          
          <div className="relative group max-w-xs w-full hidden sm:block">
            <input 
              type="text" 
              placeholder="Search grid..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-3 rounded-2xl border text-xs font-bold pl-10 outline-none transition-all ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-white/5 border-white/10 focus:border-blue-500 text-white'}`}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>

        {!isMyTasksMode && (
          <div className={`flex p-1 mb-8 rounded-2xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'} max-w-2xl`}>
              {(['incidents', 'open', 'assigned', 'closed'] as const).map(t => (
                <button key={t} onClick={() => { setActiveTab(t); setExpandedId(null); }} className={`flex-1 py-3 text-[9px] uppercase font-black rounded-xl transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {t}
                </button>
              ))}
          </div>
        )}

        {activeTab === 'closed' && !isArchiveUnlocked && (
          <div className={`mb-8 p-8 rounded-[2rem] border text-center space-y-6 ${isLight ? 'bg-blue-50 border-blue-100' : 'bg-blue-600/5 border-blue-500/20'}`}>
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="max-w-xs mx-auto space-y-4">
              <h3 className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Archive Encryption Active</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">Enter security clearance key to access resolved records.</p>
              <form onSubmit={handleUnlockArchive} className="flex gap-2">
                <input 
                  type="password" 
                  value={accessKey}
                  onChange={e => setAccessKey(e.target.value)}
                  placeholder="Clearance Key" 
                  className={`flex-1 p-3 rounded-xl border text-xs font-bold outline-none ${isLight ? 'bg-white' : 'bg-black/40 border-white/10 text-white'} ${unlockError ? 'border-rose-500' : ''}`}
                />
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-500 transition-all">Unlock</button>
              </form>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Synchronizing Registry...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(activeTab !== 'closed' || isArchiveUnlocked) && tabFilteredReports.map((report) => {
              const isIncident = 'fields' in report && 'Title' in report.fields;
              const fields = report.fields as any;
              const status = isIncident ? (fields["Status"] || 'Pending Review') : 'Observation';
              const riskScore = isIncident ? (Number(fields["Severity"] || 1) * Number(fields["Likelihood"] || 1)) : 0;
              const riskInfo = getRiskLevel(riskScore);
              
              return (
                <div key={report.id} className={`rounded-[2rem] border overflow-hidden transition-all duration-300 ${expandedId === report.id ? (isLight ? 'bg-white border-blue-500 shadow-2xl scale-[1.01]' : 'bg-white/5 border-blue-500/50 shadow-2xl scale-[1.01]') : (isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-white/[0.02] border-white/5 hover:border-white/20')}`}>
                  <div onClick={() => handleRowClick(report.id)} className="flex items-center gap-5 p-6 cursor-pointer group">
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${isIncident ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                             {isIncident ? 'Incident' : 'Observation'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{report.id}</span>
                       </div>
                       <div className={`text-sm font-black truncate group-hover:text-blue-500 transition-colors ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {isIncident ? fields["Title"] : fields["Observation"]}
                       </div>
                    </div>
                    {isIncident && (
                      <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${riskInfo.color} text-white hidden sm:block`}>
                        RISK: {riskScore}
                      </div>
                    )}
                    <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${status === INCIDENT_STATUS.CLOSED ? 'bg-emerald-600' : (isIncident ? 'bg-amber-600' : 'bg-slate-600')} text-white`}>
                      {status}
                    </div>
                  </div>

                  {expandedId === report.id && (
                    <div className="p-8 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-500 space-y-10">
                       
                       {isIncident ? (
                         <>
                           <WorkflowTimeline status={fields["Status"]} isLight={isLight} />
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6 rounded-[2rem] bg-black/20 border border-white/5">
                             <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Operational Identity</h4>
                               <DataField label="Category" value={fields["Category"]} isLight={isLight} />
                               <DataField label="Site / Project" value={fields["Site / Project"]} isLight={isLight} />
                               <DataField label="Department" value={fields["Department"]} isLight={isLight} />
                               <DataField label="Precise Coordinates" value={fields["Location"]} isLight={isLight} />
                             </div>
                             <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Personnel & Assets</h4>
                               <DataField label="Reporter Name" value={fields["Reporter ID"]} isLight={isLight} />
                               <DataField label="Involved Parties" value={fields["Persons Involved"]} isLight={isLight} />
                               <DataField label="Equipment Involved" value={fields["Equipment Involved"]} isLight={isLight} />
                               <DataField label="Direct Witnesses" value={fields["Witnesses"]} isLight={isLight} />
                             </div>
                             <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Critical Analysis</h4>
                               <div className="flex gap-4">
                                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex-1">
                                    <span className="block text-[7px] font-black text-slate-500 uppercase mb-1">Severity</span>
                                    <span className="text-xs font-black text-white">{SEVERITY_LEVELS[fields["Severity"] || 1]}</span>
                                  </div>
                                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex-1">
                                    <span className="block text-[7px] font-black text-slate-500 uppercase mb-1">Likelihood</span>
                                    <span className="text-xs font-black text-white">{LIKELIHOOD_LEVELS[fields["Likelihood"] || 1]}</span>
                                  </div>
                               </div>
                               <DataField label="Root Cause Analysis" value={fields["Root Cause"]} isLight={isLight} />
                               <DataField label="Recommended Controls" value={fields["Recommended Controls"]} isLight={isLight} />
                             </div>
                           </div>

                           <div>
                              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] px-1 mb-4">Event Chronology</h4>
                              <div className={`p-6 rounded-[2rem] border text-sm font-medium leading-relaxed ${isLight ? 'bg-slate-50 text-slate-700' : 'bg-white/5 text-slate-300 border-white/5'}`}>
                                {fields["Description"]}
                              </div>
                           </div>

                           <div className="mt-8">
                             <button 
                               onClick={() => toggleRawMetadata(report.id)}
                               className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white/5 text-slate-400 border-white/5'}`}
                             >
                               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${showRawMetadata[report.id] ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                               {showRawMetadata[report.id] ? 'Hide Metadata Audit' : 'Show Metadata Audit'}
                             </button>
                             {showRawMetadata[report.id] && (
                               <div className={`mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6 rounded-[2rem] border animate-in slide-in-from-top-2 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                 {Object.entries(fields).map(([key, val]) => (
                                   <DataField key={key} label={key} value={val} isLight={isLight} />
                                 ))}
                               </div>
                             )}
                           </div>

                           <div className="flex justify-end gap-4 items-center">
                            <button
                              onClick={() => onPrint(report as FetchedIncident)}
                              className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/5 text-slate-300 border-white/10'
                              }`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                              Export Audit Document
                            </button>
                          </div>
                         </>
                       ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Observation Data</h4>
                               <DataField label="Observation Type" value={fields["Observation Type"]} isLight={isLight} />
                               <DataField label="Site Location" value={fields["Site / Location"]} isLight={isLight} />
                               <DataField label="Observer" value={fields["Name"]} isLight={isLight} />
                               <DataField label="Assigned To" value={fields["Assigned To"]} isLight={isLight} />
                               <div className="pt-4">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Finding Description</label>
                                  <p className={`text-sm font-bold leading-relaxed ${isLight ? 'text-slate-800' : 'text-white'}`}>{fields["Observation"]}</p>
                               </div>
                            </div>
                            <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Remediation Status</h4>
                               <DataField label="Action Taken" value={fields["Action taken"]} isLight={isLight} />
                               <DataField label="Closed By" value={fields["Closed by"]} isLight={isLight} />
                               <DataField label="Root Cause" value={fields["Root Cause"]} isLight={isLight} />
                               
                               <button 
                                 onClick={() => toggleRawMetadata(report.id)}
                                 className={`mt-4 text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity`}
                               >
                                 {showRawMetadata[report.id] ? '[-] Hide Full Registry' : '[+] View Full Registry'}
                               </button>
                            </div>
                            {showRawMetadata[report.id] && (
                              <div className={`md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-[2rem] border animate-in slide-in-from-top-2 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                {Object.entries(fields).map(([key, val]) => (
                                  <DataField key={key} label={key} value={val} isLight={isLight} />
                                ))}
                              </div>
                            )}
                         </div>
                       )}

                       <div className="space-y-8 pt-8 border-t border-white/5">
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                             Photographic Evidence Repository
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4">Initial Acquisition (Detection)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                   {(isIncident ? fields.Attachments : fields["Open observations"])?.map((att: any, i: number) => (
                                     <a href={att.url} target="_blank" rel="noopener noreferrer" key={i} className="group/img aspect-video rounded-2xl overflow-hidden border-2 border-white/5 shadow-xl transition-all hover:border-blue-500/50">
                                        <img src={att.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="evidence" />
                                     </a>
                                   ))}
                                </div>
                             </div>
                             <div>
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Verification Acquisition (Resolution)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                   {(isIncident ? fields["Verification Photos"] : fields["Closed observations"])?.map((att: any, i: number) => (
                                     <a href={att.url} target="_blank" rel="noopener noreferrer" key={i} className="group/img aspect-video rounded-2xl overflow-hidden border-2 border-white/5 shadow-xl transition-all hover:border-blue-500/50">
                                        <img src={att.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="resolution" />
                                     </a>
                                   ))}
                                   {!(isIncident ? fields["Verification Photos"] : fields["Closed observations"])?.length && (
                                     <div className="aspect-video rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center opacity-20 bg-white/5">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                     </div>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              );
          })}
        </div>
      )}
    </div>
  );
};

const WorkflowTimeline: React.FC<{status: FetchedIncident['fields']['Status'], isLight: boolean}> = ({ status, isLight }) => {
  const steps = [INCIDENT_STATUS.PENDING_REVIEW, INCIDENT_STATUS.ACTION_PENDING, INCIDENT_STATUS.VERIFICATION_PENDING, INCIDENT_STATUS.CLOSED];
  const currentIndex = steps.indexOf(status);

  return (
    <div className={`flex items-center justify-between p-6 rounded-[2rem] border ${isLight ? 'bg-slate-50 border-slate-200 shadow-inner' : 'bg-black/40 border-white/5'}`}>
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-3 text-center min-w-[80px]">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
              i <= currentIndex ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : (isLight ? 'bg-white border-slate-200 text-slate-300' : 'bg-slate-800 border-slate-700 text-slate-600')
            }`}>
              {i < currentIndex ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <span className="text-xs font-black">{i + 1}</span>
              )}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest max-w-[70px] ${i <= currentIndex ? (isLight ? 'text-blue-600' : 'text-blue-400') : 'text-slate-500'}`}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-1.5 rounded-full mx-2 transition-all duration-1000 ${i < currentIndex ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : (isLight ? 'bg-slate-200' : 'bg-slate-800')}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
