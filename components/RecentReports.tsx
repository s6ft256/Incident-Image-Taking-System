import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FetchedObservation, UploadedImage, UserProfile, FetchedIncident } from '../types';
import { getAllReports, updateObservationAction, assignObservation, getAllIncidents } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { getAllProfiles } from '../services/profileService';
import { ImageGrid } from './ImageGrid';
import { OBSERVATION_TYPES } from '../constants';

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
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());

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
      try {
        setUserProfile(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }
  }, [fetchData]);

  const fetchTeam = async () => {
    try {
      const profiles = await getAllProfiles();
      const names = Array.from(new Set(profiles.map(p => p.name))).sort();
      setTeamMembers(names);
    } catch (err) {
      console.error("Failed to load team members", err);
    }
  };

  const handleAssignToMember = async (reportId: string) => {
    const assignee = localAssignee[reportId];
    if (assignee === undefined) return;

    setReassigningId(reportId);
    try {
      await assignObservation(reportId, assignee, { baseId });
      setAllReports(prev => prev.map(r => r.id === reportId ? {
        ...r,
        fields: { ...r.fields, "Assigned To": assignee }
      } : r));
      setAssignmentSuccess(assignee ? "Personnel successfully assigned." : "Observation unassigned.");
      setTimeout(() => setAssignmentSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update assignment.");
    } finally {
      setReassigningId(null);
    }
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
    const report = allReports.find(r => r.id === id) || allIncidents.find(i => i.id === id);
    if (!report) return;
    
    if ('fields' in report && !('Title' in report.fields) && !localAssignee[id]) {
      setLocalAssignee(prev => ({ ...prev, [id]: (report as FetchedObservation).fields["Assigned To"] || "" }));
    }
    setExpandedId(expandedId === id ? null : id);
  };

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

      await updateObservationAction(id, actionTaken, closedByValue, attachmentData, { baseId });
      
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
      setAssignmentSuccess("Observation verified and archived successfully.");
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

  const tabFilteredReports = useMemo(() => {
    if (activeTab === 'incidents') {
      return allIncidents.filter(inc => {
        const matchesSearch = searchTerm.trim() === '' || 
          inc.fields["Title"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inc.fields["Description"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inc.fields["Location"]?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All Types' || inc.fields["Category"] === filterType;
        return matchesSearch && matchesType;
      });
    }

    const sortedReports = [...allReports].sort((a, b) => {
      const timeA = new Date(a.createdTime).getTime();
      const timeB = new Date(b.createdTime).getTime();
      return activeTab === 'open' ? timeA - timeB : timeB - timeA;
    });

    return sortedReports.filter(report => {
      const isClosed = report.fields["Action taken"]?.trim().length > 0;
      const assignedTo = report.fields["Assigned To"]?.trim() || "";
      const isUnassigned = !assignedTo || assignedTo === "None";
      const matchesType = filterType === 'All Types' || report.fields["Observation Type"] === filterType;

      if (isMyTasksMode) return !isClosed && assignedTo === filterAssignee && matchesType;

      const matchesSearch = searchTerm.trim() === '' || 
        report.fields["Observation"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.fields["Observation Type"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.fields["Site / Location"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.fields["Name"]?.toLowerCase().includes(searchTerm.toLowerCase());

      if (activeTab === 'closed') return isClosed && matchesType;
      if (activeTab === 'assigned') return !isClosed && !isUnassigned && matchesSearch && matchesType;
      return !isClosed && isUnassigned && matchesSearch && matchesType;
    });
  }, [allReports, allIncidents, activeTab, isMyTasksMode, filterAssignee, searchTerm, filterType]);

  const tabCounts = useMemo(() => {
    const baseReports = filterType === 'All Types' 
      ? allReports 
      : allReports.filter(r => r.fields["Observation Type"] === filterType);
    
    const baseIncidents = filterType === 'All Types'
      ? allIncidents
      : allIncidents.filter(i => i.fields["Category"] === filterType);

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
      incidents: baseIncidents.length,
      closed: baseReports.filter(r => r.fields["Action taken"]?.trim().length > 0).length
    };
  }, [allReports, allIncidents, filterType]);

  const getSeverityStyles = (severity: number) => {
    if (severity >= 4) return 'bg-rose-600 text-white shadow-[0_0_10px_rgba(225,29,72,0.5)] animate-pulse';
    if (severity === 3) return 'bg-amber-500 text-white';
    if (severity === 2) return 'bg-blue-500 text-white';
    return 'bg-slate-500 text-white';
  };

  return (
    <div className="animate-in slide-in-from-right duration-300 pb-24 min-h-[80vh] relative max-w-7xl mx-auto">
      {assignmentSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-4">
           {assignmentSuccess}
        </div>
      )}

      {!isMyTasksMode && (activeTab === 'open' || activeTab === 'assigned' || activeTab === 'incidents') && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-5 sm:opacity-10 lg:opacity-20">
          <img 
            src={activeTab === 'open' ? OPEN_TAB_BG : activeTab === 'assigned' ? ASSIGNED_TAB_BG : INCIDENT_TAB_BG} 
            className="w-full h-full object-cover rounded-[3rem]" 
            alt="Thematic Background" 
          />
          <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white via-white/80 to-white' : 'from-[#020617] via-transparent to-[#020617]'}`}></div>
        </div>
      )}

      <div className="relative z-10 px-2 lg:px-0">
        <div className="flex items-center mb-8">
          <button onClick={onBack} className={`mr-4 transition-all p-2 rounded-xl hover:bg-white/5 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
              <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {isMyTasksMode ? 'My Tasks' : 'Observation Log'}
              </h2>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">
                  {isMyTasksMode ? 'Personal Assignment Queue' : 'Global Safety Database'}
              </span>
          </div>
        </div>

        {!isMyTasksMode && (
          <div className={`flex p-1 mb-8 rounded-2xl border transition-colors overflow-x-auto scrollbar-hide max-w-2xl ${isLight ? 'bg-slate-100 border-slate-200 shadow-inner' : 'bg-slate-800 border-slate-700'}`}>
              <button onClick={() => { setActiveTab('open'); setExpandedId(null); setSelectedIds(new Set<string>()); window.scrollTo(0, 0); }} className={`flex-1 min-w-[100px] py-3 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-3 ${activeTab === 'open' ? 'bg-blue-600 text-white shadow-lg' : `${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}`}>
                  Open
                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'open' ? 'bg-white/20 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-slate-400')}`}>
                    {tabCounts.open}
                  </span>
              </button>
              <button onClick={() => { setActiveTab('assigned'); setExpandedId(null); setSelectedIds(new Set<string>()); window.scrollTo(0, 0); }} className={`flex-1 min-w-[100px] py-3 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-3 ${activeTab === 'assigned' ? 'bg-amber-600 text-white shadow-lg' : `${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}`}>
                  Assigned
                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'assigned' ? 'bg-white/20 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-slate-400')}`}>
                    {tabCounts.assigned}
                  </span>
              </button>
              <button onClick={() => { setActiveTab('incidents'); setExpandedId(null); setSelectedIds(new Set<string>()); window.scrollTo(0, 0); }} className={`flex-1 min-w-[100px] py-3 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-3 ${activeTab === 'incidents' ? 'bg-rose-600 text-white shadow-lg' : `${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}`}>
                  Incidents
                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'incidents' ? 'bg-white/20 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-slate-400')}`}>
                    {tabCounts.incidents}
                  </span>
              </button>
              <button onClick={() => { setActiveTab('closed'); setExpandedId(null); setSelectedIds(new Set<string>()); window.scrollTo(0, 0); }} className={`flex-1 min-w-[100px] py-3 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-3 ${activeTab === 'closed' ? 'bg-emerald-600 text-white shadow-lg' : `${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}`}>
                  Archive
                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === 'closed' ? 'bg-white/20 text-white' : (isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-slate-400')}`}>
                    {tabCounts.closed}
                  </span>
                  {!isArchiveUnlocked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-grow relative group">
            <input 
              type="text" 
              placeholder={`Search records in ${activeTab}...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-4.5 rounded-2xl border outline-none transition-all pl-14 text-sm font-bold ${
                isLight ? 'bg-white border-slate-200 focus:border-blue-500 shadow-sm' : 'bg-white/5 border-white/10 focus:border-blue-500 text-white shadow-2xl shadow-black/20'
              }`}
            />
            <svg className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isLight ? 'text-slate-400 group-focus-within:text-blue-500' : 'text-slate-500 group-focus-within:text-blue-500'}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>

        {/* Admin Lock Screen for Archive */}
        {activeTab === 'closed' && !isArchiveUnlocked && !isMyTasksMode && (
          <div className="flex flex-col items-center justify-center py-20 px-6 animate-in fade-in zoom-in duration-500">
             <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 border-4 ${isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                   <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
             </div>
             <h3 className={`text-2xl font-black tracking-tight mb-8 ${isLight ? 'text-slate-900' : 'text-white'}`}>Admin Terminal Lockdown</h3>

             <form onSubmit={handleUnlockArchive} className="w-full max-w-sm space-y-5">
                <div className="space-y-2">
                   <input 
                      type="password"
                      placeholder="••••••••"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      className={`w-full p-5 rounded-2xl border outline-none transition-all text-center tracking-[0.5em] text-lg font-black ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'} ${unlockError ? 'border-rose-500 ring-4 ring-rose-500/20' : ''}`}
                   />
                </div>
                
                {lockoutMessage && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl animate-in shake">
                     <p className="text-rose-500 text-[10px] font-black uppercase text-center tracking-widest">{lockoutMessage}</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl uppercase tracking-[0.3em] text-[12px] shadow-2xl transition-all active:scale-95"
                >
                  Establish Secure Link
                </button>
             </form>
          </div>
        )}

        {loading && (
          <div className="py-24 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className={`text-[11px] font-black uppercase tracking-[0.4em] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Accessing Core Safety Roster...</p>
          </div>
        )}

        {!loading && !error && (activeTab !== 'closed' || isArchiveUnlocked || isMyTasksMode) && (
          <div className="flex flex-col gap-4">
            {tabFilteredReports.length === 0 ? (
              <div className="py-32 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[3rem]">
                 <svg className="w-16 h-16 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 <p className="text-xs font-black uppercase tracking-[0.4em]">Grid Monitoring Active: No records found</p>
              </div>
            ) : (
              tabFilteredReports.map((report) => {
                const isIncident = 'fields' in report && 'Title' in report.fields;
                
                if (isIncident) {
                  const incident = report as FetchedIncident;
                  return (
                    <div key={incident.id} id={`incident-${incident.id}`} className={`rounded-[2rem] overflow-hidden transition-all duration-400 border flex flex-col group ${expandedId === incident.id ? `${isLight ? 'bg-white border-rose-500 ring-2 ring-rose-500/10 shadow-2xl' : 'bg-slate-900 border-rose-500/50 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'}` : `${isLight ? 'bg-white/90 border-slate-200 hover:border-slate-300' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}`}>
                      <div onClick={() => handleRowClick(incident.id)} className="flex items-center gap-5 p-5 sm:p-6 cursor-pointer">
                        <div className={`w-32 text-[10px] font-black tracking-widest shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                           {new Date(incident.fields["Incident Date"]).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className={`flex-1 text-sm sm:text-base font-black truncate tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{incident.fields["Title"]}</div>
                        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg ${getSeverityStyles(incident.fields["Severity"])}`}>
                          SEV: {incident.fields["Severity"]}
                        </div>
                        <div className={`shrink-0 p-2 rounded-xl transition-all ${expandedId === incident.id ? 'rotate-90 bg-rose-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-white'}`}>
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                        </div>
                      </div>

                      {expandedId === incident.id && (
                        <div className={`border-t p-8 sm:p-12 space-y-12 animate-in slide-in-from-top-4 duration-500 ${isLight ? 'bg-rose-50/20' : 'bg-rose-500/[0.03]'}`}>
                           {/* Identification Grid */}
                           <div className="space-y-6">
                              <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] border-l-4 border-rose-500 pl-4">I. Record Identification</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                                {[
                                  { label: 'Reporter ID', val: incident.fields["Reporter ID"] },
                                  { label: 'Department', val: incident.fields["Department"] },
                                  { label: 'Category', val: incident.fields["Category"] },
                                  { label: 'Operational Status', val: incident.fields["Status"], color: 'text-rose-500' },
                                  { label: 'Incident Timestamp', val: new Date(incident.fields["Incident Date"]).toLocaleString() },
                                  { label: 'Site Asset', val: incident.fields["Location"] },
                                ].map(item => (
                                  <div key={item.label}>
                                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{item.label}</span>
                                    <span className={`text-[12px] font-bold uppercase tracking-tight ${item.color || (isLight ? 'text-slate-800' : 'text-slate-100')}`}>{item.val}</span>
                                  </div>
                                ))}
                              </div>
                           </div>

                           {/* Comprehensive Narrative */}
                           <div className="space-y-6">
                              <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] border-l-4 border-rose-500 pl-4">II. Narrative Chronology</h4>
                              <div className={`text-[15px] p-8 rounded-[2.5rem] border leading-relaxed text-justify shadow-inner ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-black/40 border-white/5 text-slate-300'}`}>
                                {incident.fields["Description"]}
                              </div>
                           </div>

                           {/* Stakeholders and Assets */}
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                              <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Personnel Manifest</h4>
                                <div className={`text-xs p-6 rounded-3xl border min-h-[100px] leading-relaxed font-bold ${isLight ? 'bg-white/50 border-slate-200 text-slate-600' : 'bg-black/20 border-white/5 text-slate-400'}`}>
                                  {incident.fields["Persons Involved"] || 'RECORD_NULL'}
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Asset Registry</h4>
                                <div className={`text-xs p-6 rounded-3xl border min-h-[100px] leading-relaxed font-bold ${isLight ? 'bg-white/50 border-slate-200 text-slate-600' : 'bg-black/20 border-white/5 text-slate-400'}`}>
                                  {incident.fields["Equipment Involved"] || 'RECORD_NULL'}
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Witness Registry</h4>
                                <div className={`text-xs p-6 rounded-3xl border min-h-[100px] leading-relaxed font-bold ${isLight ? 'bg-white/50 border-slate-200 text-slate-600' : 'bg-black/20 border-white/5 text-slate-400'}`}>
                                  {incident.fields["Witnesses"] || 'RECORD_NULL'}
                                </div>
                              </div>
                           </div>

                           {/* Evidence Acquisition */}
                           {incident.fields["Attachments"] && incident.fields["Attachments"].length > 0 && (
                            <div className="space-y-6">
                               <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] border-l-4 border-rose-500 pl-4">III. High-Integrity Evidence</h4>
                               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                  {incident.fields["Attachments"].map((img, i) => (
                                    <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="group/img aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 shadow-2xl relative transition-all active:scale-95">
                                       <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="Incident Evidence" />
                                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                       </div>
                                    </a>
                                  ))}
                               </div>
                            </div>
                           )}

                           {/* Technical Metadata Chain */}
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-10 border-t border-white/5">
                              <div className={`p-6 rounded-[2rem] border transition-all ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5 hover:bg-black/60'}`}>
                                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                  GPS Telemetry Record
                                </h4>
                                <p className="text-[11px] font-mono text-slate-500 break-all leading-relaxed">{incident.fields["Geolocation"] || 'COORD_NULL'}</p>
                              </div>
                              <div className={`p-6 rounded-[2rem] border transition-all ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5 hover:bg-black/60'}`}>
                                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20m10-10H2" /></svg>
                                  System Audit Metadata
                                </h4>
                                <p className="text-[10px] font-mono text-slate-500 break-all leading-relaxed line-clamp-2">{incident.fields["Metadata"] || 'METADATA_NULL'}</p>
                              </div>
                           </div>

                           <div className="flex flex-col sm:flex-row justify-between items-center opacity-30 pt-4 gap-4">
                              <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-current">REGISTRY ID: {incident.id}</span>
                              <span className="text-[9px] font-black uppercase tracking-widest">Entry Handshake: {new Date(incident.createdTime).toUTCString()}</span>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                }

                const observation = report as FetchedObservation;
                return (
                  <div key={observation.id} id={`report-${observation.id}`} className={`rounded-[2rem] overflow-hidden transition-all duration-400 border flex ${expandedId === observation.id ? `${isLight ? 'bg-white border-blue-500 ring-2 ring-blue-500/10 shadow-2xl' : 'bg-[#0f172a] border-blue-500/50 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'}` : `${isLight ? 'bg-white/90 border-slate-200 hover:border-slate-300' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}`}>
                    <div className="flex-1 flex flex-col">
                      <div onClick={() => handleRowClick(observation.id)} className="flex items-center gap-5 p-5 sm:p-6 cursor-pointer">
                        <div className={`w-32 text-[10px] font-black tracking-widest shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                           {new Date(observation.createdTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className={`flex-1 text-sm sm:text-base font-black truncate tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {observation.fields["Observation Type"] || 'General Observation'}
                        </div>
                        <div className={`shrink-0 p-2 rounded-xl transition-all ${expandedId === observation.id ? 'rotate-90 bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}>
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                        </div>
                      </div>

                      {expandedId === observation.id && (
                        <div className={`border-t p-8 sm:p-12 space-y-10 animate-in slide-in-from-top-4 duration-500 ${isLight ? 'bg-slate-50/50' : 'bg-black/20'}`}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                            {[
                              { label: 'Reporter Name', val: observation.fields["Name"] },
                              { label: 'Personnel Role', val: observation.fields["Role / Position"] },
                              { label: 'Site / Location', val: observation.fields["Site / Location"] },
                              { label: 'Deployment Time', val: new Date(observation.createdTime).toLocaleTimeString() }
                            ].map(item => (
                              <div key={item.label}>
                                <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">{item.label}</span>
                                <span className={`text-[12px] font-bold uppercase tracking-tight ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>{item.val}</span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] border-l-4 border-blue-500 pl-4">IV. Detailed Narrative</h4>
                            <p className={`text-[15px] p-8 rounded-[2.5rem] border leading-relaxed text-justify shadow-inner ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-white/5 text-slate-300'}`}>
                              {observation.fields["Observation"]}
                            </p>
                          </div>

                          {observation.fields["Open observations"] && observation.fields["Open observations"].length > 0 && (
                            <div className="space-y-6">
                               <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] border-l-4 border-blue-500 pl-4">V. Site Telemetry (Photos)</h4>
                               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                                  {observation.fields["Open observations"].map((img, i) => (
                                    <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="group/img aspect-square rounded-[2rem] overflow-hidden border-2 border-white/5 shadow-xl relative transition-all active:scale-95">
                                       <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="Observation" />
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                       </div>
                                    </a>
                                  ))}
                               </div>
                            </div>
                          )}

                          {!observation.fields["Action taken"]?.trim() && (
                            <div className={`p-8 rounded-[2.5rem] border-2 shadow-xl ${isLight ? 'bg-blue-50/50 border-blue-100' : 'bg-blue-500/[0.03] border-blue-500/20'}`}>
                               <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                 Personnel Accountability
                               </h4>
                               <div className="flex flex-col lg:flex-row gap-6">
                                  <div className="flex-1">
                                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Assign to Lead Investigator</label>
                                    <select 
                                      value={localAssignee[observation.id] || ""}
                                      onChange={(e) => setLocalAssignee(prev => ({ ...prev, [observation.id]: e.target.value }))}
                                      className={`w-full p-4.5 rounded-[1.2rem] border outline-none text-sm font-black transition-all ${isLight ? 'bg-white border-slate-200 shadow-sm focus:border-blue-500' : 'bg-slate-900 border-white/5 text-white focus:border-blue-500 focus:bg-black'}`}
                                    >
                                      <option value="">Select Assignee (Default: Unassigned)</option>
                                      {teamMembers.map(member => (
                                        <option key={member} value={member}>{member}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button 
                                    onClick={() => handleAssignToMember(observation.id)}
                                    disabled={reassigningId === observation.id || localAssignee[observation.id] === (observation.fields["Assigned To"] || "")}
                                    className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl disabled:opacity-30 transition-all flex items-center justify-center gap-3 active:scale-95"
                                  >
                                    {reassigningId === observation.id ? (
                                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Syncing...</span></>
                                    ) : 'Establish Assignment'}
                                  </button>
                               </div>
                            </div>
                          )}

                          {!observation.fields["Action taken"]?.trim() && (
                            <div className={`rounded-[2.5rem] p-10 border-2 shadow-2xl transition-all ${isLight ? 'bg-white border-blue-500/20' : 'bg-slate-900 border-blue-500/20 hover:border-blue-500/40'}`}>
                              <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                                Remediation Matrix
                              </h4>
                              <div className="space-y-8">
                                <div className="flex flex-col gap-2">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Remediation Chronology *</label>
                                  <textarea 
                                    rows={4} 
                                    placeholder="Detail all corrective actions implemented to stabilize the hazard..." 
                                    value={actionInputs[observation.id] || ''} 
                                    onChange={(e) => handleActionInputChange(observation.id, e.target.value)} 
                                    className={`${baseClasses} ${themeClasses} resize-none min-h-[140px] p-6 leading-relaxed`} 
                                  />
                                </div>
                                
                                <div className="pt-2">
                                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 mb-4 block">Closure Evidence (Post-Remediation)</label>
                                   <div className={`p-8 rounded-[2rem] border-2 border-dashed ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/10'}`}>
                                     <ImageGrid 
                                       images={closingImages[observation.id] || []} 
                                       onAdd={(e) => handleAddClosingImage(observation.id, e)} 
                                       onRemove={(imageId) => handleRemoveClosingImage(observation.id, imageId)} 
                                       onRetry={(imageId) => {
                                         const img = closingImages[observation.id]?.find(i => i.id === imageId);
                                         if (img) processClosingImageUpload(observation.id, img);
                                       }}
                                       appTheme={appTheme}
                                       hideHeader={true}
                                     />
                                   </div>
                                </div>

                                {resolveErrors[observation.id] && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest animate-in shake">{resolveErrors[observation.id]}</p>}
                                <button onClick={() => handleResolve(observation.id)} disabled={submittingIds.has(observation.id) || !actionInputs[observation.id]?.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-[2rem] transition-all uppercase tracking-[0.4em] text-[12px] shadow-2xl disabled:opacity-40 active:scale-95 border border-blue-400/30">
                                  {submittingIds.has(observation.id) ? 'SERIALIZING...' : 'AUTHORIZE CLOSURE & ARCHIVE'}
                                </button>
                              </div>
                            </div>
                          )}

                          {observation.fields["Action taken"]?.trim() && (
                             <div className={`rounded-[2.5rem] p-10 border-2 shadow-2xl ${isLight ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                  Post-Remediation Verification
                                </h4>
                                <div className={`text-[15px] p-8 rounded-[2.5rem] border leading-relaxed text-justify shadow-inner mb-8 ${isLight ? 'bg-white border-emerald-100 text-slate-700' : 'bg-black/30 border-white/5 text-slate-200'}`}>
                                  {observation.fields["Action taken"]}
                                </div>
                                
                                {observation.fields["Closed observations"] && observation.fields["Closed observations"].length > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                                    {observation.fields["Closed observations"].map((img, i) => (
                                      <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-[2rem] overflow-hidden border-2 border-emerald-500/20 shadow-xl group/img relative transition-all active:scale-95">
                                         <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="Resolution" />
                                         <div className="absolute inset-0 bg-emerald-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                         </div>
                                      </a>
                                    ))}
                                  </div>
                                )}

                                <div className="flex flex-col border-t border-white/5 pt-6">
                                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Digitally Authenticated By</span>
                                   <span className="text-sm font-black text-emerald-500 uppercase tracking-[0.2em]">{observation.fields["Closed by"]}</span>
                                </div>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};