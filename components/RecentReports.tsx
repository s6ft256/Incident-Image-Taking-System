
import React, { useEffect, useState } from 'react';
import { FetchedIncident, UploadedImage } from '../types';
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

export const RecentReports: React.FC<RecentReportsProps> = ({ baseId, onBack, appTheme = 'dark', filterAssignee }) => {
  const [allReports, setAllReports] = useState<FetchedIncident[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('open');

  const isLight = appTheme === 'light';
  const isMyTasksMode = !!filterAssignee;

  // In My Tasks, we never show closed observations and skip the admin lock
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(isMyTasksMode);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});
  const [closedByInputs, setClosedByInputs] = useState<Record<string, string>>({});
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
      setTeamMembers(profiles.map(p => p.name));
    } catch (err) {
      console.error("Failed to load team members", err);
    }
  };

  const handleActionInputChange = (id: string, value: string) => {
    setActionInputs(prev => ({ ...prev, [id]: value }));
    if (resolveErrors[id]) {
        setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });
    }
  };

  const handleClosedByInputChange = (id: string, value: string) => {
    setClosedByInputs(prev => ({ ...prev, [id]: value }));
    if (resolveErrors[id]) {
        setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });
    }
  };

  const handleRowClick = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'AmxC@123@') {
      setIsAdminUnlocked(true);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Incorrect password');
      setPasswordInput('');
    }
  };

  const handleReassign = async (reportId: string, assignee: string) => {
    setReassigningId(reportId);
    setAssignmentSuccess(null);
    try {
      await assignIncident(reportId, assignee, { baseId });
      setAllReports(prev => prev.map(r => r.id === reportId ? { ...r, fields: { ...r.fields, "Assigned To": assignee } } : r));
      
      if (assignee) {
        setAssignmentSuccess(`Successfully assigned to ${assignee}`);
        setTimeout(() => setAssignmentSuccess(null), 3000);
        // Automatically collapse the row since it will disappear from the unassigned list
        setTimeout(() => setExpandedId(null), 500);
      }
    } catch (err: any) {
      setResolveErrors(prev => ({ ...prev, [reportId]: "Assignment failed: " + err.message }));
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
    setConfirmingId(null);
    setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });

    const actionTaken = actionInputs[id];
    const closedBy = closedByInputs[id];
    
    if (!actionTaken?.trim() || !closedBy?.trim()) {
        setResolveErrors(prev => ({...prev, [id]: "Both Closed By and Action Taken are required."}));
        return;
    }

    const currentImages = closingImages[id] || [];
    if (currentImages.some(img => img.status === 'uploading')) {
        setResolveErrors(prev => ({...prev, [id]: "Wait for uploads to finish."}));
        return;
    }

    setSubmittingIds(prev => new Set(prev).add(id));
    
    try {
      const attachmentData = currentImages
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));

      await updateIncidentAction(id, actionTaken, closedBy, attachmentData, { baseId });
      
      setAllReports(prev => prev.map(report => {
        if (report.id === id) {
          return {
            ...report,
            fields: {
              ...report.fields,
              "Action taken": actionTaken,
              "Closed by": closedBy,
              "Closed observations": attachmentData.map(a => ({ url: a.url, filename: a.filename }))
            }
          };
        }
        return report;
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

  // Pre-sort reports by creation time
  const sortedReports = [...allReports].sort((a, b) => {
    const timeA = new Date(a.createdTime).getTime();
    const timeB = new Date(b.createdTime).getTime();
    return activeTab === 'open' ? timeA - timeB : timeB - timeA;
  });

  // Final filtering logic:
  // 1. My Tasks: Only Open incidents assigned to the user.
  // 2. Global Open: Only Open incidents with NO assignee.
  // 3. Global Closed: All incidents with Action Taken.
  const tabFilteredReports = sortedReports.filter(report => {
    const isClosed = report.fields["Action taken"]?.trim().length > 0;
    const assignedTo = report.fields["Assigned To"]?.trim() || "";
    
    if (isMyTasksMode) {
      return !isClosed && assignedTo === filterAssignee;
    }

    if (activeTab === 'closed') {
      return isClosed;
    }

    // Global Open tab: Only show unassigned open reports
    return !isClosed && !assignedTo;
  });

  const LOGO_URL = "https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png";

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
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-emerald-400/30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-black uppercase tracking-widest">{assignmentSuccess}</span>
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
            Open (Unassigned)
            <span className="ml-2 bg-blue-500/30 text-blue-100 text-[10px] px-1.5 py-0.5 rounded-full">
                {allReports.filter(r => !r.fields["Action taken"]?.trim() && !r.fields["Assigned To"]?.trim()).length}
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

      {!loading && !error && (
        <>
          {activeTab === 'closed' && !isAdminUnlocked && !isMyTasksMode ? (
            <div className={`relative min-h-[450px] flex flex-col items-center justify-center p-8 rounded-[2.5rem] border overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
            }`}>
              <img src={LOGO_URL} className={`absolute inset-0 w-full h-full object-contain z-0 p-8 ${isLight ? 'opacity-30' : 'opacity-100'}`} alt="TGC Logo" />
              <div className={`absolute inset-0 z-10 ${isLight ? 'bg-white' : 'bg-slate-950/40 backdrop-blur-[0.5px]'}`}></div>
              <div className="relative z-20 flex flex-col items-center w-full max-w-xs text-center">
                <div className={`p-6 rounded-full mb-8 shadow-2xl border transition-colors ${
                  isLight ? 'bg-slate-50 border-blue-100 ring-8 ring-blue-50' : 'bg-slate-800/90 border-blue-500/40 ring-8 ring-blue-500/10'
                } animate-pulse`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 className={`text-4xl font-black mb-2 tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Admin.</h3>
                <p className={`text-[11px] font-black uppercase tracking-[0.4em] mb-10 px-6 py-2 rounded-full border shadow-2xl ${
                  isLight ? 'bg-white text-slate-500 border-slate-200' : 'bg-black/70 text-white border-white/10'
                }`}>Restricted Access Protocol</p>
                <form onSubmit={handleUnlock} className="flex flex-col gap-4 w-full px-4">
                  <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Access Key" className={`w-full rounded-2xl border px-5 py-4 outline-none text-center font-mono ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-black/80 border-white/20 text-white'}`} autoFocus />
                  {passwordError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{passwordError}</p>}
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-[0.2em] text-xs">Unlock</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {tabFilteredReports.length === 0 && (
                <div className={`text-center py-20 rounded-[2rem] border-2 border-dashed ${isLight ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-800/20 border-slate-800 text-slate-500'}`}>
                  <p className="text-sm font-black uppercase tracking-[0.2em]">
                    {isMyTasksMode ? 'Clear Schedule' : `No unassigned ${activeTab} observations`}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest mt-2 px-6">
                    {isMyTasksMode 
                      ? 'You have no pending assignments at this time.' 
                      : (activeTab === 'open' 
                          ? 'All open incidents have been assigned to team members.' 
                          : 'The archive is currently empty.')}
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
                        {report.fields["Action taken"]?.trim() ? 'Closed' : (report.fields["Assigned To"]?.trim() ? 'Assigned' : 'Unassigned')}
                      </span>
                    </div>
                    <div className={`shrink-0 transition-transform ${expandedId === report.id ? 'rotate-90 text-blue-500' : 'text-slate-600'}`}>
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>

                  {expandedId === report.id && (
                    <div className={`border-t p-6 space-y-8 animate-in slide-in-from-top-4 duration-300 ${isLight ? 'bg-slate-50/50' : 'bg-black/20'}`}>
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
                        {/* Assignment Information */}
                        {!isMyTasksMode && !report.fields["Action taken"]?.trim() && (
                            <div className="col-span-2 lg:col-span-1">
                                <span className="block text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Assign to Member</span>
                                <select 
                                    className={`w-full p-2 text-xs font-bold rounded-lg border outline-none ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10 text-white'}`}
                                    value={report.fields["Assigned To"] || ""}
                                    disabled={reassigningId === report.id}
                                    onChange={(e) => handleReassign(report.id, e.target.value)}
                                >
                                    <option value="">None (Unassigned)</option>
                                    {teamMembers.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Observation Narrative</h4>
                        <p className={`text-sm p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/5 text-slate-300'}`}>{report.fields["Observation"]}</p>
                        
                        {report.fields["Open observations"] && (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {report.fields["Open observations"].map((img, i) => (
                              <a key={i} href={img.url} target="_blank" className="block shrink-0 h-24 w-24 rounded-lg overflow-hidden border-2 border-white/10 shadow-lg hover:scale-105 transition-transform">
                                <img src={img.url} className="h-full w-full object-cover" alt="Evidence" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {report.fields["Action taken"]?.trim() ? (
                        <div className={`rounded-2xl p-6 border-2 ${isLight ? 'bg-emerald-50 border-emerald-100' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Final Resolution</h4>
                          <p className={`text-sm mb-4 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{report.fields["Action taken"]}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-slate-500 uppercase">Verified By:</span>
                            <span className="text-xs font-black text-emerald-500 uppercase">{report.fields["Closed by"]}</span>
                          </div>
                          {report.fields["Closed observations"] && (
                            <div className="flex gap-2 mt-4 overflow-x-auto">
                                {report.fields["Closed observations"].map((img, i) => (
                                <a key={i} href={img.url} target="_blank" className="block shrink-0 h-20 w-20 rounded-lg overflow-hidden border border-emerald-500/30">
                                    <img src={img.url} className="h-full w-full object-cover" alt="Closure" />
                                </a>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`rounded-2xl p-6 border-2 ${isLight ? 'bg-white border-blue-500/20 shadow-xl' : 'bg-slate-900 border-white/10'}`}>
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Task Finalization</h4>
                          <div className="space-y-4">
                            <input type="text" placeholder="Your Authorized Name" value={closedByInputs[report.id] || ''} onChange={(e) => handleClosedByInputChange(report.id, e.target.value)} className={`w-full p-4 rounded-xl border text-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10 text-white'}`} />
                            <textarea rows={3} placeholder="Describe corrective actions taken..." value={actionInputs[report.id] || ''} onChange={(e) => handleActionInputChange(report.id, e.target.value)} className={`w-full p-4 rounded-xl border text-sm resize-none ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10 text-white'}`} />
                            
                            <div className="flex gap-3 pb-2 overflow-x-auto">
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

                            <button onClick={() => setConfirmingId(report.id)} disabled={submittingIds.has(report.id) || !actionInputs[report.id]?.trim()} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest text-[10px] shadow-xl shadow-blue-900/20">
                              {submittingIds.has(report.id) ? 'Processing...' : 'Commit Resolution'}
                            </button>
                            {resolveErrors[report.id] && <p className="text-center text-rose-500 text-[10px] font-black uppercase tracking-widest">{resolveErrors[report.id]}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {confirmingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setConfirmingId(null)}></div>
          <div className={`relative w-full max-w-sm rounded-[2.5rem] border p-8 space-y-6 text-center shadow-2xl animate-in zoom-in duration-300 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
            <h3 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Archive Task?</h3>
            <p className="text-sm text-slate-500">Confirm remediation is complete. This action will archive the task permanently.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmingId(null)} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-100' : 'bg-white/5 text-slate-400'}`}>Cancel</button>
              <button onClick={() => handleResolve(confirmingId)} className="py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
