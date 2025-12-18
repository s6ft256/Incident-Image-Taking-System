import React, { useEffect, useState } from 'react';
import { FetchedIncident, UploadedImage } from '../types';
import { getRecentReports, updateIncidentAction } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
// Added missing import for InputField
import { InputField } from './InputField';

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

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [actionInputs, setActionInputs] = useState<Record<string, string>>({});
  const [closedByInputs, setClosedByInputs] = useState<Record<string, string>>({});
  const [closingImages, setClosingImages] = useState<Record<string, UploadedImage[]>>({});
  const [submittingIds, setSubmittingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    if (resolveErrors[id]) setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });
  };

  const handleClosedByInputChange = (id: string, value: string) => {
    setClosedByInputs(prev => ({ ...prev, [id]: value }));
    if (resolveErrors[id]) setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });
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

      setClosingImages(prev => ({ ...prev, [reportId]: [...(prev[reportId] || []), newImage] }));
      if (resolveErrors[reportId]) setResolveErrors(prev => { const n = {...prev}; delete n[reportId]; return n; });
      e.target.value = '';

      try {
        const fileToUpload = await compressImage(file);
        const publicUrl = await uploadImageToStorage(fileToUpload, 'closed');
        setClosingImages(prev => ({
          ...prev,
          [reportId]: prev[reportId].map(img => img.id === newImage.id ? { ...img, status: 'success', serverUrl: publicUrl } : img)
        }));
      } catch (err) {
        setClosingImages(prev => ({
          ...prev,
          [reportId]: prev[reportId].map(img => img.id === newImage.id ? { ...img, status: 'error' } : img)
        }));
      }
    }
  };

  const handleRemoveClosingImage = (reportId: string, imageId: string) => {
    setClosingImages(prev => {
      const reportImages = prev[reportId] || [];
      const imageToRemove = reportImages.find(img => img.id === imageId);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl);
      return { ...prev, [reportId]: reportImages.filter(img => img.id !== imageId) };
    });
    if (resolveErrors[reportId]) setResolveErrors(prev => { const n = {...prev}; delete n[reportId]; return n; });
  };

  const handleResolve = async (id: string) => {
    setResolveErrors(prev => { const n = {...prev}; delete n[id]; return n; });
    const actionTaken = actionInputs[id];
    const closedBy = closedByInputs[id];
    
    if (!actionTaken?.trim() || !closedBy?.trim()) {
        setResolveErrors(prev => ({...prev, [id]: "Required fields missing."}));
        return;
    }

    const currentImages = closingImages[id] || [];
    if (currentImages.some(img => img.status === 'uploading')) {
        setResolveErrors(prev => ({...prev, [id]: "Wait for uploads."}));
        return;
    }
    
    setSubmittingIds(prev => new Set(prev).add(id));
    try {
      const attachmentData = currentImages
        .filter(img => img.status === 'success' && img.serverUrl)
        .map(img => ({ url: img.serverUrl!, filename: img.file.name }));

      await updateIncidentAction(id, actionTaken, closedBy, attachmentData, { baseId });
      setReports(prev => prev.map(r => r.id === id ? { ...r, fields: { ...r.fields, "Action taken": actionTaken, "Closed by": closedBy, "Closed observations": attachmentData } } : r));
      setExpandedId(null);
    } catch (err: any) {
      setResolveErrors(prev => ({...prev, [id]: err.message || "Failed."}));
    } finally {
      setSubmittingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const formatDateSimple = (isoString: string) => new Date(isoString).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const formatDateDetail = (isoString: string) => new Date(isoString).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filteredReports = reports.filter(report => {
    const hasAction = report.fields["Action taken"] && report.fields["Action taken"].trim().length > 0;
    return activeTab === 'closed' ? hasAction : !hasAction;
  });

  const LOGO_URL = "https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png";

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Incident Log</h2>
      </div>

      <div className="flex p-1 mb-6 bg-slate-200 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
        <button
          onClick={() => { setActiveTab('open'); setExpandedId(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
            activeTab === 'open' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-slate-700/50'
          }`}
        >
          Open
          <span className="ml-2 bg-blue-500/20 text-blue-700 dark:text-blue-100 text-[10px] px-1.5 py-0.5 rounded-full">
            {reports.filter(r => !r.fields["Action taken"]?.trim()).length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('closed'); setExpandedId(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
            activeTab === 'closed' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-slate-700/50'
          }`}
        >
          Closed
          <span className="ml-2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-100 text-[10px] px-1.5 py-0.5 rounded-full">
            {reports.filter(r => r.fields["Action taken"]?.trim()).length}
          </span>
        </button>
      </div>

      {!loading && activeTab === 'closed' && !isAdminUnlocked ? (
        <div className="relative min-h-[450px] flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
          <img src={LOGO_URL} className="absolute inset-0 w-full h-full object-contain z-0 opacity-10 dark:opacity-20 p-8 grayscale" alt="TGC Logo" />
          <div className="relative z-20 flex flex-col items-center w-full max-w-xs text-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-8 shadow-xl border border-blue-200 dark:border-blue-500/40 ring-8 ring-blue-500/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Admin.</h3>
            <p className="text-slate-500 dark:text-white text-[11px] font-black uppercase tracking-[0.4em] mb-10 bg-slate-100 dark:bg-black/70 px-6 py-2 rounded-full border border-slate-200 dark:border-white/10 shadow-sm">Restricted access</p>
            <form onSubmit={handleUnlock} className="flex flex-col gap-4 w-full">
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Access Key" className="w-full rounded-2xl border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-black/80 px-5 py-4 text-slate-900 dark:text-white text-center font-mono shadow-inner outline-none focus:border-blue-500" autoFocus />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest text-xs mt-4">Unlock</button>
              {passwordError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-2">{passwordError}</p>}
            </form>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReports.map((report) => {
            const isExpanded = expandedId === report.id;
            return (
              <div key={report.id} className={`rounded-lg overflow-hidden transition-all duration-200 border ${isExpanded ? 'bg-white dark:bg-slate-800 border-blue-500/50 shadow-lg' : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                <div onClick={() => handleRowClick(report.id)} className="flex items-center gap-3 p-4 cursor-pointer">
                  <div className="w-20 text-[10px] font-mono text-slate-400 shrink-0">{formatDateSimple(report.createdTime)}</div>
                  <div className="w-24 sm:w-32 text-sm font-bold text-slate-800 dark:text-white truncate shrink-0">{report.fields["Incident Type"] || 'N/A'}</div>
                  <div className="flex-1 text-[11px] text-slate-500 dark:text-slate-400 truncate uppercase font-bold">{report.fields["Site / Location"]}</div>
                  <div className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 p-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 text-[10px] border-b border-slate-200 dark:border-slate-700/50 pb-6 font-bold uppercase tracking-widest text-slate-400">
                      <div><span className="block text-[8px] mb-1">Reporter</span><span className="text-slate-800 dark:text-slate-200">{report.fields["Name"]}</span></div>
                      <div><span className="block text-[8px] mb-1">Role</span><span className="text-slate-600 dark:text-slate-400">{report.fields["Role / Position"]}</span></div>
                      <div><span className="block text-[8px] mb-1">Time</span><span className="text-slate-600 dark:text-slate-400">{formatDateDetail(report.createdTime)}</span></div>
                      {activeTab === 'closed' && <div><span className="block text-[8px] mb-1">Closed By</span><span className="text-emerald-600 dark:text-emerald-400">{report.fields["Closed by"]}</span></div>}
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observation</h4>
                       <p className="bg-white dark:bg-slate-900/60 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">{report.fields["Observation"]}</p>
                       {activeTab === 'open' && (
                         <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                           <InputField id="closed_by" label="Closed By" value={closedByInputs[report.id] || ''} onChange={(e) => handleClosedByInputChange(report.id, e.target.value)} placeholder="Your Name" />
                           <InputField id="action" label="Remediation Action" value={actionInputs[report.id] || ''} onChange={(e) => handleActionInputChange(report.id, e.target.value)} type="textarea" placeholder="Detail the steps taken..." />
                           <button onClick={() => handleResolve(report.id)} disabled={submittingIds.has(report.id)} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-xs active:scale-95 transition-all">Resolve Observation</button>
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
    </div>
  );
};