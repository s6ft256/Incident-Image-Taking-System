
import React, { useEffect, useState, useMemo } from 'react';
import { FetchedIncident, UploadedImage, UserProfile } from '../types';
import { getAllReports, updateIncidentAction, assignIncident } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { getAllProfiles } from '../services/profileService';

interface RecentReportsProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
  filterAssignee?: string; 
}

type Tab = 'open' | 'closed';

// Updated RBAC roles (Case-insensitive matching)
const AUTHORIZED_ADMIN_ROLES = ['technician', 'engineer'];
const PROFILE_KEY = 'hse_guardian_profile';

export const RecentReports: React.FC<RecentReportsProps> = ({ baseId, onBack, appTheme = 'dark', filterAssignee }) => {
  const [allReports, setAllReports] = useState<FetchedIncident[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('open');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Restricted Access State
  const [isArchiveUnlocked, setIsArchiveUnlocked] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutMessage, setLockoutMessage] = useState('');

  const isLight = appTheme === 'light';
  const isMyTasksMode = !!filterAssignee;

  // Case-Insensitive RBAC Check
  const isAuthorized = useMemo(() => {
    if (!userProfile?.role) return false;
    return AUTHORIZED_ADMIN_ROLES.includes(userProfile.role.toLowerCase());
  }, [userProfile]);

  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});
  const [closingImages, setClosingImages] = useState<Record<string, UploadedImage[]>>({});
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
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

  const handleUnlockArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutMessage) return;

    // RBAC Final Verification: Double check role integrity
    if (!isAuthorized) {
        setLockoutMessage("Role Identity Failure. This terminal is restricted to Authorized Personnel.");
        return;
    }

    if (accessKey === 'AmxC@123@') {
      setIsArchiveUnlocked(true);
      setUnlockError(false);
      setFailedAttempts(0);
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setUnlockError(true);
      
      if (nextAttempts >= 3) {
        setLockoutMessage("Access Denied. Terminal Locked. Please contact the developer via the 'Feed' button at the bottom right.");
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

  const handleReassign = async (reportId: string, assignee: string) => {
    setReassigningId(reportId);
    setAssignmentSuccess(null);
    try {
      await assignIncident(reportId, assignee, { baseId });
      
      setAllReports(prev => prev.map(r => r.id === reportId ? { ...r, fields: { ...r.fields, "Assigned To": assignee } } : r));
      
      const successMsg = assignee 
        ? `Task assigned to ${assignee}` 
        : `Task released to unassigned queue`;
      
      setAssignmentSuccess(successMsg);
      setTimeout(() => setAssignmentSuccess(null), 3500);
    } catch (err: any) {
      setResolveErrors(prev => ({ ...prev, [reportId]: err.message || "Assignment failed" }));
    } finally {
      setReassigningId(null);
    }
  };

  const uploadClosingImage = async (reportId: string, imageId: string, file: File) => {
    setClosingImages(prev => ({
      ...prev,
      [reportId]: (prev[reportId] || []).map(img => 
        img.id === imageId ? { ...img, status: 'uploading', progress: 10, errorMessage: undefined } : img
      )
    }));

    try {
      const fileToUpload = await compressImage(file);
      const publicUrl = await uploadImageToStorage(fileToUpload, 'closed');
      
      setClosingImages(prev => ({
        ...prev,
        [reportId]: prev[reportId].map(img => 
          img.id === imageId 
            ? { ...img, status: 'success', serverUrl: publicUrl, progress: 100 } 
            : img
        )
      }));
    } catch (err: any) {
      setClosingImages(prev => ({
        ...prev,
        [reportId]: prev[reportId].map(img => 
          img.id === imageId 
            ? { ...img, status: 'error', progress: 0, errorMessage: err.message || "Upload Failed" } 
            : img
        )
      }));
    }
  };

  const handleAddClosingImage = async (reportId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImage: UploadedImage = {
        id: crypto.randomUUID(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading',
        progress: 0
      };

      setClosingImages(prev => ({
        ...prev,
        [reportId]: [...(prev[reportId] || []), newImage]
      }));
      
      if (resolveErrors[reportId]) {
         setResolveErrors(prev => { const n = {...prev}; delete n[reportId]; return n; });
      }

      e.target.value = '';
      await uploadClosingImage(reportId, newImage.id, file);
    }
  };

  const handleRemoveClosingImage = (reportId: string, imageId: string) => {
    setClosingImages(prev => {
      const reportImages = prev[reportId] || [];
      const imageToRemove = reportImages.find(img => img.id === imageId);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl);
      
      return {
        ...prev,
        [reportId]: reportImages.filter(img => img.id !== imageId)
      };
    });
  };

  const handleResolve = async (id: string) => {
    const report = allReports.find(r => r.id === id);
    if (!report) return;

    setConfirmingId(null);
    setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });

    const actionTaken = actionInputs[id];
    const closedBy = report.fields["Assigned To"];
    
    if (!closedBy?.trim()) {
        setResolveErrors(prev => ({...prev, [id]: "Error: Personnel must be assigned before closing."}));
        return;
    }

    if (!actionTaken?.trim()) {
        setResolveErrors(prev => ({...prev, [id]: "Required: Action Taken details."}));
        return;
    }

    const currentImages = closingImages[id] || [];
    if (currentImages.some(img => img.status === 'uploading')) {
        setResolveErrors(prev => ({...prev, [id]: "Evidence upload in progress."}));
        return;
    }

    setSubmittingIds(prev => new Set(prev).add(id));
    
    try {
      const attachmentData = currentImages
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));

      await updateIncidentAction(id, actionTaken, closedBy, attachmentData, { baseId });
      
      setAllReports(prev => prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            fields: {
              ...r.fields,
              "Action taken": actionTaken,
              "Closed by": closedBy,
              "Closed observations": attachmentData.map(a => ({ url: a.url, filename: a.filename }))
            }
          };
        }
        return r;
      }));
      
      setExpandedId(null);
    } catch (err: any) {
      setResolveErrors(prev => ({...prev, [id]: err.message || "Failed to commit resolution."}));
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

  const tabFilteredReports = sortedReports.filter(report => {
    const isClosed = report.fields["Action taken"]?.trim().length > 0;
    const assignedTo = report.fields["Assigned To"]?.trim() || "";
    // If set to none or left empty, it's considered unassigned
    const isUnassigned = !assignedTo || assignedTo === "None";
    
    if (isMyTasksMode) {
      return !isClosed && assignedTo === filterAssignee;
    }

    if (activeTab === 'closed') {
      return isClosed;
    }

    // Open pool includes unassigned items
    return !isClosed && isUnassigned;
  });

  return (
    <div className="animate-in slide-in-from-right duration-300">
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

      {assignmentSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-emerald-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-emerald-400/30">
            <div className="bg-white/20 p-2 rounded-full">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-black uppercase tracking-widest">{assignmentSuccess}</span>
          </div>
        </div>
      )}

      {!isMyTasksMode && (
        <div className={`flex p-1 mb-6 rounded-lg border transition-colors ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
            <button
            onClick={() => { setActiveTab('open'); setExpandedId(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'open'
                ? 'bg-blue-600 text-white shadow-md'
                : `${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`
            }`}
            >
            Open
            <span className="ml-2 bg-blue-500/30 text-blue-100 text-[10px] px-1.5 py-0.5 rounded-full">
                {allReports.filter(r => !r.fields["Action taken"]?.trim() && (!r.fields["Assigned To"]?.trim() || r.fields["Assigned To"] === "None")).length}
            </span>
            </button>
            <button
            onClick={() => { setActiveTab('closed'); setExpandedId(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'closed'
                ? 'bg-emerald-600 text-white shadow-md'
                : `${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`
            }`}
            >
            Archive
            <span className="ml-2 bg-emerald-500/30 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded-full">
                {allReports.filter(r => r.fields["Action taken"]?.trim()).length}
            </span>
            </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12 animate-pulse">
          <div className={`rounded-full h-8 w-8 border-b-2 ${isLight ? 'border-blue-600' : 'border-white'}`}></div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && !error && activeTab === 'closed' && !isArchiveUnlocked && !isMyTasksMode && (
        <div className="flex flex-col items-center justify-center pt-10 pb-20 animate-in fade-in zoom-in-95 duration-500">
           <div className={`w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl border transition-all ${isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/5'}`}>
              
              {!isAuthorized ? (
                <div className="animate-in fade-in duration-500">
                    <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-rose-500/20 shadow-inner">
                        <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className={`text-2xl font-black mb-3 tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>Access Denied.</h2>
                    <div className={`inline-block px-4 py-1.5 rounded-full border mb-6 bg-rose-500/5 border-rose-500/20`}>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">Clearance Level 2 Required</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-6">
                        Evidence archives are restricted to Authorized Personnel (Technicians & Engineers).
                    </p>
                    <button 
                        onClick={() => setActiveTab('open')}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl uppercase tracking-[0.3em] text-[10px] transition-all"
                    >
                        Return to Log
                    </button>
                </div>
              ) : (
                <>
                  <div className="relative mb-8">
                     <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto border shadow-inner ${isLight ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/5 border-blue-500/20'}`}>
                        <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                     </div>
                  </div>

                  <h2 className={`text-4xl font-black mb-3 tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>Admin.</h2>
                  
                  <div className={`inline-block px-4 py-1.5 rounded-full border mb-10 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                     <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Restricted Access Protocol</span>
                  </div>

                  {lockoutMessage ? (
                    <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-in shake duration-500">
                       <p className="text-[10px] font-black text-rose-500 uppercase leading-relaxed tracking-widest">{lockoutMessage}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleUnlockArchive} className="space-y-4">
                      <input 
                        type="password" 
                        placeholder="Access Key" 
                        value={accessKey}
                        onChange={(e) => setAccessKey(e.target.value)}
                        className={`w-full p-4 rounded-2xl border text-center font-bold tracking-[0.3em] outline-none transition-all ${
                          unlockError 
                            ? 'border-rose-500 ring-2 ring-rose-500/20' 
                            : `${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/10 text-white focus:border-blue-500'}`
                        }`}
                      />
                      
                      <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl uppercase tracking-[0.3em] text-[11px] transition-all active:scale-95 shadow-xl shadow-blue-500/20"
                      >
                        Unlock
                      </button>
                      {unlockError && (
                        <p className="mt-4 text-[9px] font-black text-rose-500 uppercase tracking-widest animate-in shake duration-300">
                          Invalid Key ({3 - failedAttempts} attempts remaining)
                        </p>
                      )}
                    </form>
                  )}
                </>
              )}
           </div>
           
           <div className="mt-12 flex flex-col items-center">
             <div className="h-0.5 w-8 bg-blue-500/40 rounded-full"></div>
             <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.5em] mt-3">High-Integrity Evidence Gateway</p>
           </div>
        </div>
      )}

      {!loading && !error && (activeTab === 'open' || isArchiveUnlocked || isMyTasksMode) && (
        <div className="flex flex-col gap-3">
          {tabFilteredReports.length === 0 && (
            <div className={`text-center py-20 rounded-[2rem] border-2 border-dashed ${isLight ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-800/20 border-slate-800 text-slate-500'}`}>
              <p className="text-sm font-black uppercase tracking-[0.2em]">
                {isMyTasksMode ? 'Clear Schedule' : `No ${activeTab} observations`}
              </p>
            </div>
          )}
          
          {tabFilteredReports.map((report) => (
            <div key={report.id} className={`rounded-xl overflow-hidden transition-all duration-300 border ${expandedId === report.id ? `${isLight ? 'bg-white border-blue-500 ring-2 ring-blue-500/10' : 'bg-slate-800 border-blue-500/50 shadow-2xl shadow-blue-500/10'}` : `${isLight ? 'bg-white border-slate-200' : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'}`}`}>
              <div onClick={() => handleRowClick(report.id)} className="flex items-center gap-3 p-4 cursor-pointer">
                <div className={`w-20 text-[10px] font-black tracking-tighter shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(report.createdTime).toLocaleDateString()}</div>
                <div className={`flex-1 text-sm font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{report.fields["Incident Type"] || 'Incident'}</div>
                <div className={`hidden sm:block flex-1 text-[10px] font-black uppercase truncate tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{report.fields["Site / Location"]}</div>
                <div className="shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${report.fields["Action taken"]?.trim() ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                    {report.fields["Action taken"]?.trim() ? 'Closed' : ((report.fields["Assigned To"]?.trim() && report.fields["Assigned To"] !== "None") ? 'Assigned' : 'Unassigned')}
                  </span>
                </div>
                <div className={`shrink-0 transition-transform ${expandedId === report.id ? 'rotate-90 text-blue-500' : 'text-slate-600'}`}>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </div>

              {expandedId === report.id && (
                <div className={`border-t p-6 space-y-8 animate-in slide-in-from-top-4 duration-300 ${isLight ? 'bg-slate-50/50' : 'bg-black/20'}`}>
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Reporter', val: report.fields["Name"] },
                      { label: 'Role', val: report.fields["Role / Position"] },
                      { label: 'Time', val: new Date(report.createdTime).toLocaleTimeString() },
                      { label: 'Location', val: report.fields["Site / Location"] }
                    ].map(item => (
                      <div key={item.label}>
                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</span>
                        <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>{item.val}</span>
                      </div>
                    ))}

                    {/* Assignment Field - Visible for Unassigned/Assigned Open */}
                    {!report.fields["Action taken"]?.trim() && (
                        <div className="col-span-2 lg:col-span-1">
                            <span className="block text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Observation Assignee</span>
                            <select 
                                className={`w-full p-2.5 text-[11px] font-black rounded-xl border outline-none transition-all ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-slate-900 border-white/10 text-white focus:border-blue-500'}`}
                                value={report.fields["Assigned To"] || ""}
                                disabled={reassigningId === report.id}
                                onChange={(e) => handleReassign(report.id, e.target.value)}
                            >
                                <option value="">Release to Pool</option>
                                <optgroup label="Team Directory">
                                  {teamMembers.map(name => (
                                      <option key={name} value={name}>{name}</option>
                                  ))}
                                </optgroup>
                            </select>
                        </div>
                    )}
                  </div>

                  {/* Initial Observation Information - ALWAYS VISIBLE */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        Initial Observation Narrative
                    </h4>
                    <p className={`text-sm p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/5 text-slate-300'}`}>{report.fields["Observation"]}</p>
                    
                    {/* Opening Images - ALWAYS VISIBLE if they exist */}
                    <div>
                      <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Initial Evidence Gallery</span>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {report.fields["Open observations"] ? (
                          report.fields["Open observations"].map((img, i) => (
                            <a key={i} href={img.url} target="_blank" className={`block shrink-0 h-24 w-24 rounded-lg overflow-hidden border-2 shadow-lg hover:scale-105 transition-transform ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                              <img src={img.url} className="h-full w-full object-cover" alt="Evidence" />
                            </a>
                          ))
                        ) : (
                          <div className={`h-24 w-full flex items-center justify-center rounded-lg border-2 border-dashed ${isLight ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                            <span className="text-[8px] font-black uppercase">No Initial Evidence Stored</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Finalization Form - ONLY for Open Tasks */}
                  {!report.fields["Action taken"]?.trim() && (
                    <div className={`rounded-2xl p-6 border-2 ${isLight ? 'bg-white border-blue-500/20 shadow-xl' : 'bg-slate-900 border-white/10'}`}>
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Task Finalization Control</h4>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Authorized Verifier Name</label>
                            <input 
                              type="text" 
                              readOnly 
                              placeholder="Assign Personnel First" 
                              value={report.fields["Assigned To"] || ''} 
                              className={`w-full p-4 rounded-xl border text-sm outline-none cursor-not-allowed opacity-75 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/20 border-white/10 text-slate-400'}`} 
                            />
                            {(!report.fields["Assigned To"] || report.fields["Assigned To"] === "None") && (
                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest px-1 mt-1 animate-pulse">Assignment Required to Resolve</p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Corrective Action Details</label>
                            <textarea rows={3} placeholder="Describe the remediation steps taken..." value={actionInputs[report.id] || ''} onChange={(e) => handleActionInputChange(report.id, e.target.value)} className={`w-full p-4 rounded-xl border text-sm resize-none outline-none ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/10 text-white focus:border-blue-500'}`} />
                        </div>
                        
                        <div className="flex gap-3 pb-2 overflow-x-auto scrollbar-hide">
                          {(closingImages[report.id] || []).map(img => (
                            <div key={img.id} className="relative shrink-0 h-20 w-20">
                              <img src={img.previewUrl} className={`h-full w-full object-cover rounded-xl border-2 ${img.status === 'success' ? 'border-emerald-500' : 'border-blue-500 animate-pulse'}`} />
                              <button onClick={() => handleRemoveClosingImage(report.id, img.id)} className="absolute -top-2 -right-2 bg-slate-900 text-white p-1 rounded-full shadow-lg border border-white/20"><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
                            </div>
                          ))}
                          {(!closingImages[report.id] || closingImages[report.id].length < 3) && (
                            <label className="shrink-0 h-20 w-20 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-600"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleAddClosingImage(report.id, e)} />
                            </label>
                          )}
                        </div>

                        <button 
                          onClick={() => setConfirmingId(report.id)} 
                          disabled={submittingIds.has(report.id) || !actionInputs[report.id]?.trim() || !report.fields["Assigned To"] || report.fields["Assigned To"] === "None"} 
                          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-700 text-white font-black py-5 rounded-xl transition-all uppercase tracking-widest text-[10px] shadow-xl shadow-blue-900/20 active:scale-95"
                        >
                          {submittingIds.has(report.id) ? 'Processing Submission...' : 'Commit Final Resolution'}
                        </button>
                        {resolveErrors[report.id] && <p className="text-center text-rose-500 text-[10px] font-black uppercase tracking-widest">{resolveErrors[report.id]}</p>}
                      </div>
                    </div>
                  )}

                  {/* Final Resolution Information - ONLY for Closed Tasks */}
                  {report.fields["Action taken"]?.trim() && (
                     <div className={`rounded-2xl p-6 border-2 ${isLight ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Task Resolution Audit
                        </h4>
                        <p className={`text-sm mb-6 p-4 rounded-xl border ${isLight ? 'bg-white border-emerald-200 text-slate-800' : 'bg-black/20 border-white/5 text-slate-200'}`}>{report.fields["Action taken"]}</p>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                           <div className="flex flex-col">
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Closing Verifier</span>
                             <span className="text-xs font-black text-emerald-500 uppercase">{report.fields["Closed by"]}</span>
                           </div>
                           
                           <div className="flex-1 min-w-[200px]">
                             <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Resolution Evidence Gallery</span>
                             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {report.fields["Closed observations"] ? (
                                  report.fields["Closed observations"].map((img, i) => (
                                    <a key={i} href={img.url} target="_blank" className="block shrink-0 h-20 w-20 rounded-lg overflow-hidden border border-emerald-500/30 hover:scale-105 transition-transform">
                                      <img src={img.url} className="h-full w-full object-cover" alt="Resolution" />
                                    </a>
                                  ))
                                ) : (
                                  <div className={`h-20 w-20 flex items-center justify-center rounded-lg border border-dashed ${isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                    <span className="text-[6px] font-black text-center px-1 uppercase leading-tight">No Closing Evidence</span>
                                  </div>
                                )}
                             </div>
                           </div>
                        </div>
                     </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setConfirmingId(null)}></div>
          <div className={`relative w-full max-w-sm rounded-[2.5rem] border p-8 space-y-6 text-center shadow-2xl animate-in zoom-in duration-300 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
            <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-blue-500/20">
               <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
            </div>
            <h3 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Archive Task?</h3>
            <p className="text-sm text-slate-500">Confirm that the corrective action is sufficient and documented. This incident will be archived as Resolved.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmingId(null)} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'}`}>Cancel</button>
              <button onClick={() => handleResolve(confirmingId)} className="py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">Commit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
