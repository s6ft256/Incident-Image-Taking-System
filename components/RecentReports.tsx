
import React, { useEffect, useState } from 'react';
import { FetchedIncident, UploadedImage } from '../types';
import { getRecentReports, updateIncidentAction } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';

// Added appTheme to fix prop mismatch in App.tsx
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

  useEffect(() => {
    fetchReports();
  }, [baseId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await getRecentReports({ baseId });
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
              ? { ...img, status: 'success', serverUrl: publicUrl } 
              : img
          )
        }));
      } catch (err) {
        console.error("Upload failed", err);
        setClosingImages(prev => ({
          ...prev,
          [reportId]: prev[reportId].map(img => 
            img.id === newImage.id 
              ? { ...img, status: 'error' } 
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
        <button onClick={onBack} className="mr-4 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 className="text-xl font-bold text-white">Incident Log</h2>
      </div>

      <div className="flex p-1 mb-6 bg-slate-800 rounded-lg border border-slate-700">
        <button
          onClick={() => { setActiveTab('open'); setExpandedId(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
            activeTab === 'open'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
            <div className="relative min-h-[450px] flex flex-col items-center justify-center p-8 bg-slate-900 rounded-[2.5rem] border border-slate-700 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              {/* CLEAR BACKGROUND LOGO */}
              <img 
                src={LOGO_URL} 
                className="absolute inset-0 w-full h-full object-contain z-0 opacity-100 p-8"
                alt="TGC Logo"
              />
              <div className="absolute inset-0 bg-slate-950/40 z-10 backdrop-blur-[0.5px]"></div>
              
              <div className="relative z-20 flex flex-col items-center w-full max-w-xs text-center">
                <div className="bg-slate-800/90 p-6 rounded-full mb-8 shadow-2xl border border-blue-500/40 ring-8 ring-blue-500/10 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                
                <h3 className="text-4xl font-black text-white mb-2 tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">Admin.</h3>
                <p className="text-white text-[11px] font-black uppercase tracking-[0.4em] mb-10 bg-black/70 px-6 py-2 rounded-full border border-white/10 shadow-2xl">Restricted access</p>
                
                <form onSubmit={handleUnlock} className="flex flex-col gap-4 w-full px-4">
                  <div className="relative">
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter Secure Access Key"
                      className="w-full rounded-2xl border border-white/20 bg-black/80 px-5 py-4 text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none backdrop-blur-md transition-all text-center font-mono shadow-2xl"
                      autoFocus
                    />
                    {passwordError && (
                      <div className="absolute -bottom-6 left-0 right-0">
                         <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest">{passwordError}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/60 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs mt-6 border border-blue-400/40"
                  >
                    Unlock Observations
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredReports.length === 0 && (
                <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-slate-400">No {activeTab} observations found.</p>
                </div>
              )}
              
              {filteredReports.map((report) => {
                const isExpanded = expandedId === report.id;
                
                return (
                  <div 
                    key={report.id} 
                    className={`rounded-lg overflow-hidden transition-all duration-200 border ${
                      isExpanded 
                        ? 'bg-slate-800 border-blue-500/50 ring-1 ring-blue-500/50 shadow-lg' 
                        : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div 
                      onClick={() => handleRowClick(report.id)}
                      className="flex items-center gap-3 p-4 cursor-pointer"
                    >
                      <div className="w-20 text-xs font-mono text-slate-400 shrink-0">
                        {formatDateSimple(report.createdTime)}
                      </div>
                      <div className="w-24 sm:w-32 text-sm font-bold text-white truncate shrink-0">
                        {report.fields["Incident Type"] || 'N/A'}
                      </div>
                      <div className="flex-1 text-sm text-slate-300 truncate uppercase">
                         {report.fields["Site / Location"]}
                      </div>
                      <div className="shrink-0">
                        {activeTab === 'closed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-900/40 text-emerald-400 border border-emerald-800/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
                            Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-900/40 text-amber-400 border border-amber-800/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></span>
                            Open
                          </span>
                        )}
                      </div>
                      <div className={`text-slate-500 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </div>

                    {isExpanded && (
                       <div className="border-t border-slate-700/50 bg-slate-900/30 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-200">
                          {/* COMPREHENSIVE DATA HEADER as per user request */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 text-xs border-b border-slate-700/50 pb-6">
                             <div className="space-y-1">
                                <span className="block font-black text-slate-500 uppercase tracking-widest text-[9px]">Reporter</span>
                                <span className="text-slate-200 font-bold">{report.fields["Name"]}</span>
                             </div>
                             <div className="space-y-1">
                                <span className="block font-black text-slate-500 uppercase tracking-widest text-[9px]">Role</span>
                                <span className="text-slate-300">{report.fields["Role / Position"]}</span>
                             </div>
                             <div className="space-y-1">
                                <span className="block font-black text-slate-500 uppercase tracking-widest text-[9px]">Exact Time</span>
                                <span className="text-slate-300 font-mono">{formatDateDetail(report.createdTime)}</span>
                             </div>
                             {activeTab === 'closed' && (
                               <div className="space-y-1">
                                  <span className="block font-black text-slate-500 uppercase tracking-widest text-[9px]">Closed By / System</span>
                                  <div className="flex flex-col">
                                    <span className="text-emerald-400 font-black">{report.fields["Closed by"] || 'System'}</span>
                                    <span className="text-[8px] text-slate-600 uppercase font-bold">Verified Entry</span>
                                  </div>
                               </div>
                             )}
                          </div>

                          <div className="space-y-6">
                            {/* Observation and Initial Evidence */}
                            <div>
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Observation Context</h4>
                              <div className="bg-slate-900/60 rounded-xl p-4 text-sm text-slate-200 border border-slate-700 leading-relaxed shadow-inner">
                                 {report.fields["Observation"]}
                              </div>
                              
                              {report.fields["Open observations"] && report.fields["Open observations"].length > 0 && (
                                <div className="mt-4">
                                  <span className="block text-[9px] font-bold text-slate-600 uppercase mb-2">Initial Evidence (Images)</span>
                                  <div className="flex flex-wrap gap-3">
                                    {report.fields["Open observations"].map((img, idx) => (
                                      <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="relative group">
                                        <img 
                                          src={img.url} 
                                          className="h-24 w-24 object-cover rounded-lg border border-slate-700 shadow-lg group-hover:scale-105 transition-transform" 
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
                               <div className="bg-emerald-900/10 rounded-2xl p-5 border border-emerald-900/50 shadow-2xl space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                       <div className="p-1 bg-emerald-500 text-slate-900 rounded-full">
                                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                       </div>
                                       Remediation Action Taken
                                    </h4>
                                    <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase">Resolved</span>
                                  </div>
                                  
                                  <p className="text-sm text-emerald-50/90 leading-relaxed font-medium bg-emerald-950/20 p-4 rounded-xl border border-emerald-800/20">{report.fields["Action taken"]}</p>
                                  
                                  {report.fields["Closed observations"] && report.fields["Closed observations"].length > 0 && (
                                     <div>
                                        <span className="block text-[9px] font-bold text-emerald-600 uppercase mb-2">Closing Evidence (Verification Images)</span>
                                        <div className="flex flex-wrap gap-3">
                                           {report.fields["Closed observations"].map((img, idx) => (
                                              <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="relative group">
                                                 <img 
                                                  src={img.url} 
                                                  className="h-24 w-24 object-cover rounded-lg border border-emerald-800 shadow-xl group-hover:scale-105 transition-transform" 
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
                               <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-2xl">
                                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Finalize Remediation</h4>
                                  
                                  <div className="grid grid-cols-1 gap-5 mb-5">
                                    <div>
                                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Closed By / Signature</label>
                                      <input 
                                        type="text"
                                        value={closedByInputs[report.id] || ''}
                                        onChange={(e) => handleClosedByInputChange(report.id, e.target.value)}
                                        placeholder="Full Name / Authorized ID"
                                        className="w-full rounded-xl bg-black/40 border border-slate-700 text-slate-200 text-sm p-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Detailed Action Taken</label>
                                      <textarea 
                                        value={actionInputs[report.id] || ''}
                                        onChange={(e) => handleActionInputChange(report.id, e.target.value)}
                                        placeholder="Explain exactly how the incident was resolved and verified..."
                                        rows={3}
                                        className="w-full rounded-xl bg-black/40 border border-slate-700 text-slate-200 text-sm p-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner resize-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="mb-5">
                                      <div className="flex justify-between items-center mb-3">
                                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Resolution Evidence</span>
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${(closingImages[report.id] || []).length > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-500'}`}>
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
                                                        'border-slate-600 shadow-md'
                                                    }`}
                                                  />
                                                  <button 
                                                    onClick={() => handleRemoveClosingImage(report.id, img.id)}
                                                    className="absolute -top-2 -right-2 bg-slate-900 text-slate-400 hover:text-red-400 rounded-full p-1 border border-slate-700 shadow-xl transition-colors"
                                                  >
                                                     <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                  </button>
                                              </div>
                                          ))}
                                          {(!closingImages[report.id] || closingImages[report.id].length < 3) && (
                                              <label className="flex-shrink-0 h-20 w-20 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30 hover:border-slate-500 transition-all group">
                                                  <div className="p-1.5 bg-slate-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                                  </div>
                                                  <span className="text-[7px] text-slate-600 font-black uppercase mt-1 tracking-widest group-hover:text-slate-400">Capture</span>
                                                  <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    capture="environment"
                                                    className="hidden" 
                                                    onChange={(e) => handleAddClosingImage(report.id, e)} 
                                                  />
                                              </label>
                                          )}
                                      </div>
                                  </div>

                                  <button 
                                    onClick={() => handleResolve(report.id)}
                                    disabled={!actionInputs[report.id]?.trim() || !closedByInputs[report.id]?.trim() || submittingIds.has(report.id)}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-xs font-black py-4 rounded-xl transition-all flex justify-center items-center gap-3 shadow-xl active:scale-[0.98] uppercase tracking-[0.2em]"
                                  >
                                    {submittingIds.has(report.id) ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                                        ACQUIRING DATA...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        COMMIT RESOLUTION
                                      </>
                                    )}
                                  </button>
                                  {resolveErrors[report.id] && <p className="text-rose-400 text-[9px] mt-3 font-black uppercase tracking-widest text-center">{resolveErrors[report.id]}</p>}
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
    </div>
  );
};
