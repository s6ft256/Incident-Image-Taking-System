
import React, { useEffect, useState } from 'react';
import { FetchedIncident, UploadedImage } from '../types';
import { getRecentReports, updateIncidentAction } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';

interface RecentReportsProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
}

type Tab = 'open' | 'closed';

export const RecentReports: React.FC<RecentReportsProps> = ({ baseId, onBack, appTheme = 'dark' }) => {
  const [reports, setReports] = useState<FetchedIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('open');

  // Theme check
  const isLight = appTheme === 'light';

  // Admin Protection State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // State to track text input for each report
  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});
  const [closedByInputs, setClosedByInputs] = useState<Record<string, string>>({});
  
  // State to track closing images for each report [ReportID -> Images[]]
  const [closingImages, setClosingImages] = useState<Record<string, UploadedImage[]>>({});
  
  // State to track which report is currently submitting an update
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  
  // State to track expanded card in Open view
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Per-report error messages for resolution actions
  const [resolveErrors, setResolveErrors] = useState<Record<string, string>>({});

  // Confirmation state
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [baseId]);

  const fetchReports = async (configOverride?: { baseId: string }) => {
    try {
      setLoading(true);
      const data = await getRecentReports(configOverride || { baseId });
      setReports(data);
    } catch (err: any) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
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

      try {
        const fileToUpload = await compressImage(file);
        const publicUrl = await uploadImageToStorage(fileToUpload, 'closed');
        
        setClosingImages(prev => ({
          ...prev,
          [reportId]: prev[reportId].map(img => 
            img.id === newImage.id 
              ? { ...img, status: 'success', serverUrl: publicUrl, progress: 100 } 
              : img
          )
        }));
      } catch (err) {
        console.error("Upload failed", err);
        setClosingImages(prev => ({
          ...prev,
          [reportId]: prev[reportId].map(img => 
            img.id === newImage.id 
              ? { ...img, status: 'error', progress: 0 } 
              : img
          )
        }));
      }
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
    if (resolveErrors[reportId]) {
       setResolveErrors(prev => { const n = {...prev}; delete n[reportId]; return n; });
    }
  };

  const handleResolve = async (id: string) => {
    setConfirmingId(null);
    setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });

    const actionTaken = actionInputs[id];
    const closedBy = closedByInputs[id];
    
    if (!actionTaken || !actionTaken.trim() || !closedBy || !closedBy.trim()) {
        setResolveErrors(prev => ({...prev, [id]: "All fields (Closed By and Action Taken) are required."}));
        return;
    }

    const currentImages = closingImages[id] || [];
    
    if (currentImages.some(img => img.status === 'uploading')) {
        setResolveErrors(prev => ({...prev, [id]: "Please wait for all images to finish uploading."}));
        return;
    }
    
    const failedImages = currentImages.filter(img => img.status === 'error');
    if (failedImages.length > 0) {
        setResolveErrors(prev => ({...prev, [id]: "Cannot submit. Some images failed to upload. Please remove or retry them."}));
        return;
    }

    setSubmittingIds(prev => new Set(prev).add(id));
    
    try {
      const attachmentData = currentImages
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({
          url: img.serverUrl!,
          filename: img.file.name
        }));

      await updateIncidentAction(id, actionTaken, closedBy, attachmentData, { baseId });
      
      setReports(prev => prev.map(report => {
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
      
      setActionInputs(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      setClosedByInputs(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      setClosingImages(prev => {
         const newState = { ...prev };
         if (newState[id]) newState[id].forEach(img => URL.revokeObjectURL(img.previewUrl));
         delete newState[id];
         return newState;
      });
      setExpandedId(null);

    } catch (err: any) {
      console.error("Failed to resolve incident", err);
      const msg = err.message || "Unknown error occurred.";
      setResolveErrors(prev => ({...prev, [id]: `Submission failed: ${msg}`}));
    } finally {
      setSubmittingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatDateSimple = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    });
  };

  const formatDateDetail = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://placehold.co/100x100/334155/94a3b8?text=Expired';
    e.currentTarget.onerror = null;
  };

  const filteredReports = reports.filter(report => {
    const hasAction = report.fields["Action taken"] && report.fields["Action taken"].trim().length > 0;
    return activeTab === 'closed' ? hasAction : !hasAction;
  });

  const LOGO_URL = "https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png";

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className={`mr-4 transition-colors ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Incident Log</h2>
      </div>

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
            {reports.filter(r => !r.fields["Action taken"]?.trim()).length}
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
          Closed
          <span className="ml-2 bg-emerald-500/30 text-emerald-100 text-[10px] px-1.5 py-0.5 rounded-full">
            {reports.filter(r => r.fields["Action taken"]?.trim()).length}
          </span>
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isLight ? 'border-blue-600' : 'border-white'}`}></div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {activeTab === 'closed' && !isAdminUnlocked ? (
            <div className={`relative min-h-[450px] flex flex-col items-center justify-center p-8 rounded-[2.5rem] border overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
            }`}>
              {/* Logo Background */}
              <img 
                src={LOGO_URL} 
                className={`absolute inset-0 w-full h-full object-contain z-0 p-8 ${isLight ? 'opacity-30' : 'opacity-100'}`}
                alt="TGC Logo"
              />
              {/* Overlay with zero transparency in Light mode */}
              <div className={`absolute inset-0 z-10 ${isLight ? 'bg-white' : 'bg-slate-950/40 backdrop-blur-[0.5px]'}`}></div>
              
              <div className="relative z-20 flex flex-col items-center w-full max-w-xs text-center">
                <div className={`p-6 rounded-full mb-8 shadow-2xl border transition-colors ${
                  isLight ? 'bg-slate-50 border-blue-100 ring-8 ring-blue-50' : 'bg-slate-800/90 border-blue-500/40 ring-8 ring-blue-500/10'
                } animate-pulse`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                
                <h3 className={`text-4xl font-black mb-2 tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Admin.</h3>
                <p className={`text-[11px] font-black uppercase tracking-[0.4em] mb-10 px-6 py-2 rounded-full border shadow-2xl ${
                  isLight ? 'bg-white text-slate-500 border-slate-200' : 'bg-black/70 text-white border-white/10'
                }`}>Restricted access</p>
                
                <form onSubmit={handleUnlock} className="flex flex-col gap-4 w-full px-4">
                  <div className="relative">
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter Secure Access Key"
                      className={`w-full rounded-2xl border px-5 py-4 outline-none transition-all text-center font-mono shadow-2xl ${
                        isLight 
                          ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500' 
                          : 'bg-black/80 border-white/20 text-white placeholder:text-slate-600 focus:border-blue-500'
                      }`}
                      autoFocus
                    />
                    {passwordError && (
                      <div className="absolute -bottom-6 left-0 right-0">
                         <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{passwordError}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs mt-6 border border-blue-400/40"
                  >
                    Unlock Observations
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredReports.length === 0 && (
                <div className={`text-center py-12 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
                  <p>No {activeTab} observations found.</p>
                </div>
              )}
              
              {filteredReports.map((report) => {
                const isExpanded = expandedId === report.id;
                
                return (
                  <div 
                    key={report.id} 
                    className={`rounded-lg overflow-hidden transition-all duration-200 border ${
                      isExpanded 
                        ? `${isLight ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-blue-500/50 ring-1 ring-blue-500/50 shadow-lg'}` 
                        : `${isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-slate-600'}`
                    }`}
                  >
                    <div 
                      onClick={() => handleRowClick(report.id)}
                      className="flex items-center gap-3 p-4 cursor-pointer"
                    >
                      <div className={`w-20 text-xs font-mono shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatDateSimple(report.createdTime)}
                      </div>
                      <div className={`w-24 sm:w-32 text-sm font-bold truncate shrink-0 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {report.fields["Incident Type"] || 'N/A'}
                      </div>
                      <div className={`flex-1 text-sm truncate uppercase ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                         {report.fields["Site / Location"]}
                      </div>
                      <div className="shrink-0">
                        {activeTab === 'closed' ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isLight 
                              ? 'bg-emerald-500 text-white border-emerald-600' 
                              : 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isLight ? 'bg-white' : 'bg-emerald-500'}`}></span>
                            Closed
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isLight 
                              ? 'bg-amber-500 text-white border-amber-600' 
                              : 'bg-amber-900/40 text-amber-400 border border-amber-800/50'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isLight ? 'bg-white' : 'bg-amber-500'}`}></span>
                            Open
                          </span>
                        )}
                      </div>
                      <div className={`shrink-0 transition-transform duration-200 ${isLight ? 'text-slate-400' : 'text-slate-500'} ${isExpanded ? 'rotate-90' : ''}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </div>

                    {isExpanded && (
                       <div className={`border-t p-4 sm:p-6 animate-in slide-in-from-top-2 duration-200 ${isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-700/50 bg-slate-900/30'}`}>
                          {/* COMPREHENSIVE DATA HEADER */}
                          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 text-xs border-b pb-6 ${isLight ? 'border-slate-200' : 'border-slate-700/50'}`}>
                             <div className="space-y-1">
                                <span className={`block font-black uppercase tracking-widest text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Reporter</span>
                                <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{report.fields["Name"]}</span>
                             </div>
                             <div className="space-y-1">
                                <span className={`block font-black uppercase tracking-widest text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Role</span>
                                <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>{report.fields["Role / Position"]}</span>
                             </div>
                             <div className="space-y-1">
                                <span className={`block font-black uppercase tracking-widest text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Exact Time</span>
                                <span className={`font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{formatDateDetail(report.createdTime)}</span>
                             </div>
                             {activeTab === 'closed' && (
                               <div className="space-y-1">
                                  <span className={`block font-black uppercase tracking-widest text-[9px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Closed By</span>
                                  <div className="flex flex-col">
                                    <span className="text-emerald-600 font-black">{report.fields["Closed by"] || 'System'}</span>
                                    <span className={`text-[8px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>Verified Entry</span>
                                  </div>
                               </div>
                             )}
                          </div>

                          <div className="space-y-6">
                            {/* Observation and Initial Evidence */}
                            <div>
                              <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Observation Context</h4>
                              <div className={`rounded-xl p-4 text-sm border leading-relaxed shadow-inner ${
                                isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-700 text-slate-200'
                              }`}>
                                 {report.fields["Observation"]}
                              </div>
                              
                              {report.fields["Open observations"] && report.fields["Open observations"].length > 0 && (
                                <div className="mt-4">
                                  <span className={`block text-[9px] font-bold uppercase mb-2 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>Initial Evidence</span>
                                  <div className="flex flex-wrap gap-3">
                                    {report.fields["Open observations"].map((img, idx) => (
                                      <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="relative group">
                                        <img 
                                          src={img.url} 
                                          className={`h-24 w-24 object-cover rounded-lg border shadow-lg group-hover:scale-105 transition-transform ${isLight ? 'border-slate-200' : 'border-slate-700'}`} 
                                          onError={handleImageError} 
                                          alt={`Evidence ${idx + 1}`}
                                        />
                                        <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center">
                                          <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {activeTab === 'closed' ? (
                               <div className={`rounded-2xl p-5 border shadow-2xl space-y-4 ${
                                 isLight ? 'bg-emerald-50 border-emerald-600' : 'bg-emerald-900/10 border-emerald-900/50'
                               }`}>
                                  <div className="flex items-center justify-between">
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isLight ? 'text-emerald-700' : 'text-emerald-500'}`}>
                                       <div className={`p-1 rounded-full ${isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-slate-900'}`}>
                                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                       </div>
                                       Remediation Action Taken
                                    </h4>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-400'}`}>Resolved</span>
                                  </div>
                                  
                                  <p className={`text-sm leading-relaxed font-medium p-4 rounded-xl border ${
                                    isLight ? 'bg-white border-emerald-100 text-emerald-900' : 'bg-emerald-950/20 border-emerald-800/20 text-emerald-50/90'
                                  }`}>
                                    {report.fields["Action taken"]}
                                  </p>
                                  
                                  {report.fields["Closed observations"] && report.fields["Closed observations"].length > 0 && (
                                     <div>
                                        <span className={`block text-[9px] font-bold uppercase mb-2 ${isLight ? 'text-emerald-700' : 'text-emerald-600'}`}>Closing Evidence</span>
                                        <div className="flex flex-wrap gap-3">
                                           {report.fields["Closed observations"].map((img, idx) => (
                                              <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="relative group">
                                                 <img 
                                                  src={img.url} 
                                                  className={`h-24 w-24 object-cover rounded-lg border shadow-xl group-hover:scale-105 transition-transform ${isLight ? 'border-emerald-600' : 'border-emerald-800'}`} 
                                                  onError={handleImageError} 
                                                  alt={`Resolution ${idx + 1}`}
                                                 />
                                                 <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity flex items-center justify-center">
                                                   <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                                 </div>
                                              </a>
                                           ))}
                                        </div>
                                     </div>
                                  )}
                               </div>
                            ) : (
                               <div className={`rounded-2xl p-5 border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                                  <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>Finalize Remediation</h4>
                                  
                                  <div className="grid grid-cols-1 gap-5 mb-5">
                                    <div>
                                      <label className={`text-[9px] font-black uppercase tracking-widest mb-2 block ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Closed By / Signature</label>
                                      <input 
                                        type="text"
                                        value={closedByInputs[report.id] || ''}
                                        onChange={(e) => handleClosedByInputChange(report.id, e.target.value)}
                                        placeholder="Full Name / Authorized ID"
                                        className={`w-full rounded-xl border text-sm p-4 outline-none transition-all shadow-inner ${
                                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-black/40 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                        }`}
                                      />
                                    </div>
                                    <div>
                                      <label className={`text-[9px] font-black uppercase tracking-widest mb-2 block ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Detailed Action Taken</label>
                                      <textarea 
                                        value={actionInputs[report.id] || ''}
                                        onChange={(e) => handleActionInputChange(report.id, e.target.value)}
                                        placeholder="Explain exactly how the incident was resolved and verified..."
                                        rows={3}
                                        className={`w-full rounded-xl border text-sm p-4 outline-none transition-all shadow-inner resize-none ${
                                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500' : 'bg-black/40 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  <div className="mb-5">
                                      <div className="flex justify-between items-center mb-3">
                                          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Resolution Evidence</span>
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                            (closingImages[report.id] || []).length > 0 ? 'bg-blue-500/20 text-blue-400' : `${isLight ? 'bg-slate-200 text-slate-500' : 'bg-slate-700 text-slate-500'}`
                                          }`}>
                                            {(closingImages[report.id] || []).length}/3
                                          </span>
                                      </div>
                                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                          {(closingImages[report.id] || []).map((img) => (
                                              <div key={img.id} className="relative flex-shrink-0 h-20 w-20 group">
                                                  <img 
                                                    src={img.previewUrl} 
                                                    className={`h-full w-full object-cover rounded-xl border-2 transition-all ${
                                                        img.status === 'error' ? 'border-red-500 opacity-50 shadow-red-500/20' : 
                                                        img.status === 'uploading' ? 'border-blue-500 opacity-70 animate-pulse' : 
                                                        `${isLight ? 'border-slate-200' : 'border-slate-600'}`
                                                    }`}
                                                  />
                                                  <button 
                                                    onClick={() => handleRemoveClosingImage(report.id, img.id)}
                                                    className={`absolute -top-2 -right-2 rounded-full p-1 border shadow-xl transition-colors ${
                                                      isLight ? 'bg-white text-slate-400 hover:text-red-500 border-slate-200' : 'bg-slate-900 text-slate-400 hover:text-red-400 border border-slate-700'
                                                    }`}
                                                  >
                                                     <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                  </button>
                                              </div>
                                          ))}
                                          {(!closingImages[report.id] || closingImages[report.id].length < 3) && (
                                              <div className={`flex-shrink-0 w-20 h-20 border-2 border-dashed rounded-xl overflow-hidden flex flex-col transition-all ${
                                                isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-700/10 border-slate-700'
                                              }`}>
                                                <label className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all active:bg-blue-600/10 ${
                                                  isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'
                                                }`}>
                                                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                                                  </svg>
                                                  <span className="text-[6px] font-black uppercase mt-0.5 tracking-tighter">CAM</span>
                                                  <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    capture="environment"
                                                    className="hidden" 
                                                    onChange={(e) => handleAddClosingImage(report.id, e)} 
                                                  />
                                                </label>
                                                <div className={`h-[1px] w-full ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}></div>
                                                <label className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all active:bg-blue-600/10 ${
                                                  isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'
                                                }`}>
                                                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                                                  </svg>
                                                  <span className="text-[6px] font-black uppercase mt-0.5 tracking-tighter">UP</span>
                                                  <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={(e) => handleAddClosingImage(report.id, e)} 
                                                  />
                                                </label>
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  <button 
                                    onClick={() => {
                                      const currentImages = closingImages[report.id] || [];
                                      const actionTaken = actionInputs[report.id] || '';
                                      const closedBy = closedByInputs[report.id] || '';
                                      
                                      if (actionTaken.trim() && closedBy.trim() && !currentImages.some(img => img.status === 'uploading')) {
                                          setConfirmingId(report.id);
                                      } else {
                                          handleResolve(report.id); // Triggers existing error logic
                                      }
                                    }}
                                    disabled={!actionInputs[report.id]?.trim() || !closedByInputs[report.id]?.trim() || submittingIds.has(report.id)}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 text-xs font-black py-4 rounded-xl transition-all flex justify-center items-center gap-3 shadow-xl active:scale-[0.98] uppercase tracking-[0.2em] text-white"
                                  >
                                    {submittingIds.has(report.id) ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ACQUIRING DATA...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        COMMIT RESOLUTION
                                      </>
                                    )}
                                  </button>
                                  {resolveErrors[report.id] && <p className="text-rose-500 text-[9px] mt-3 font-black uppercase tracking-widest text-center">{resolveErrors[report.id]}</p>}
                               </div>
                            )}
                          </div>
                       </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {confirmingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setConfirmingId(null)}
          ></div>
          <div className={`relative w-full max-w-sm rounded-[2.5rem] border shadow-2xl animate-in zoom-in duration-300 overflow-hidden ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
          }`}>
            <div className={`p-8 text-center space-y-6 ${isLight ? 'bg-slate-50' : 'bg-white/[0.02]'}`}>
                <div className="w-20 h-20 rounded-full bg-blue-600/10 border-4 border-blue-600/20 flex items-center justify-center mx-auto text-blue-500 shadow-2xl">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="space-y-2">
                    <h3 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Verify Resolution</h3>
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Integrity Check Required</p>
                </div>
                <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Are you certain that the corrective actions taken fulfill the safety requirements? Once committed, this observation will be archived as <span className="text-emerald-500 font-bold">CLOSED</span>.
                </p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmingId(null)}
                  className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    isLight ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleResolve(confirmingId)}
                  className="py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/20"
                >
                  Confirm & Commit
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
