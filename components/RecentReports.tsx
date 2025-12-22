
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FetchedIncident, UploadedImage, UserProfile } from '../types';
import { getAllReports, updateIncidentAction, assignIncident } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { getAllProfiles } from '../services/profileService';
import { ImageGrid } from './ImageGrid';
import { INCIDENT_TYPES } from '../constants';

interface RecentReportsProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
  filterAssignee?: string; 
}

type Tab = 'open' | 'assigned' | 'closed';

const AUTHORIZED_ADMIN_ROLES = ['technician', 'engineer', 'site supervisor', 'safety officer'];
const PROFILE_KEY = 'hse_guardian_profile';

export const RecentReports: React.FC<RecentReportsProps> = ({ baseId, onBack, appTheme = 'dark', filterAssignee }) => {
  const [allReports, setAllReports] = useState<FetchedIncident[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  const [isMultiAssigning, setIsMultiAssigning] = useState(false);

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

  const isAuthorized = useMemo(() => {
    if (!userProfile?.role) return false;
    const userRole = userProfile.role.toLowerCase();
    return AUTHORIZED_ADMIN_ROLES.some(role => userRole.includes(role));
  }, [userProfile]);

  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});
  const [closingImages, setClosingImages] = useState<Record<string, UploadedImage[]>>({});
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set<string>());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveErrors, setResolveErrors] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    fetchTeam();
    
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }
  }, [baseId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await getAllReports({ baseId });
      setAllReports(data);
    } catch (err: any) {
      setError(err.message || "Failed to load reports from safety database");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const profiles = await getAllProfiles();
      const names = Array.from(new Set(profiles.map(p => p.name))).sort();
      setTeamMembers(names);
    } catch (err) {
      console.error("Failed to load team members", err);
    }
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUnlockArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutMessage) return;

    if (!isAuthorized) {
        setLockoutMessage("Role Identity Failure. This terminal is restricted to Authorized Safety Personnel.");
        setTimeout(() => setLockoutMessage(''), 3000);
        return;
    }

    if (accessKey === 'AmxC@123@') {
      setIsArchiveUnlocked(true);
      setUnlockError(false);
      setFailedAttempts(0);
      setAccessKey('');
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setUnlockError(true);
      
      if (nextAttempts >= 3) {
        setLockoutMessage("Security Lockout. Too many attempts. Terminal suspended.");
        setTimeout(() => {
          setActiveTab('open');
          setLockoutMessage('');
          setFailedAttempts(0);
          setAccessKey('');
          setUnlockError(false);
        }, 5000);
      } else {
        setTimeout(() => setUnlockError(false), 2000);
      }
    }
  };

  const handleActionInputChange = (id: string, value: string) => {
    setActionInputs(prev => ({ ...prev, [id]: value }));
    if (resolveErrors[id]) {
        setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });
    }
  };

  const handleRowClick = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Image handling for closure
  const handleAddClosingImage = useCallback((reportId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImage: UploadedImage = {
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        progress: 0
      };
      
      setClosingImages(prev => ({
        ...prev,
        [reportId]: [...(prev[reportId] || []), newImage]
      }));

      // Start upload immediately
      processClosingImageUpload(reportId, newImage);
      e.target.value = '';
    }
  }, []);

  const handleRemoveClosingImage = useCallback((reportId: string, imageId: string) => {
    setClosingImages(prev => ({
      ...prev,
      [reportId]: (prev[reportId] || []).filter(img => img.id !== imageId)
    }));
  }, []);

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

  const handleResolve = async (id: string) => {
    const report = allReports.find(r => r.id === id);
    if (!report) return;

    setConfirmingId(null);
    setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });

    const actionTaken = actionInputs[id];
    let closedByValue = report.fields["Assigned To"]?.trim() || userProfile?.name || "None";

    if (!actionTaken?.trim()) {
        setResolveErrors(prev => ({...prev, [id]: "Corrective Action detail is mandatory for closure."}));
        return;
    }

    const currentImages = closingImages[id] || [];
    const isAnyUploading = currentImages.some(img => img.status === 'uploading');
    if (isAnyUploading) {
      setResolveErrors(prev => ({...prev, [id]: "Please wait for images to finish uploading."}));
      return;
    }

    setSubmittingIds(prev => new Set(prev).add(id));
    
    try {
      const attachmentData = currentImages
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));

      await updateIncidentAction(id, actionTaken, closedByValue, attachmentData, { baseId });
      
      setAllReports(prev => prev.map(r => r.id === id ? {
        ...r,
        fields: {
          ...r.fields,
          "Action taken": actionTaken,
          "Closed by": closedByValue,
          "Closed observations": attachmentData.map(a => ({ url: a.url, filename: a.filename }))
        }
      } : r));
      
      setExpandedId(null);
      setAssignmentSuccess("Incident verified and archived successfully.");
      setTimeout(() => setAssignmentSuccess(null), 3000);
    } catch (err: any) {
      setResolveErrors(prev => ({...prev, [id]: err.message || "System error during finalization."}));
    } finally {
      setSubmittingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const sortedReports = [...allReports].sort((a, b) => {
    const timeA = new Date(a.createdTime).getTime();
    const timeB = new Date(b.createdTime).getTime();
    return activeTab === 'open' ? timeA - timeB : timeB - timeA;
  });

  const tabFilteredReports = useMemo(() => {
    return sortedReports.filter(report => {
      const isClosed = report.fields["Action taken"]?.trim().length > 0;
      const assignedTo = report.fields["Assigned To"]?.trim() || "";
      const isUnassigned = !assignedTo || assignedTo === "None";
      const matchesType = filterType === 'All Types' || report.fields["Incident Type"] === filterType;

      if (isMyTasksMode) return !isClosed && assignedTo === filterAssignee && matchesType;

      const matchesSearch = searchTerm.trim() === '' || 
        report.fields["Observation"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.fields["Incident Type"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.fields["Site / Location"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.fields["Name"]?.toLowerCase().includes(searchTerm.toLowerCase());

      if (activeTab === 'closed') return isClosed && matchesType;
      if (activeTab === 'assigned') return !isClosed && !isUnassigned && matchesSearch && matchesType;
      return !isClosed && isUnassigned && matchesSearch && matchesType;
    });
  }, [sortedReports, activeTab, isMyTasksMode, filterAssignee, searchTerm, filterType]);

  // Tab Count Calculation Logic
  const tabCounts = useMemo(() => {
    const baseReports = filterType === 'All Types' 
      ? allReports 
      : allReports.filter(r => r.fields["Incident Type"] === filterType);

    return {
      open: baseReports.filter(r => {
        const isClosed = r.fields["Action taken"]?.trim().length > 0;
        const assignedTo = r.fields["Assigned To"]?.trim() || "";
        return !isClosed && (!assignedTo || assignedTo === "None");
      }).length,
      assigned: baseReports.filter(r => {
        const isClosed = r.fields["Action taken"]?.trim().length > 0;
        const assignedTo = r.fields["Assigned To"]?.trim() || "";
        return !isClosed && assignedTo && assignedTo !== "None";
      }).length,
      closed: baseReports.filter(r => r.fields["Action taken"]?.trim().length > 0).length
    };
  }, [allReports, filterType]);

  return (
    <div className="animate-in slide-in-from-right duration-300 pb-24">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className={`mr-4 transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex flex-col">
            <h2 className={`text-xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isMyTasksMode ? 'My Tasks' : 'Incident Log'}
            </h2>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                {isMyTasksMode ? 'Personal Assignment Queue' : 'Global Safety Database'}
            </span>
        </div>
      </div>

      {!isMyTasksMode && (
        <div className={`flex p-1 mb-6 rounded-xl border transition-colors ${isLight ? 'bg-slate-100 border-slate-200 shadow-inner' : 'bg-slate-800 border-slate-700'}`}>
            <button onClick={() => { setActiveTab('open'); setExpandedId(null); setSelectedIds(new Set<string>()); }} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'open' ? 'bg-blue-600 text-white shadow-lg' : `${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}`}>
                Open
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === 'open' ? 'bg-white/20 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-slate-400')}`}>
                  {tabCounts.open}
                </span>
            </button>
            <button onClick={() => { setActiveTab('assigned'); setExpandedId(null); setSelectedIds(new Set<string>()); }} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'assigned' ? 'bg-amber-600 text-white shadow-lg' : `${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}`}>
                Assigned
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === 'assigned' ? 'bg-white/20 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-slate-400')}`}>
                  {tabCounts.assigned}
                </span>
            </button>
            <button onClick={() => { setActiveTab('closed'); setExpandedId(null); setSelectedIds(new Set<string>()); }} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'closed' ? 'bg-emerald-600 text-white shadow-lg' : `${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}`}>
                Archive
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === 'closed' ? 'bg-white/20 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-slate-400')}`}>
                  {tabCounts.closed}
                </span>
                {!isArchiveUnlocked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            </button>
        </div>
      )}

      {/* Admin Lock Screen for Archive */}
      {activeTab === 'closed' && !isArchiveUnlocked && !isMyTasksMode && (
        <div className="flex flex-col items-center justify-center py-12 px-6 animate-in fade-in zoom-in duration-500">
           <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-4 ${isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                 <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
           </div>
           <h3 className={`text-lg font-black tracking-tight mb-8 ${isLight ? 'text-slate-900' : 'text-white'}`}>Admin Terminal</h3>

           <form onSubmit={handleUnlockArchive} className="w-full max-w-xs space-y-4">
              <div className="space-y-1.5">
                 <input 
                    type="password"
                    placeholder="••••••••"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    className={`w-full p-4 rounded-2xl border outline-none transition-all text-center tracking-[0.5em] ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'} ${unlockError ? 'border-rose-500 ring-2 ring-rose-500/20' : ''}`}
                 />
              </div>
              
              {lockoutMessage && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl animate-in shake">
                   <p className="text-rose-500 text-[10px] font-black uppercase text-center">{lockoutMessage}</p>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-95"
              >
                Establish Secure Link
              </button>
           </form>
           
           <div className="mt-12 flex flex-col items-center opacity-40">
              <span className="text-[8px] font-black uppercase tracking-[0.5em]">Identity: {userProfile?.role || 'Guest'}</span>
              <div className={`h-[2px] w-8 mt-2 ${isAuthorized ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
           </div>
        </div>
      )}

      {/* Main Reports List */}
      {!loading && !error && (activeTab !== 'closed' || isArchiveUnlocked || isMyTasksMode) && (
        <div className="flex flex-col gap-3">
          {tabFilteredReports.length === 0 ? (
            <div className="py-20 text-center opacity-30">
               <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">No incidents detected in this queue</p>
            </div>
          ) : (
            tabFilteredReports.map((report) => (
              <div key={report.id} className={`rounded-xl overflow-hidden transition-all duration-300 border flex ${expandedId === report.id ? `${isLight ? 'bg-white border-blue-500 ring-2 ring-blue-500/10' : 'bg-slate-800 border-blue-500/50 shadow-2xl'}` : `${isLight ? 'bg-white border-slate-200' : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'}`}`}>
                <div className="flex-1 flex flex-col">
                  <div onClick={() => handleRowClick(report.id)} className="flex items-center gap-3 p-4 cursor-pointer">
                    <div className={`w-20 text-[10px] font-black tracking-tighter shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(report.createdTime).toLocaleDateString()}</div>
                    <div className={`flex-1 text-sm font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{report.fields["Incident Type"] || 'Incident'}</div>
                    <div className={`shrink-0 transition-transform ${expandedId === report.id ? 'rotate-90 text-blue-500' : 'text-slate-600'}`}>
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>

                  {expandedId === report.id && (
                    <div className={`border-t p-6 space-y-8 animate-in slide-in-from-top-4 duration-300 ${isLight ? 'bg-slate-50/50' : 'bg-black/20'}`}>
                      {/* Detailed View Content */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { label: 'Reporter', val: report.fields["Name"] },
                          { label: 'Role', val: report.fields["Role / Position"] },
                          { label: 'Site', val: report.fields["Site / Location"] },
                          { label: 'Time', val: new Date(report.createdTime).toLocaleTimeString() }
                        ].map(item => (
                          <div key={item.label}>
                            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</span>
                            <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>{item.val}</span>
                          </div>
                        ))}
                      </div>

                      <div className={`p-4 rounded-2xl border transition-all ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                Precise Site Data
                            </h4>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Exact Street / Area</span>
                                <p className={`text-xs font-bold leading-relaxed break-words ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                                    {report.fields["Location"]?.split('|')[0] || "No street data cached"}
                                </p>
                            </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Narrative Description</h4>
                        <p className={`text-sm p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5 text-slate-300'}`}>{report.fields["Observation"]}</p>
                      </div>

                      {/* Initial Observations Images */}
                      {report.fields["Open observations"] && report.fields["Open observations"].length > 0 && (
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Initial Evidence</h4>
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {report.fields["Open observations"].map((img, i) => (
                                <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-xl overflow-hidden border border-white/5">
                                   <img src={img.url} className="w-full h-full object-cover" alt="Observation" />
                                </a>
                              ))}
                           </div>
                        </div>
                      )}

                      {/* Corrective Action Logic */}
                      {!report.fields["Action taken"]?.trim() && (
                        <div className={`rounded-2xl p-6 border-2 ${isLight ? 'bg-white border-blue-500/20' : 'bg-slate-900 border-blue-500/20'}`}>
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Remediation Control</h4>
                          <div className="space-y-5">
                            <textarea 
                              rows={3} 
                              placeholder="Detail corrective actions taken..." 
                              value={actionInputs[report.id] || ''} 
                              onChange={(e) => handleActionInputChange(report.id, e.target.value)} 
                              className={`${baseClasses} ${themeClasses} resize-none min-h-[100px]`} 
                            />
                            
                            <div className="pt-2">
                               <ImageGrid 
                                 images={closingImages[report.id] || []} 
                                 onAdd={(e) => handleAddClosingImage(report.id, e)} 
                                 onRemove={(imageId) => handleRemoveClosingImage(report.id, imageId)} 
                                 onRetry={(imageId) => {
                                   const img = closingImages[report.id]?.find(i => i.id === imageId);
                                   if (img) processClosingImageUpload(report.id, img);
                                 }}
                                 appTheme={appTheme}
                               />
                            </div>

                            {resolveErrors[report.id] && <p className="text-rose-500 text-[10px] font-bold uppercase">{resolveErrors[report.id]}</p>}
                            <button onClick={() => handleResolve(report.id)} disabled={submittingIds.has(report.id) || !actionInputs[report.id]?.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[11px] shadow-xl disabled:opacity-50">
                              {submittingIds.has(report.id) ? 'Finalizing...' : 'Close & Archive'}
                            </button>
                          </div>
                        </div>
                      )}

                      {report.fields["Action taken"]?.trim() && (
                         <div className={`rounded-2xl p-6 border-2 ${isLight ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Post-Remediation Compliance</h4>
                            <p className={`text-sm p-4 rounded-xl border ${isLight ? 'bg-white border-emerald-200' : 'bg-black/20 border-white/5 text-slate-200'}`}>{report.fields["Action taken"]}</p>
                            
                            {report.fields["Closed observations"] && report.fields["Closed observations"].length > 0 && (
                              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {report.fields["Closed observations"].map((img, i) => (
                                  <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-xl overflow-hidden border border-emerald-500/10">
                                     <img src={img.url} className="w-full h-full object-cover" alt="Resolution" />
                                  </a>
                                ))}
                              </div>
                            )}

                            <div className="mt-4 flex flex-col">
                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Authenticated By</span>
                               <span className="text-xs font-black text-emerald-500 uppercase tracking-wider">{report.fields["Closed by"]}</span>
                            </div>
                         </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
