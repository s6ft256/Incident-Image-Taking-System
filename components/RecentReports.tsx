import React, { useEffect, useState } from 'react';
import { FetchedIncident, UploadedImage } from '../types';
import { getRecentReports, updateIncidentAction } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';

interface RecentReportsProps {
  baseId: string;
  onBack: () => void;
}

type Tab = 'open' | 'closed';

export const RecentReports: React.FC<RecentReportsProps> = ({ baseId, onBack }) => {
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
  // State to track closing images for each report [ReportID -> Images[]]
  const [closingImages, setClosingImages] = useState<Record<string, UploadedImage[]>>({});
  
  // State to track which report is currently submitting an update
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  
  // State to track expanded card in Open view
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
  };

  const handleCardClick = (id: string) => {
    if (activeTab === 'open') {
        setExpandedId(prev => prev === id ? null : id);
    }
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

      // Add to state immediately
      setClosingImages(prev => ({
        ...prev,
        [reportId]: [...(prev[reportId] || []), newImage]
      }));
      
      // Clear input
      e.target.value = '';

      // Upload Logic
      try {
        const fileToUpload = await compressImage(file);
        // Explicitly specifying 'closed' folder for closing images
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
  };

  const handleResolve = async (id: string) => {
    const actionTaken = actionInputs[id];
    if (!actionTaken || !actionTaken.trim()) return;

    // Check if any images are still uploading or failed
    const currentImages = closingImages[id] || [];
    if (currentImages.some(img => img.status === 'uploading')) {
        alert("Please wait for images to finish uploading.");
        return;
    }
    if (currentImages.some(img => img.status === 'error')) {
        alert("Please remove failed images before submitting.");
        return;
    }

    setSubmittingIds(prev => new Set(prev).add(id));
    
    try {
      // Prepare attachment data
      const attachmentData = currentImages
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({
          url: img.serverUrl!,
          filename: img.file.name
        }));

      // This saves "actionTaken" to "Action taken" field in Airtable
      await updateIncidentAction(id, actionTaken, attachmentData, { baseId });
      
      // Optimistic update
      setReports(prev => prev.map(report => {
        if (report.id === id) {
          return {
            ...report,
            fields: {
              ...report.fields,
              "Action taken": actionTaken,
              "Closed observations": attachmentData.map(a => ({ url: a.url, filename: a.filename }))
            }
          };
        }
        return report;
      }));
      
      // Cleanup state
      setActionInputs(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      setClosingImages(prev => {
         const newState = { ...prev };
         // Cleanup URLs
         if (newState[id]) newState[id].forEach(img => URL.revokeObjectURL(img.previewUrl));
         delete newState[id];
         return newState;
      });
      // Collapse card after success
      setExpandedId(null);

    } catch (err) {
      console.error("Failed to resolve incident", err);
      alert("Failed to update report. Please try again.");
    } finally {
      setSubmittingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://placehold.co/100x100/334155/94a3b8?text=Expired';
    e.currentTarget.onerror = null; // prevent infinite loop
  };

  // Logic: Closed if "Action taken" exists and is not empty. Open otherwise.
  const filteredReports = reports.filter(report => {
    const hasAction = report.fields["Action taken"] && report.fields["Action taken"].trim().length > 0;
    return activeTab === 'closed' ? hasAction : !hasAction;
  });

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 className="text-xl font-bold text-white">Incident Log</h2>
      </div>

      {/* Tabs */}
      <div className="flex p-1 mb-6 bg-slate-800 rounded-lg border border-slate-700">
        <button
          onClick={() => { setActiveTab('open'); setExpandedId(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
            activeTab === 'open'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          Open Observations
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
          Closed Observations
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
          {/* Admin Authentication Screen for Closed Tab */}
          {activeTab === 'closed' && !isAdminUnlocked ? (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-800 rounded-lg border border-slate-700 animate-in fade-in zoom-in duration-300">
              <div className="bg-slate-700 p-4 rounded-full mb-4 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Admin</h3>
              <p className="text-slate-400 text-sm mb-6">Restricted Access: Closed Observations</p>
              
              <form onSubmit={handleUnlock} className="flex flex-col gap-4 w-full max-w-xs px-4">
                <div>
                  <input 
                    type="password" 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter Password"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    autoFocus
                  />
                  {passwordError && <p className="text-red-400 text-xs mt-2 pl-1">{passwordError}</p>}
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]"
                >
                  Unlock
                </button>
              </form>
            </div>
          ) : (
            <>
              {filteredReports.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col items-center">
                  <div className="bg-slate-700/50 p-4 rounded-full mb-3">
                     {activeTab === 'open' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                     ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                     )}
                  </div>
                  <p className="text-slate-400">No {activeTab} observations found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => {
                    const isExpanded = expandedId === report.id;
                    
                    // Calculate if report is older than 3 hours
                    const createdDate = new Date(report.createdTime);
                    const hoursSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
                    const isOverdue = activeTab === 'open' && hoursSinceCreation > 3;

                    return (
                      <div 
                        key={report.id} 
                        onClick={() => handleCardClick(report.id)}
                        className={`rounded-lg p-4 border shadow-md transition-all duration-200 
                          ${activeTab === 'open' ? 'cursor-pointer active:scale-[0.995]' : ''} 
                          ${isExpanded 
                              ? 'bg-slate-800 ring-1 ring-blue-500/50 border-blue-500/50 shadow-lg shadow-black/40' 
                              : isOverdue 
                                  ? 'bg-red-950/20 border-red-500/50 hover:bg-red-900/30 hover:border-red-400/50' 
                                  : 'bg-slate-800 border-slate-700 hover:border-blue-500/40 hover:bg-slate-800/80'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-white flex items-center gap-2">
                              {report.fields["Name"] || 'Unknown'}
                              {activeTab === 'open' && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${isExpanded ? 'bg-blue-900/40 border-blue-800 text-blue-300' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                                      {isExpanded ? 'Editing' : 'Click to Edit'}
                                  </span>
                              )}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <p className="text-xs text-blue-400 font-medium">{report.fields["Role / Position"]}</p>
                                {report.fields["Incident Type"] && (
                                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-600">
                                        {report.fields["Incident Type"]}
                                    </span>
                                )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-1 rounded font-mono ${isOverdue ? 'text-red-300 bg-red-950/50 border border-red-900/50' : 'text-slate-400 bg-slate-900/50'}`}>
                                {formatDate(report.createdTime)}
                            </span>
                            {activeTab === 'closed' ? (
                                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900">Resolved</span>
                            ) : isOverdue ? (
                                <span className="text-[10px] uppercase font-bold text-red-200 bg-red-600/90 px-2 py-0.5 rounded border border-red-500/50 shadow-[0_0_10px_rgba(220,38,38,0.4)] flex items-center gap-1">
                                    <svg className="w-3 h-3 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Overdue
                                </span>
                            ) : (
                                <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-900">Open</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-4 space-y-3">
                           <div className="flex items-center text-sm text-slate-300 mt-1">
                             <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                             </svg>
                             {report.fields["Site / Location"]}
                           </div>
                           
                           {report.fields["Observation"] && (
                             <div className="bg-slate-900/40 rounded p-3 text-sm text-slate-300 border border-slate-700/50">
                                <span className="text-slate-500 text-xs uppercase font-bold block mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Observation
                                </span>
                                "{report.fields["Observation"]}"
                             </div>
                           )}

                           {/* Open Observations Images (Initial Evidence) */}
                           {report.fields["Open observations"] && report.fields["Open observations"].length > 0 && (
                             <div className="mt-2" onClick={e => e.stopPropagation()}>
                                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Initial Evidence</span>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                  {report.fields["Open observations"].map((img, idx) => (
                                    <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 block relative group">
                                      <img 
                                        src={img.thumbnails?.small?.url || img.url} 
                                        onError={handleImageError}
                                        alt="Evidence" 
                                        loading="lazy"
                                        decoding="async"
                                        className="h-14 w-14 object-cover rounded-md border border-slate-600 group-hover:border-blue-400 transition-colors shadow-sm" 
                                      />
                                    </a>
                                  ))}
                                </div>
                             </div>
                           )}

                           {/* Action Taken Display (Closed) OR Input (Open) */}
                           {activeTab === 'closed' ? (
                             <>
                               {report.fields["Action taken"] && (
                                 <div className="bg-emerald-900/10 rounded p-3 text-sm text-emerald-200/90 border border-emerald-800/30">
                                    <span className="text-emerald-500 text-xs uppercase font-bold block mb-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Action Taken
                                    </span>
                                    {report.fields["Action taken"]}
                                 </div>
                               )}
                               
                               {/* Display Closed Observations Images in Closed Tab */}
                               {report.fields["Closed observations"] && report.fields["Closed observations"].length > 0 && (
                                 <div className="mt-2">
                                    <span className="text-[10px] text-emerald-500/70 font-bold uppercase mb-1 block">Closing Evidence</span>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                      {report.fields["Closed observations"].map((img, idx) => (
                                        <a key={idx} href={img.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 block relative group">
                                          <img 
                                            src={img.thumbnails?.small?.url || img.url} 
                                            onError={handleImageError}
                                            alt="Closing Evidence" 
                                            loading="lazy"
                                            className="h-14 w-14 object-cover rounded-md border border-emerald-800 group-hover:border-emerald-500 transition-colors shadow-sm" 
                                          />
                                        </a>
                                      ))}
                                    </div>
                                 </div>
                               )}
                             </>
                           ) : (
                             <>
                               {/* Visual cue for expansion if not expanded */}
                               {!isExpanded && (
                                 <div className="flex justify-center mt-2">
                                   <div className="text-slate-500 bg-slate-700/30 rounded-full p-1">
                                      <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                   </div>
                                 </div>
                               )}

                               {/* Expanded Form Area */}
                               {isExpanded && (
                                   <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in slide-in-from-top-2 fade-in duration-200" onClick={e => e.stopPropagation()}>
                                      <label className="text-xs font-semibold text-slate-400 mb-2 block uppercase">Resolution</label>
                                      <textarea 
                                        value={actionInputs[report.id] || ''}
                                        onChange={(e) => handleActionInputChange(report.id, e.target.value)}
                                        placeholder="Enter details to resolve this observation..."
                                        rows={2}
                                        className="w-full rounded bg-slate-900 border border-slate-600 text-slate-200 text-sm p-2 mb-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600"
                                        onClick={e => e.stopPropagation()}
                                      />
                                      
                                      {/* Closing Images Upload Section */}
                                      <div className="mb-3">
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="text-[10px] text-slate-500 font-bold uppercase">Closing Images (Max 3)</span>
                                              <span className="text-[10px] text-slate-600">{(closingImages[report.id] || []).length}/3</span>
                                          </div>
                                          
                                          <div className="flex gap-2 overflow-x-auto pb-1">
                                              {/* Existing Uploaded Images */}
                                              {(closingImages[report.id] || []).map((img) => (
                                                  <div key={img.id} className="relative flex-shrink-0 h-16 w-16">
                                                      <img 
                                                        src={img.previewUrl} 
                                                        className={`h-full w-full object-cover rounded-md border ${
                                                            img.status === 'error' ? 'border-red-500 opacity-50' : 
                                                            img.status === 'uploading' ? 'border-blue-500 opacity-70' : 
                                                            'border-slate-600'
                                                        }`}
                                                        alt="Closing preview"
                                                      />
                                                      {img.status === 'uploading' && (
                                                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                                                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                          </div>
                                                      )}
                                                      <button 
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveClosingImage(report.id, img.id); }}
                                                        className="absolute -top-1 -right-1 bg-slate-800 text-slate-400 hover:text-red-400 rounded-full p-0.5 border border-slate-600"
                                                      >
                                                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                      </button>
                                                  </div>
                                              ))}

                                              {/* Add Button */}
                                              {(!closingImages[report.id] || closingImages[report.id].length < 3) && (
                                                  <label className="flex-shrink-0 h-16 w-16 border border-dashed border-slate-600 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-slate-500 transition-colors">
                                                      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                      <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">Add</span>
                                                      <input type="file" accept="image/*" className="hidden" onClick={e => e.stopPropagation()} onChange={(e) => handleAddClosingImage(report.id, e)} />
                                                  </label>
                                              )}
                                          </div>
                                      </div>

                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleResolve(report.id); }}
                                        disabled={!actionInputs[report.id]?.trim() || submittingIds.has(report.id)}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold py-2 rounded transition-colors flex justify-center items-center gap-2"
                                      >
                                        {submittingIds.has(report.id) ? (
                                          <>
                                            <div className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                                            SAVING...
                                          </>
                                        ) : (
                                          "MARK AS RESOLVED"
                                        )}
                                      </button>
                                   </div>
                               )}
                             </>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};