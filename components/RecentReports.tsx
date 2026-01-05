
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FetchedObservation, UploadedImage, UserProfile, FetchedIncident } from '../types';
import { getAllReports, updateObservationAction, assignObservation, getAllIncidents } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { getAllProfiles } from '../services/profileService';
import { ImageGrid } from './ImageGrid';
import { OBSERVATION_TYPES, MAX_IMAGES } from '../constants';

interface RecentReportsProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
  filterAssignee?: string; 
}

type Tab = 'open' | 'assigned' | 'incidents' | 'closed';

const AUTHORIZED_ADMIN_ROLES = ['technician', 'engineer', 'site supervisor', 'safety officer'];
const PROFILE_KEY = 'hse_guardian_profile';
const OPEN_TAB_BG = 'https://i.pinimg.com/736x/dc/1b/16/dc1b165f2032d49a7559a0d9df666a4e.jpg';
const ASSIGNED_TAB_BG = 'https://i.pinimg.com/1200x/e5/c2/35/e5c235f049cd3468d9e5346f6194e431.jpg';
const INCIDENT_TAB_BG = 'https://i.pinimg.com/1200x/d7/c6/a9/d7c6a95b5b86b28ecd15ff4bb2c1b8eb.jpg';

export const RecentReports: React.FC<RecentReportsProps> = ({ baseId, onBack, appTheme = 'dark', filterAssignee }) => {
  const [allReports, setAllReports] = useState<FetchedObservation[]>([]);
  const [allIncidents, setAllIncidents] = useState<FetchedIncident[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  
  const [isArchiveUnlocked, setIsArchiveUnlocked] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutMessage, setLockoutMessage] = useState('');

  const isLight = appTheme === 'light';
  const isMyTasksMode = !!filterAssignee;

  const baseClasses = `w-full rounded-xl border px-4 py-3 outline-none transition-all duration-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500`;
  const themeClasses = isLight 
    ? `bg-white text-slate-900 border-slate-300 placeholder:text-slate-400` 
    : `bg-slate-900/40 text-slate-100 border-slate-700 placeholder:text-slate-600`;

  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});
  const [closingImages, setClosingImages] = useState<Record<string, UploadedImage[]>>({});
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set<string>());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveErrors, setResolveErrors] = useState<Record<string, string>>({});
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [localAssignee, setLocalAssignee] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [reportsData, incidentsData] = await Promise.all([
        getAllReports({ baseId }),
        getAllIncidents({ baseId })
      ]);
      setAllReports(reportsData);
      setAllIncidents(incidentsData);
    } catch (err: any) {
      setError(err.message || "Failed to load reports from safety database");
    } finally {
      setLoading(false);
    }
  }, [baseId]);

  useEffect(() => {
    fetchData();
    fetchTeam();
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try { setUserProfile(JSON.parse(saved)); } catch (e) {}
    }
  }, [fetchData]);

  const fetchTeam = async () => {
    try {
      const profiles = await getAllProfiles();
      const names = Array.from(new Set(profiles.map(p => p.name))).sort();
      setTeamMembers(names);
    } catch (err) { console.error(err); }
  };

  const handleAssignToMember = async (reportId: string) => {
    const assignee = localAssignee[reportId];
    if (assignee === undefined) return;
    setReassigningId(reportId);
    try {
      await assignObservation(reportId, assignee, { baseId });
      setAllReports(prev => prev.map(r => r.id === reportId ? { ...r, fields: { ...r.fields, "Assigned To": assignee } } : r));
      setAssignmentSuccess("Assignment established.");
      setTimeout(() => setAssignmentSuccess(null), 3000);
    } catch (err: any) { setError(err.message); } finally { setReassigningId(null); }
  };

  const handleUnlockArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKey === 'AmxC@123@') {
      setIsArchiveUnlocked(true);
      setAccessKey('');
    } else {
      setUnlockError(true);
      setTimeout(() => setUnlockError(false), 2000);
    }
  };

  const handleRowClick = (id: string) => {
    const report = allReports.find(r => r.id === id) || allIncidents.find(i => i.id === id);
    if (!report) return;
    if ('fields' in report && !('Title' in report.fields) && !localAssignee[id]) {
      setLocalAssignee(prev => ({ ...prev, [id]: (report as FetchedObservation).fields["Assigned To"] || "" }));
    }
    setExpandedId(expandedId === id ? null : id);
  };

  const processClosingImageUpload = async (reportId: string, img: UploadedImage) => {
    const imageId = img.id;
    try {
      setClosingImages(prev => ({
        ...prev,
        [reportId]: (prev[reportId] || []).map(i => i.id === imageId ? { ...i, status: 'uploading', progress: 10 } : i)
      }));
      const compressed = await compressImage(img.file);
      const url = await uploadImageToStorage(compressed, 'closure_evidence');
      setClosingImages(prev => ({
        ...prev,
        [reportId]: (prev[reportId] || []).map(i => i.id === imageId ? { ...i, status: 'success', progress: 100, serverUrl: url } : i)
      }));
    } catch (err: any) {
      setClosingImages(prev => ({
        ...prev,
        [reportId]: (prev[reportId] || []).map(i => i.id === imageId ? { ...i, status: 'error', progress: 0, errorMessage: err.message } : i)
      }));
    }
  };

  const handleAddClosingFiles = useCallback((reportId: string, files: FileList) => {
    const currentImages = closingImages[reportId] || [];
    const remainingSlots = MAX_IMAGES - currentImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    const newImages: UploadedImage[] = filesToProcess.map(file => {
      const newImg: UploadedImage = {
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0
      };
      processClosingImageUpload(reportId, newImg);
      return newImg;
    });

    setClosingImages(prev => ({
      ...prev,
      [reportId]: [...(prev[reportId] || []), ...newImages]
    }));
  }, [closingImages]);

  const handleRemoveClosingImage = useCallback((reportId: string, imageId: string) => {
    setClosingImages(prev => ({
      ...prev,
      [reportId]: (prev[reportId] || []).filter(img => img.id !== imageId)
    }));
  }, []);

  const handleResolve = async (id: string) => {
    const report = allReports.find(r => r.id === id);
    if (!report) return;
    const actionTaken = actionInputs[id];
    if (!actionTaken?.trim()) {
        setResolveErrors(prev => ({...prev, [id]: "Remediation details required."}));
        return;
    }
    setSubmittingIds(prev => new Set(prev).add(id));
    try {
      const currentImages = closingImages[id] || [];
      const attachmentData = currentImages
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));

      await updateObservationAction(id, actionTaken, userProfile?.name || "System", attachmentData, { baseId });
      setAllReports(prev => prev.map(r => r.id === id ? {
        ...r,
        fields: { ...r.fields, "Action taken": actionTaken, "Closed by": userProfile?.name || "System", "Closed observations": attachmentData }
      } : r));
      setExpandedId(null);
      setAssignmentSuccess("Archived.");
      setTimeout(() => setAssignmentSuccess(null), 3000);
    } catch (err: any) { setResolveErrors(prev => ({...prev, [id]: err.message})); } finally {
      setSubmittingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const tabFilteredReports = useMemo(() => {
    if (activeTab === 'incidents') return allIncidents.filter(inc => !searchTerm || inc.fields["Title"].toLowerCase().includes(searchTerm.toLowerCase()));
    return allReports.filter(report => {
      const isClosed = (report.fields["Action taken"]?.trim() || "").length > 0;
      const assignedTo = report.fields["Assigned To"]?.trim() || "";
      const matchesSearch = !searchTerm || report.fields["Observation"]?.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeTab === 'closed') return isClosed && matchesSearch;
      if (activeTab === 'assigned') return !isClosed && assignedTo && matchesSearch;
      return !isClosed && !assignedTo && matchesSearch;
    });
  }, [allReports, allIncidents, activeTab, searchTerm]);

  const getSeverityStyles = (severity: number) => {
    if (severity >= 4) return 'bg-rose-600 text-white animate-pulse';
    if (severity === 3) return 'bg-amber-500 text-white';
    return 'bg-blue-500 text-white';
  };

  return (
    <div className="animate-in slide-in-from-right duration-300 pb-24 max-w-7xl mx-auto">
      {assignmentSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-4">
           {assignmentSuccess}
        </div>
      )}

      <div className="relative z-10 px-2 lg:px-0">
        <div className="flex items-center mb-8">
          <button onClick={onBack} className={`mr-4 transition-all p-2 rounded-xl hover:bg-white/5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h2 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{isMyTasksMode ? 'My Tasks' : 'Observation Log'}</h2>
        </div>

        {!isMyTasksMode && (
          <div className={`flex p-1 mb-8 rounded-2xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
              {['open', 'assigned', 'incidents', 'closed'].map(t => (
                <button key={t} onClick={() => { setActiveTab(t as Tab); setExpandedId(null); }} className={`flex-1 py-3 text-[10px] uppercase font-black rounded-xl transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                    {t}
                </button>
              ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input type="text" placeholder={`Search ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm ${isLight ? 'bg-white' : 'bg-white/5 border-white/10 text-white'}`} />
        </div>

        {activeTab === 'closed' && !isArchiveUnlocked && (
          <div className="flex flex-col items-center py-20 animate-in fade-in zoom-in">
             <h3 className={`text-2xl font-black mb-8 ${isLight ? 'text-slate-900' : 'text-white'}`}>Admin Restricted</h3>
             <form onSubmit={handleUnlockArchive} className="w-full max-w-sm space-y-5">
                <input type="password" placeholder="Key" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} className={`w-full p-5 rounded-2xl border outline-none text-center tracking-[0.5em] font-black ${isLight ? 'bg-white' : 'bg-slate-900 text-white'} ${unlockError ? 'border-rose-500' : ''}`} />
                <button type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px]">Verify identity</button>
             </form>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] font-black uppercase text-slate-400">Loading Grid...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {(activeTab !== 'closed' || isArchiveUnlocked) && tabFilteredReports.map((report) => {
                const isIncident = 'fields' in report && 'Title' in report.fields;
                return (
                  <div key={report.id} className={`rounded-[2rem] border overflow-hidden transition-all ${expandedId === report.id ? 'bg-white/5 border-blue-500/50 shadow-2xl scale-[1.01]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}>
                    <div onClick={() => handleRowClick(report.id)} className="flex items-center gap-5 p-6 cursor-pointer">
                      <div className="flex-1 text-sm font-black truncate">{isIncident ? (report as FetchedIncident).fields["Title"] : (report as FetchedObservation).fields["Observation Type"]}</div>
                      <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${isIncident ? getSeverityStyles((report as FetchedIncident).fields["Severity"]) : 'bg-blue-600 text-white'}`}>
                        {isIncident ? `SEV: ${(report as FetchedIncident).fields["Severity"]}` : 'OBS'}
                      </div>
                    </div>

                    {expandedId === report.id && (
                      <div className="border-t p-8 space-y-10 animate-in slide-in-from-top-4 duration-500">
                        <div className="space-y-4">
                           <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Narrative Record</h4>
                           <p className="text-sm font-bold opacity-80">{isIncident ? (report as FetchedIncident).fields["Description"] : (report as FetchedObservation).fields["Observation"]}</p>
                        </div>
                        
                        {!isIncident && !(report as FetchedObservation).fields["Action taken"]?.trim() && (
                          <div className={`rounded-[2.5rem] p-8 border-2 ${isLight ? 'bg-blue-50' : 'bg-blue-500/5 border-blue-500/20'}`}>
                             <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-8">Remediation Matrix</h4>
                             <div className="space-y-6">
                                <textarea rows={4} placeholder="Remediation actions..." value={actionInputs[report.id] || ''} onChange={(e) => setActionInputs({...actionInputs, [report.id]: e.target.value})} className={`w-full p-4 rounded-xl border outline-none font-bold text-xs resize-none ${isLight ? 'bg-white' : 'bg-black/40 border-white/5 text-white'}`} />
                                <div className="pt-2">
                                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Closure Evidence (Supports Drag & Drop):</label>
                                   <ImageGrid 
                                     images={closingImages[report.id] || []} 
                                     onAdd={(files) => handleAddClosingFiles(report.id, files)} 
                                     onRemove={(imageId) => handleRemoveClosingImage(report.id, imageId)} 
                                     onRetry={(imageId) => {
                                       const img = closingImages[report.id]?.find(i => i.id === imageId);
                                       if (img) processClosingImageUpload(report.id, img);
                                     }}
                                     appTheme={appTheme}
                                     hideHeader={true}
                                   />
                                </div>
                                <button onClick={() => handleResolve(report.id)} disabled={submittingIds.has(report.id)} className="w-full bg-blue-600 text-white font-black py-5 rounded-[1.5rem] uppercase text-[10px] tracking-widest active:scale-95 transition-all">{submittingIds.has(report.id) ? 'Syncing...' : 'Archive resolution'}</button>
                             </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
