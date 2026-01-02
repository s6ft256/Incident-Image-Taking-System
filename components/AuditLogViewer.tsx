
import React, { useState, useEffect, useMemo } from 'react';
import { AuditEntry, UserProfile, AuditChange, FetchedObservation, FetchedIncident } from '../types';
import { STORAGE_KEYS } from '../constants';
import { getAllReports, getAllIncidents } from '../services/airtableService';

interface AuditLogViewerProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

const EVENT_TYPES = ['Create', 'Update', 'Delete', 'Submit', 'Approve', 'Reject', 'Upload Evidence', 'Status Change'];
const ACTION_CATEGORIES = ['Data Entry', 'Approval', 'Review', 'System Action'];
const MODULE_OPTIONS = ['Risk Assessment', 'Compliance', 'Incident', 'Inspection', 'Other'] as const;

const BG_IMAGE = 'https://images.unsplash.com/photo-1551288049-bbbda536339a?auto=format&fit=crop&q=80&w=2000';

interface SearchableRecord {
  id: string;
  module: typeof MODULE_OPTIONS[number];
  summary: string;
  timestamp: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ appTheme, onBack }) => {
  const isLight = appTheme === 'light';
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Linkage Directory States
  const [recordDirectory, setRecordDirectory] = useState<SearchableRecord[]>([]);
  const [isSearchingRecords, setIsSearchingRecords] = useState(false);
  const [recordSearchQuery, setRecordSearchQuery] = useState('');
  const [showRecordDropdown, setShowRecordDropdown] = useState(false);

  const [logs, setLogs] = useState<AuditEntry[]>([
    {
      id: 'AUD-8821-XP',
      timestamp: new Date().toISOString(),
      user: 'Elius Niwamanya',
      userRole: 'Senior Safety Systems Architect',
      department: 'HSE Operations',
      ipAddress: '192.168.1.XX (Masked)',
      deviceBrowser: 'Chrome 125 / Mobile Safari (iOS)',
      action: 'Status Change',
      module: 'Compliance',
      relatedRecordId: 'REG-9021',
      actionCategory: 'Approval',
      source: 'Mobile',
      actionSummary: 'Compliance status changed from Partial to Compliant',
      detailedDescription: 'Regulatory review completed for ISO 45001 - 8.1.2. Evidence verified by site manager.',
      changes: [
        { fieldName: 'Compliance Status', previousValue: 'Partially Compliant', newValue: 'Compliant' },
        { fieldName: 'Review Date', previousValue: '2025-05-01', newValue: '2025-05-24' }
      ],
      evidence: {
        type: 'Certificate',
        refId: 'CERT-AX-99',
        filename: 'iso_compliance_cert_2025.pdf',
        url: '#'
      },
      reasonForChange: 'Final audit evidence received and validated through secondary channel.',
      approvedBy: 'Admin (System verified)',
      hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      previousHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      tamperStatus: 'Valid',
      auditStatus: 'Active',
      reviewedBy: 'Safety Auditor 01',
      reviewDate: '2025-05-24',
      reviewNotes: 'Standard operating procedure followed. No anomalies detected in transition.'
    }
  ]);

  // Create Form State
  const [newLog, setNewLog] = useState<Partial<AuditEntry>>({
    action: 'Create',
    actionCategory: 'Data Entry',
    module: 'Other',
    source: 'Web',
    actionSummary: '',
    detailedDescription: '',
    relatedRecordId: '',
    reasonForChange: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        const profile = JSON.parse(saved);
        setCurrentUser(profile);
      } catch (e) {}
    }
    // Perform Grid discovery for related records
    fetchGridRecords();
  }, []);

  const fetchGridRecords = async () => {
    setIsSearchingRecords(true);
    try {
      const [observations, incidents] = await Promise.all([
        getAllReports(),
        getAllIncidents()
      ]);

      const mappedObservations: SearchableRecord[] = observations.map(o => ({
        id: o.id,
        module: 'Inspection',
        summary: `${o.fields["Observation Type"] || 'Hazard'}: ${o.fields["Observation"]?.substring(0, 40)}...`,
        timestamp: o.createdTime
      }));

      const mappedIncidents: SearchableRecord[] = incidents.map(i => ({
        id: i.id,
        module: 'Incident',
        summary: `INCIDENT: ${i.fields["Title"]}`,
        timestamp: i.createdTime
      }));

      setRecordDirectory([...mappedIncidents, ...mappedObservations].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (e) {
      console.warn("Grid discovery failed", e);
    } finally {
      setIsSearchingRecords(false);
    }
  };

  const filteredGridRecords = useMemo(() => {
    if (!recordSearchQuery.trim()) return recordDirectory.slice(0, 10);
    return recordDirectory.filter(r => 
      r.id.toLowerCase().includes(recordSearchQuery.toLowerCase()) ||
      r.summary.toLowerCase().includes(recordSearchQuery.toLowerCase())
    );
  }, [recordDirectory, recordSearchQuery]);

  const selectRecordLink = (record: SearchableRecord) => {
    setNewLog(prev => ({ 
      ...prev, 
      relatedRecordId: record.id, 
      module: record.module as any,
      actionSummary: `Audit review of ${record.module} Record ${record.id}`
    }));
    setRecordSearchQuery(record.id);
    setShowRecordDropdown(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.actionSummary || !newLog.reasonForChange) {
      alert("Summary and Reason for Change are mandatory.");
      return;
    }

    const createdEntry: AuditEntry = {
      ...newLog as any,
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}-MN`,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'System User',
      userRole: currentUser?.role || 'Guest',
      department: currentUser?.site || 'Global Hub',
      ipAddress: '127.0.0.XX (Logged)',
      deviceBrowser: navigator.userAgent.split(') ')[0] + ')',
      hash: `sha256:${crypto.randomUUID().replace(/-/g, '')}`,
      previousHash: logs[0]?.hash || '0'.repeat(64),
      tamperStatus: 'Valid',
      auditStatus: 'Active'
    };

    setLogs([createdEntry, ...logs]);
    setIsCreating(false);
    setNewLog({
      action: 'Create',
      actionCategory: 'Data Entry',
      module: 'Other',
      source: 'Web',
      actionSummary: '',
      detailedDescription: '',
      relatedRecordId: '',
      reasonForChange: ''
    });
    setRecordSearchQuery('');
  };

  const selectedLog = logs.find(l => l.id === selectedAuditId);

  const SectionHeader = ({ num, title }: { num: string; title: string }) => (
    <div className="flex items-center gap-4 mb-6 mt-10 first:mt-0">
      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white font-black text-sm shadow-lg border border-white/10 shrink-0">
        {num}
      </div>
      <h3 className={`text-lg font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>
        {title}
      </h3>
    </div>
  );

  const FormField = ({ label, value, auto = true }: { label: string; value: string; auto?: boolean }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
        {label} {auto && <span className="text-blue-500 font-bold ml-1">(AUTO)</span>}
      </label>
      <div className={`p-4 rounded-xl border font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-black/20 border-white/5 text-slate-300'}`}>
        {value || 'N/A'}
      </div>
    </div>
  );

  if (isCreating) {
    return (
      <div className="animate-in slide-in-from-right duration-500 pb-32 max-w-5xl mx-auto relative">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-5 sm:opacity-10">
          <img src={BG_IMAGE} className="w-full h-full object-cover rounded-[3rem]" alt="Management Background" />
          <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white via-white/80 to-white' : 'from-[#020617] via-transparent to-[#020617]'}`}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button onClick={() => setIsCreating(false)} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="flex flex-col">
                <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Log Audit Event</h2>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 text-left">Manual Override Protocol</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className={`p-8 sm:p-12 rounded-[3rem] border shadow-2xl relative overflow-hidden backdrop-blur-[2px] ${
            isLight ? 'bg-white/90 border-slate-200' : 'bg-white/[0.02] border-white/10'
          }`}>
            <SectionHeader num="1" title="Event Classification" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Event Type</label>
                <select 
                  value={newLog.action} 
                  onChange={e => setNewLog({...newLog, action: e.target.value})}
                  className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}
                >
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Action Category</label>
                <select 
                  value={newLog.actionCategory} 
                  onChange={e => setNewLog({...newLog, actionCategory: e.target.value as any})}
                  className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}
                >
                  {ACTION_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Record Type (Module)</label>
                <select 
                  value={newLog.module} 
                  onChange={e => setNewLog({...newLog, module: e.target.value as any})}
                  className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}
                >
                  {MODULE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <SectionHeader num="2" title="Action Description" />
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Action Summary *</label>
                <input 
                  type="text"
                  placeholder="Briefly summarize the activity..."
                  value={newLog.actionSummary}
                  onChange={e => setNewLog({...newLog, actionSummary: e.target.value})}
                  className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Detailed Description (Optional)</label>
                <textarea 
                  rows={4} 
                  value={newLog.detailedDescription}
                  onChange={e => setNewLog({...newLog, detailedDescription: e.target.value})}
                  placeholder="Log granular details for auditor review..."
                  className={`p-4 rounded-xl border outline-none font-bold text-xs resize-none ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}
                />
              </div>
            </div>

            <SectionHeader num="3" title="Justification & Linkage" />
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest px-1">Related Record ID (Search Directory)</label>
                <div className="relative group">
                  <input 
                    type="text"
                    value={recordSearchQuery}
                    onFocus={() => setShowRecordDropdown(true)}
                    onChange={e => { setRecordSearchQuery(e.target.value); setShowRecordDropdown(true); }}
                    placeholder="Search by ID or Description..."
                    className={`w-full p-4 rounded-xl border outline-none transition-all font-bold text-xs pl-12 ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/20 border-white/5 focus:border-blue-500 text-white'}`}
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  
                  {isSearchingRecords && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                       <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  )}

                  {showRecordDropdown && (
                    <div className={`absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl border shadow-2xl z-[100] animate-in slide-in-from-top-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                      <div className="p-3 border-b border-white/5 bg-blue-600/5">
                         <span className="text-[8px] font-black uppercase text-blue-500 tracking-[0.2em]">Safety Grid Linkage Directory</span>
                      </div>
                      {filteredGridRecords.length === 0 ? (
                        <div className="p-6 text-center opacity-40 text-[9px] font-black uppercase">No records found matching query</div>
                      ) : (
                        filteredGridRecords.map(r => (
                          <button 
                            key={r.id} 
                            type="button"
                            onClick={() => selectRecordLink(r)}
                            className={`w-full flex flex-col p-4 text-left border-b border-white/5 transition-all ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
                          >
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-[10px] font-mono font-black text-blue-500 uppercase">{r.id}</span>
                               <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${r.module === 'Incident' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>{r.module}</span>
                            </div>
                            <p className={`text-[10px] font-bold line-clamp-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{r.summary}</p>
                          </button>
                        ))
                      )}
                      <div className="p-3 bg-black/10 text-center">
                         <button onClick={() => setShowRecordDropdown(false)} className="text-[8px] font-black uppercase text-slate-500 hover:text-blue-500 transition-colors">Close Linkage Terminal</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">Reason for Manual Change *</label>
                <textarea 
                  rows={3} 
                  value={newLog.reasonForChange}
                  onChange={e => setNewLog({...newLog, reasonForChange: e.target.value})}
                  placeholder="Explain why this record is being created manually..."
                  className={`p-4 rounded-xl border-2 border-rose-500/20 outline-none font-bold text-xs resize-none ${isLight ? 'bg-slate-50' : 'bg-black/20 text-white'}`}
                />
              </div>
            </div>

            <div className="mt-12 p-8 rounded-[2rem] border-2 bg-blue-600/5 border-blue-500/10 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Identity Authorization: {currentUser?.name || 'Guest Access'}</p>
              <button 
                type="submit"
                className="w-full sm:w-auto px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/30"
              >
                Commit to Activity Ledger
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!selectedAuditId) {
    return (
      <div className="animate-in slide-in-from-right duration-500 pb-20 max-w-5xl mx-auto relative">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-5 sm:opacity-10">
          <img src={BG_IMAGE} className="w-full h-full object-cover rounded-[3rem]" alt="Audit History Background" />
          <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white via-white/80 to-white' : 'from-[#020617] via-transparent to-[#020617]'}`}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <button onClick={onBack} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="flex flex-col">
                <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Activity Ledger</h2>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1 text-left">Immutable System History</span>
              </div>
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl hover:bg-blue-500 transition-all active:scale-90 border border-blue-400/20 group"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:rotate-90 transition-transform"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>

          <div className={`rounded-[2.5rem] border overflow-hidden shadow-2xl backdrop-blur-[2px] ${isLight ? 'bg-white/90 border-slate-200' : 'bg-[#0f172a]/90 border-white/10'}`}>
            <div className={`grid grid-cols-[120px_1fr_120px_150px_60px] gap-4 p-5 border-b text-[8px] font-black uppercase tracking-widest text-slate-500 ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
               <span>Audit ID</span>
               <span>Summary</span>
               <span>Personnel</span>
               <span>Timestamp (UTC)</span>
               <span className="text-center">View</span>
            </div>
            <div className="divide-y divide-white/5">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  onClick={() => setSelectedAuditId(log.id)}
                  className={`grid grid-cols-[120px_1fr_120px_150px_60px] p-5 items-center gap-4 transition-all cursor-pointer ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}
                >
                   <span className="text-[10px] font-mono font-black text-blue-500">{log.id}</span>
                   <span className={`text-[10px] font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{log.actionSummary || log.action}</span>
                   <span className="text-[10px] text-slate-500 truncate">{log.user}</span>
                   <span className="text-[10px] font-mono text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                   <div className="flex justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-500"><path d="m9 18 6-6-6-6"/></svg>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-32 max-w-5xl mx-auto relative">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5 sm:opacity-10">
        <img src={BG_IMAGE} className="w-full h-full object-cover rounded-[3rem]" alt="Audit History Background" />
        <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white via-white/80 to-white' : 'from-[#020617] via-transparent to-[#020617]'}`}></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={() => setSelectedAuditId(null)} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="flex flex-col">
              <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Audit Trail Record</h2>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 text-left">Internal Verification Document</span>
            </div>
          </div>
        </div>

        <div className={`p-8 sm:p-12 rounded-[3rem] border shadow-2xl relative overflow-hidden backdrop-blur-[2px] ${
          isLight ? 'bg-white/90 border-slate-200' : 'bg-white/[0.02] border-white/10'
        }`}>
          
          <div className="text-center mb-12 border-b border-white/5 pb-10">
            <h1 className={`text-4xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Audit Trail Record
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">
              System-generated and manual log of actions, changes, and approvals.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-10">
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Audit Trail ID</span>
                <span className="text-[10px] font-mono font-black text-blue-500">{selectedLog?.id}</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Record Type</span>
                <span className="text-[10px] font-black text-slate-400">{selectedLog?.module}</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Related Record ID</span>
                <span className="text-[10px] font-mono font-black text-slate-400">{selectedLog?.relatedRecordId}</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Date & Time (UTC)</span>
                <span className="text-[10px] font-black text-slate-400">{selectedLog?.timestamp}</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Logged By</span>
                <span className="text-[10px] font-black text-slate-400 truncate px-1">{selectedLog?.user || 'System'}</span>
              </div>
            </div>
          </div>

          <SectionHeader num="2" title="Event Classification" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField label="Event Type" value={selectedLog?.action || ''} auto={false} />
            <FormField label="Action Category" value={selectedLog?.actionCategory || ''} auto={false} />
            <FormField label="Source" value={selectedLog?.source || ''} auto={false} />
          </div>

          <SectionHeader num="3" title="User & Access Context" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <FormField label="User Name" value={selectedLog?.user || ''} />
            <FormField label="User Role" value={selectedLog?.userRole || ''} />
            <FormField label="Department" value={selectedLog?.department || ''} />
            <FormField label="IP Address" value={selectedLog?.ipAddress || ''} />
            <FormField label="Device / Browser" value={selectedLog?.deviceBrowser || ''} />
          </div>

          <SectionHeader num="4" title="Change Details" />
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20 mb-10">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b border-white/5 ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
                  <th className="p-4 text-[8px] font-black uppercase text-slate-500 tracking-widest">Field Name</th>
                  <th className="p-4 text-[8px] font-black uppercase text-slate-500 tracking-widest">Previous Value</th>
                  <th className="p-4 text-[8px] font-black uppercase text-slate-500 tracking-widest">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {selectedLog?.changes && selectedLog.changes.length > 0 ? (
                  selectedLog.changes.map((change, i) => (
                    <tr key={i}>
                      <td className="p-4 text-[10px] font-black text-slate-400">{change.fieldName}</td>
                      <td className="p-4 text-[10px] font-bold text-rose-500">{change.previousValue}</td>
                      <td className="p-4 text-[10px] font-bold text-emerald-500">{change.newValue}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                      No field modifications recorded for this event
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <SectionHeader num="5" title="Action Description" />
          <div className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Action Summary (AUTO)</label>
              <div className={`p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 font-black text-xs text-blue-400`}>
                {selectedLog?.actionSummary || 'Event processing complete.'}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Detailed Description</label>
              <textarea 
                readOnly 
                rows={3} 
                value={selectedLog?.detailedDescription || ''}
                className={`p-4 rounded-xl border outline-none font-bold text-xs resize-none ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}
              />
            </div>
          </div>

          {selectedLog?.evidence && (
            <>
              <SectionHeader num="6" title="Linked Evidence" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField label="Evidence Type" value={selectedLog.evidence.type} auto={false} />
                <FormField label="Evidence Ref ID" value={selectedLog.evidence.refId} auto={false} />
                <FormField label="File Name" value={selectedLog.evidence.filename} auto={false} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">View / Download</label>
                  <button className="flex items-center justify-center gap-2 p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black text-[9px] uppercase tracking-widest hover:bg-blue-600/20 transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Access Evidence
                  </button>
                </div>
              </div>
            </>
          )}

          <SectionHeader num="7" title="Reason / Justification" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest px-1">Reason for Change *</label>
              <p className="text-[11px] font-bold text-slate-300 italic">"{selectedLog?.reasonForChange}"</p>
            </div>
            <FormField label="Approved By" value={selectedLog?.approvedBy || ''} auto={false} />
          </div>

          <SectionHeader num="8" title="Integrity & Security Controls" />
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Record Hash / Checksum (AUTO)</label>
              <div className={`p-3 rounded-xl border border-white/5 bg-black/40 font-mono text-[9px] text-slate-500 break-all`}>
                {selectedLog?.hash}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Previous Hash (CHAIN)</label>
                <div className={`p-3 rounded-xl border border-white/5 bg-black/40 font-mono text-[9px] text-slate-500 break-all`}>
                  {selectedLog?.previousHash}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Tamper Status</label>
                <div className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest ${selectedLog?.tamperStatus === 'Valid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${selectedLog?.tamperStatus === 'Valid' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
                  Security Check: {selectedLog?.tamperStatus}
                </div>
              </div>
            </div>
          </div>

          <div className={`fixed bottom-0 left-0 right-0 p-6 flex justify-center items-center z-[50] ${isLight ? 'bg-white/80 border-t border-slate-200' : 'bg-[#020617]/80 border-t border-white/5'} backdrop-blur-2xl`}>
             <div className="max-w-4xl w-full flex gap-3">
                <button onClick={() => alert("Redirecting to related record terminal...")} className="flex-1 py-4 rounded-2xl bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center justify-center gap-2">👁️ View Related Record</button>
                <button onClick={() => setSelectedAuditId(null)} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/20">❌ Close Terminal</button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
