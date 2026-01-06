
import React, { useEffect, useState, useMemo } from 'react';
import { FetchedObservation, UserProfile, FetchedIncident } from '../types';
import { ARCHIVE_ACCESS_KEY, INCIDENT_STATUS, getRiskLevel, SEVERITY_LEVELS, LIKELIHOOD_LEVELS, STORAGE_KEYS, INCIDENT_TYPES, DEPARTMENTS, SITES } from '../constants';
import { useAppContext } from '../context/AppContext';
import { ShareModal } from './ShareModal';
import { ReportComments } from './ReportComments';
import { getAssignedReports } from '../services/sharingService';
import { updateIncident, updateObservation } from '../services/airtableService';
import { sendToast } from '../services/notificationService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { useEdgeSwipeBack } from '../hooks/useSwipeGesture';

interface RecentReportsProps {
  baseId: string;
  onBack: () => void;
  appTheme?: 'dark' | 'light';
  filterAssignee?: string; 
  onPrint: (incident: FetchedIncident) => void;
}

type Tab = 'open' | 'assigned' | 'incidents' | 'closed';

const PROFILE_KEY = 'hse_guardian_profile';

interface DataFieldProps {
  label: string;
  value?: any;
  icon?: React.ReactNode;
  isLight?: boolean;
}

const DataField: React.FC<DataFieldProps> = ({ label, value, icon, isLight }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5">
      {icon && <span className="opacity-50">{icon}</span>}
      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
    </div>
    <div className={`text-[11px] font-bold leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
      {value === null || value === undefined ? '—' : 
       typeof value === 'object' ? JSON.stringify(value) : String(value)}
    </div>
  </div>
);

export const RecentReports: React.FC<RecentReportsProps> = ({ baseId, onBack, appTheme = 'dark', filterAssignee, onPrint }) => {
  // Enable swipe from left edge to go back
  useEdgeSwipeBack(onBack);
  
  const { state, refetchData } = useAppContext();
  const { allReports, allIncidents, isLoading: loading } = state;
  
  const [activeTab, setActiveTab] = useState<Tab>(filterAssignee ? 'assigned' : 'incidents');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isArchiveUnlocked, setIsArchiveUnlocked] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [showRawMetadata, setShowRawMetadata] = useState<Record<string, boolean>>({});

  const isLight = appTheme === 'light';
  const isMyTasksMode = !!filterAssignee;

  const localAssignedObservationIds = useMemo(() => {
    if (!filterAssignee) return new Set<string>();
    const assigned = getAssignedReports(filterAssignee)
      .filter(a => a.reportType === 'observation')
      .map(a => a.reportId);
    return new Set<string>(assigned);
  }, [filterAssignee]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionDrafts, setActionDrafts] = useState<Record<string, string>>({});
  const [isUpdatingObservation, setIsUpdatingObservation] = useState<Record<string, boolean>>({});
  const [isUploadingClosureImages, setIsUploadingClosureImages] = useState<Record<string, boolean>>({});

  const [incidentEdits, setIncidentEdits] = useState<Record<string, Partial<{
    // Core fields
    title: string;
    description: string;
    category: string;
    site: string;
    department: string;
    location: string;
    severity: number;
    likelihood: number;
    // Personnel
    personsInvolved: string;
    equipmentInvolved: string;
    witnesses: string;
    // Analysis
    rootCause: string;
    recommendedControls: string;
    // Workflow
    reviewer: string;
    reviewComments: string;
    reviewDate: string;
    actionAssignedTo: string;
    actionDueDate: string;
    correctiveAction: string;
    verificationComments: string;
    closedBy: string;
    closureDate: string;
  }>>>({}); 
  const [isUpdatingIncident, setIsUpdatingIncident] = useState<Record<string, boolean>>({});
  const [isUploadingVerificationPhotos, setIsUploadingVerificationPhotos] = useState<Record<string, boolean>>({});
  const [showFullFormEdit, setShowFullFormEdit] = useState<Record<string, boolean>>({});
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; type: 'incident' | 'observation'; title: string } | null>(null);
  
  // Get current user for comments
  const currentUserName = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) {
        const profile = JSON.parse(saved);
        return profile.name || '';
      }
    } catch {}
    return '';
  }, []);

  const openShareModal = (reportId: string, reportType: 'incident' | 'observation', title: string) => {
    setShareTarget({ id: reportId, type: reportType, title });
    setShareModalOpen(true);
  };

  const handleUnlockArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessKey === ARCHIVE_ACCESS_KEY) {
      setIsArchiveUnlocked(true);
      setAccessKey('');
    } else {
      setUnlockError(true);
      setTimeout(() => setUnlockError(false), 2000);
    }
  };

  const handleRowClick = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const normalizeAssignees = (value: string) => {
    return value
      .split(/[,;]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  };

  const setIncidentEdit = (id: string, patch: Partial<(typeof incidentEdits)[string]>) => {
    setIncidentEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const todayDate = () => new Date().toISOString().slice(0, 10);

  const toDateInputValue = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const handleReviewerSendToAssignee = async (incidentId: string, reviewerName: string, existingFields: any) => {
    const edits = incidentEdits[incidentId] || {};
    const assignedTo = String(edits.actionAssignedTo ?? existingFields["Action Assigned To"] ?? '').trim();
    if (!assignedTo) {
      sendToast('Select an assignee before sending.', 'warning');
      return;
    }

    setIsUpdatingIncident(prev => ({ ...prev, [incidentId]: true }));
    try {
      const reviewComments = String(edits.reviewComments ?? existingFields["Review Comments"] ?? '').trim();
      const dueDate = String(edits.actionDueDate ?? existingFields["Action Due Date"] ?? '').trim();
      const reviewDate = existingFields["Review Date"] ? undefined : `${todayDate()}T00:00:00.000Z`;

      await updateIncident(incidentId, {
        "Reviewer": existingFields["Reviewer"] || reviewerName,
        ...(reviewDate ? { "Review Date": reviewDate } : {}),
        "Review Comments": reviewComments,
        "Action Assigned To": assignedTo,
        "Action Due Date": dueDate || undefined,
        "Status": INCIDENT_STATUS.ACTION_PENDING,
      });

      sendToast('Incident sent to assignee.', 'success');
      refetchData();
    } catch (e: any) {
      sendToast(e?.message || 'Failed to send incident to assignee.', 'critical');
    } finally {
      setIsUpdatingIncident(prev => ({ ...prev, [incidentId]: false }));
    }
  };

  const handleAssigneeSubmitAction = async (incidentId: string, assigneeName: string, existingFields: any) => {
    const edits = incidentEdits[incidentId] || {};
    const correctiveAction = String(edits.correctiveAction ?? existingFields["Corrective Action"] ?? '').trim();
    if (correctiveAction.length < 3) {
      sendToast('Enter corrective action details before submitting.', 'warning');
      return;
    }

    setIsUpdatingIncident(prev => ({ ...prev, [incidentId]: true }));
    try {
      await updateIncident(incidentId, {
        "Corrective Action": correctiveAction,
        "Status": INCIDENT_STATUS.VERIFICATION_PENDING,
      });
      sendToast('Corrective action submitted for verification.', 'success');
      refetchData();
    } catch (e: any) {
      sendToast(e?.message || 'Failed to submit corrective action.', 'critical');
    } finally {
      setIsUpdatingIncident(prev => ({ ...prev, [incidentId]: false }));
    }
  };

  const handleUploadVerificationPhotos = async (incidentId: string, files: FileList, existingFields: any) => {
    const list = Array.from(files || []).filter(f => f.type.startsWith('image/'));
    if (list.length === 0) return;

    setIsUploadingVerificationPhotos(prev => ({ ...prev, [incidentId]: true }));
    try {
      const uploaded: Array<{ url: string; filename: string }> = [];
      for (const f of list) {
        const compressed = await compressImage(f);
        const url = await uploadImageToStorage(compressed, 'incident_evidence');
        uploaded.push({ url, filename: f.name });
      }

      const existing = Array.isArray(existingFields["Verification Photos"]) ? existingFields["Verification Photos"] : [];
      await updateIncident(incidentId, {
        "Verification Photos": [...existing, ...uploaded],
      });

      sendToast('Verification photos uploaded.', 'success');
      refetchData();
    } catch (e: any) {
      sendToast(e?.message || 'Failed to upload verification photos.', 'critical');
    } finally {
      setIsUploadingVerificationPhotos(prev => ({ ...prev, [incidentId]: false }));
    }
  };

  const handleReviewerCloseIncident = async (incidentId: string, reviewerName: string, existingFields: any) => {
    const edits = incidentEdits[incidentId] || {};
    const verificationComments = String(edits.verificationComments ?? existingFields["Verification Comments"] ?? '').trim();
    const closedBy = String(edits.closedBy ?? existingFields["Closed By"] ?? reviewerName).trim();
    const closureDate = String((edits.closureDate ?? toDateInputValue(existingFields["Closure Date"])) || todayDate()).trim();

    setIsUpdatingIncident(prev => ({ ...prev, [incidentId]: true }));
    try {
      await updateIncident(incidentId, {
        "Verification Comments": verificationComments,
        "Closed By": closedBy,
        "Closure Date": closureDate ? `${closureDate}T00:00:00.000Z` : undefined,
        "Status": INCIDENT_STATUS.CLOSED,
      });
      sendToast('Incident closed.', 'success');
      refetchData();
    } catch (e: any) {
      sendToast(e?.message || 'Failed to close incident.', 'critical');
    } finally {
      setIsUpdatingIncident(prev => ({ ...prev, [incidentId]: false }));
    }
  };

  const handleSaveIncidentEdits = async (incidentId: string, existingFields: any, nextStatus?: string) => {
    const edits = incidentEdits[incidentId] || {};
    setIsUpdatingIncident(prev => ({ ...prev, [incidentId]: true }));
    try {
      const patch: Record<string, any> = {};

      // Core fields
      if (edits.title !== undefined) patch["Title"] = edits.title;
      if (edits.description !== undefined) patch["Description"] = edits.description;
      if (edits.category !== undefined) patch["Category"] = edits.category;
      if (edits.site !== undefined) patch["Site / Project"] = edits.site;
      if (edits.department !== undefined) patch["Department"] = edits.department;
      if (edits.location !== undefined) patch["Location"] = edits.location;
      if (edits.severity !== undefined) patch["Severity"] = edits.severity;
      if (edits.likelihood !== undefined) patch["Likelihood"] = edits.likelihood;

      // Personnel
      if (edits.personsInvolved !== undefined) patch["Persons Involved"] = edits.personsInvolved;
      if (edits.equipmentInvolved !== undefined) patch["Equipment Involved"] = edits.equipmentInvolved;
      if (edits.witnesses !== undefined) patch["Witnesses"] = edits.witnesses;

      // Analysis
      if (edits.rootCause !== undefined) patch["Root Cause"] = edits.rootCause;
      if (edits.recommendedControls !== undefined) patch["Recommended Controls"] = edits.recommendedControls;

      // Workflow
      if (edits.reviewer !== undefined) patch["Reviewer"] = edits.reviewer;
      if (edits.reviewComments !== undefined) patch["Review Comments"] = edits.reviewComments;
      // Auto-set Review Date if reviewer edits review comments and date not already set
      if ((edits.reviewComments !== undefined || edits.reviewer !== undefined) && !existingFields["Review Date"] && !edits.reviewDate) {
        patch["Review Date"] = `${todayDate()}T00:00:00.000Z`;
      } else if (edits.reviewDate !== undefined && edits.reviewDate) {
        patch["Review Date"] = `${edits.reviewDate}T00:00:00.000Z`;
      }
      if (edits.actionAssignedTo !== undefined) patch["Action Assigned To"] = edits.actionAssignedTo;
      if (edits.actionDueDate !== undefined && edits.actionDueDate) patch["Action Due Date"] = edits.actionDueDate;
      if (edits.correctiveAction !== undefined) patch["Corrective Action"] = edits.correctiveAction;
      if (edits.verificationComments !== undefined) patch["Verification Comments"] = edits.verificationComments;
      if (edits.closedBy !== undefined) patch["Closed By"] = edits.closedBy;
      // Auto-set Closure Date if closedBy is set and date not already set
      if ((edits.closedBy !== undefined || edits.verificationComments !== undefined) && !existingFields["Closure Date"] && !edits.closureDate) {
        // Only auto-set closure date if status is being closed or already verification pending
        const currentStatus = String(existingFields["Status"] || '');
        if (currentStatus === INCIDENT_STATUS.VERIFICATION_PENDING || nextStatus === INCIDENT_STATUS.CLOSED) {
          patch["Closure Date"] = `${todayDate()}T00:00:00.000Z`;
        }
      } else if (edits.closureDate !== undefined && edits.closureDate) {
        patch["Closure Date"] = `${edits.closureDate}T00:00:00.000Z`;
      }

      if (nextStatus) patch["Status"] = nextStatus;

      if (Object.keys(patch).length === 0) {
        sendToast('No changes to save.', 'info');
        return;
      }

      await updateIncident(incidentId, patch);
      sendToast('Incident updated.', 'success');
      setIncidentEdits(prev => ({ ...prev, [incidentId]: {} }));
      refetchData();
    } catch (e: any) {
      sendToast(e?.message || 'Failed to update incident.', 'critical');
    } finally {
      setIsUpdatingIncident(prev => ({ ...prev, [incidentId]: false }));
    }
  };

  const handleResubmitObservation = async (reportId: string, assigneeName: string, closureImages?: FileList, existingFields?: any) => {
    const draft = String(actionDrafts[reportId] ?? '').trim();
    if (draft.length < 3) {
      sendToast('Please enter an action/update before resubmitting.', 'warning');
      return;
    }
    setIsUpdatingObservation(prev => ({ ...prev, [reportId]: true }));
    try {
      const updateData: Record<string, any> = {
        "Action Taken": draft,
        "Closed By": currentUserName,
      };

      // Upload closure images if provided
      if (closureImages && closureImages.length > 0) {
        setIsUploadingClosureImages(prev => ({ ...prev, [reportId]: true }));
        const imageList = Array.from(closureImages).filter(f => f.type.startsWith('image/'));
        const uploaded: Array<{ url: string; filename: string }> = [];
        
        for (const file of imageList) {
          const compressed = await compressImage(file);
          const url = await uploadImageToStorage(compressed, 'observation_closure');
          uploaded.push({ url, filename: file.name });
        }
        
        const existing = Array.isArray(existingFields?.["Closed observations"]) ? existingFields["Closed observations"] : [];
        updateData["Closed observations"] = [...existing, ...uploaded];
        setIsUploadingClosureImages(prev => ({ ...prev, [reportId]: false }));
      }

      await updateObservation(reportId, updateData);
      sendToast('Update submitted successfully.', 'success');
      refetchData();
    } catch (e: any) {
      sendToast(e?.message || 'Failed to resubmit update.', 'critical');
    } finally {
      setIsUpdatingObservation(prev => ({ ...prev, [reportId]: false }));
      setIsUploadingClosureImages(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const toggleRawMetadata = (id: string) => {
    setShowRawMetadata(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tabFilteredReports = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    if (isMyTasksMode && filterAssignee) {
      const normalizedAssignee = filterAssignee.trim().toLowerCase();

      const incidentTasks = allIncidents.filter((inc) => {
        const fields: any = inc.fields;
        const status = String(fields["Status"] || INCIDENT_STATUS.PENDING_REVIEW);
        if (status === INCIDENT_STATUS.CLOSED) return false;

        const title = String(fields["Title"] || '').toLowerCase();
        const desc = String(fields["Description"] || '').toLowerCase();
        const matchesSearch = !query || title.includes(query) || desc.includes(query);
        if (!matchesSearch) return false;

        const reviewerTokens = normalizeAssignees(String(fields["Reviewer"] || ''));
        const actionTokens = normalizeAssignees(String(fields["Action Assigned To"] || ''));

        const isReviewer = reviewerTokens.includes(normalizedAssignee);
        const isActionAssignee = actionTokens.includes(normalizedAssignee);

        if (status === INCIDENT_STATUS.PENDING_REVIEW) return isReviewer;
        if (status === INCIDENT_STATUS.ACTION_PENDING) return isActionAssignee;
        if (status === INCIDENT_STATUS.VERIFICATION_PENDING) return isReviewer;
        return false;
      });

      const observationTasks = allReports.filter((report) => {
        const actionTaken = String(report.fields["Action taken"] || '').trim();
        const isClosed = actionTaken.length > 0;
        if (isClosed) return false;

        const assignedToRaw = String(report.fields["Assigned To"] || '').trim();
        const assignedTokens = normalizeAssignees(assignedToRaw);

        const obsText = String(report.fields["Observation"] || '').toLowerCase();
        const nameText = String(report.fields["Name"] || '').toLowerCase();
        const matchesSearch = !query || obsText.includes(query) || nameText.includes(query);
        if (!matchesSearch) return false;

        const matchesAssignee = assignedTokens.includes(normalizedAssignee) || assignedToRaw.toLowerCase() === normalizedAssignee;
        const isLocallyAssignedToMe = localAssignedObservationIds.has(report.id);
        return (matchesAssignee || isLocallyAssignedToMe);
      });

      return [...incidentTasks, ...observationTasks].sort((a: any, b: any) => {
        const at = new Date(a.createdTime || 0).getTime();
        const bt = new Date(b.createdTime || 0).getTime();
        return bt - at;
      });
    }
    
    if (activeTab === 'incidents') {
      return allIncidents.filter(inc => {
        const title = String(inc.fields["Title"] || "").toLowerCase();
        const desc = String(inc.fields["Description"] || "").toLowerCase();
        return !query || title.includes(query) || desc.includes(query);
      });
    }
    
    return allReports.filter(report => {
      const actionTaken = String(report.fields["Action taken"] || "").trim();
      const isClosed = actionTaken.length > 0;
      const assignedToRaw = String(report.fields["Assigned To"] || "").trim();
      const assignedTokens = normalizeAssignees(assignedToRaw);
      
      const obsText = String(report.fields["Observation"] || "").toLowerCase();
      const nameText = String(report.fields["Name"] || "").toLowerCase();
      const matchesSearch = !query || obsText.includes(query) || nameText.includes(query);
      
      const normalizedAssignee = (filterAssignee || '').trim().toLowerCase();
      const matchesAssignee = !filterAssignee || assignedTokens.includes(normalizedAssignee) || assignedToRaw.toLowerCase() === normalizedAssignee;
      const isLocallyAssignedToMe = !!filterAssignee && localAssignedObservationIds.has(report.id);

      if (activeTab === 'closed') return isClosed && matchesSearch && matchesAssignee;
      if (activeTab === 'assigned') return !isClosed && (assignedTokens.length > 0 || isLocallyAssignedToMe) && matchesSearch && (matchesAssignee || isLocallyAssignedToMe);
      return !isClosed && assignedTokens.length === 0 && matchesSearch && matchesAssignee;
    });
  }, [allReports, allIncidents, activeTab, searchTerm, filterAssignee, localAssignedObservationIds]);

  return (
    <div className="animate-in slide-in-from-right duration-300 pb-24 max-w-7xl mx-auto">
      <div className="relative z-10 px-2 lg:px-0">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={onBack} className={`mr-4 transition-all p-2 rounded-xl hover:bg-white/5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h2 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{isMyTasksMode ? 'Personal Tasks' : 'System Grid'}</h2>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Real-time Safety Ledger</p>
            </div>
          </div>
          
          <div className="relative group max-w-xs w-full hidden sm:block">
            <input 
              type="text" 
              placeholder="Search grid..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-3 rounded-2xl border text-xs font-bold pl-10 outline-none transition-all ${isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-white/5 border-white/10 focus:border-blue-500 text-white'}`}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>

        {!isMyTasksMode && (
          <div className={`flex p-1 mb-8 rounded-2xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'} max-w-2xl`}>
              {(['incidents', 'open', 'assigned', 'closed'] as const).map(t => (
                <button key={t} onClick={() => { setActiveTab(t); setExpandedId(null); }} className={`flex-1 py-3 text-[9px] uppercase font-black rounded-xl transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {t}
                </button>
              ))}
          </div>
        )}

        {activeTab === 'closed' && !isArchiveUnlocked && (
          <div className={`mb-8 p-8 rounded-[2rem] border text-center space-y-6 ${isLight ? 'bg-blue-50 border-blue-100' : 'bg-blue-600/5 border-blue-500/20'}`}>
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="max-w-xs mx-auto space-y-4">
              <h3 className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Archive Encryption Active</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">Enter security clearance key to access resolved records.</p>
              <form onSubmit={handleUnlockArchive} className="flex gap-2">
                <input 
                  type="password" 
                  value={accessKey}
                  onChange={e => setAccessKey(e.target.value)}
                  placeholder="Clearance Key" 
                  className={`flex-1 p-3 rounded-xl border text-xs font-bold outline-none ${isLight ? 'bg-white' : 'bg-black/40 border-white/10 text-white'} ${unlockError ? 'border-rose-500' : ''}`}
                />
                <button type="submit" className="px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-500 transition-all">Unlock</button>
              </form>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Synchronizing Registry...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(activeTab !== 'closed' || isArchiveUnlocked) && tabFilteredReports.map((report) => {
              const isIncident = 'fields' in report && 'Title' in report.fields;
              const fields = report.fields as any;
              const status = isIncident ? (fields["Status"] || 'Pending Review') : 'Observation';
              const riskScore = isIncident ? (Number(fields["Severity"] || 1) * Number(fields["Likelihood"] || 1)) : 0;
              const riskInfo = getRiskLevel(riskScore);
              
              return (
                <div key={report.id} className={`rounded-[2rem] border overflow-hidden transition-all duration-300 ${expandedId === report.id ? (isLight ? 'bg-white border-blue-500 shadow-2xl scale-[1.01]' : 'bg-white/5 border-blue-500/50 shadow-2xl scale-[1.01]') : (isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-white/[0.02] border-white/5 hover:border-white/20')}`}>
                  <div onClick={() => handleRowClick(report.id)} className="flex items-center gap-5 p-6 cursor-pointer group">
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-3 mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${isIncident ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                             {isIncident ? 'Incident' : 'Observation'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{report.id}</span>
                       </div>
                       <div className={`text-sm font-black truncate group-hover:text-blue-500 transition-colors ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {isIncident ? fields["Title"] : fields["Observation"]}
                       </div>
                    </div>
                    {isIncident && (
                      <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${riskInfo.color} text-white hidden sm:block`}>
                        RISK: {riskScore}
                      </div>
                    )}
                    <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${status === INCIDENT_STATUS.CLOSED ? 'bg-emerald-600' : (isIncident ? 'bg-amber-600' : 'bg-slate-600')} text-white`}>
                      {status}
                    </div>
                  </div>

                  {expandedId === report.id && (
                    <div className="p-8 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-500 space-y-10">
                       
                       {isIncident ? (
                         <>
                           <WorkflowTimeline status={fields["Status"]} isLight={isLight} />

                           {isMyTasksMode && filterAssignee && (() => {
                             const normalizedAssignee = filterAssignee.trim().toLowerCase();
                             const status = String(fields["Status"] || INCIDENT_STATUS.PENDING_REVIEW);
                             const reviewerTokens = normalizeAssignees(String(fields["Reviewer"] || ''));
                             const actionTokens = normalizeAssignees(String(fields["Action Assigned To"] || ''));
                             const isReviewer = reviewerTokens.includes(normalizedAssignee);
                             const isActionAssignee = actionTokens.includes(normalizedAssignee);

                             const edits = incidentEdits[report.id] || {};
                             const busy = !!isUpdatingIncident[report.id];
                             const uploading = !!isUploadingVerificationPhotos[report.id];
                             const isFullFormOpen = !!showFullFormEdit[report.id];
                             const reviewerNames = (state.personnel || []).map((p: any) => p.name).sort();

                             // Full-form editor available to both Reviewer and Assignee in any workflow stage
                             const renderFullFormEditor = () => (
                               <div className={`mb-6 p-6 rounded-[2rem] border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/30 border-white/10'}`}>
                                 <button
                                   onClick={() => setShowFullFormEdit(prev => ({ ...prev, [report.id]: !prev[report.id] }))}
                                   className={`w-full flex items-center justify-between text-left p-4 rounded-2xl border transition-all ${
                                     isLight ? 'bg-white border-slate-200 hover:border-blue-500' : 'bg-black/40 border-white/10 hover:border-blue-500'
                                   }`}
                                 >
                                   <div>
                                     <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">Edit All Fields</span>
                                     <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Expand to modify any incident data</span>
                                   </div>
                                   <span className={`text-2xl font-black transition-transform ${isFullFormOpen ? 'rotate-45' : ''} ${isLight ? 'text-slate-400' : 'text-white/50'}`}>+</span>
                                 </button>

                                 {isFullFormOpen && (
                                   <div className="mt-5 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                     {/* Section 1: Event Identification */}
                                     <div>
                                       <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Event Identification</h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div className="md:col-span-2">
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Title</label>
                                           <input
                                             value={String(edits.title ?? fields["Title"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { title: e.target.value })}
                                             placeholder="Incident title"
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Category</label>
                                           <input
                                             list={`incident-${report.id}-categories`}
                                             value={String(edits.category ?? fields["Category"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { category: e.target.value })}
                                             placeholder="Select category"
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                           <datalist id={`incident-${report.id}-categories`}>
                                             {INCIDENT_TYPES.map(t => <option key={t} value={t} />)}
                                           </datalist>
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Site / Project</label>
                                           <input
                                             list={`incident-${report.id}-sites`}
                                             value={String(edits.site ?? fields["Site / Project"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { site: e.target.value })}
                                             placeholder="Select site"
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                           <datalist id={`incident-${report.id}-sites`}>
                                             {SITES.map(s => <option key={s} value={s} />)}
                                           </datalist>
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Department</label>
                                           <input
                                             list={`incident-${report.id}-depts`}
                                             value={String(edits.department ?? fields["Department"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { department: e.target.value })}
                                             placeholder="Select department"
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                           <datalist id={`incident-${report.id}-depts`}>
                                             {DEPARTMENTS.map(d => <option key={d} value={d} />)}
                                           </datalist>
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Location / Coordinates</label>
                                           <input
                                             value={String(edits.location ?? fields["Location"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { location: e.target.value })}
                                             placeholder="GPS or description"
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                       </div>
                                     </div>

                                     {/* Section 2: Narrative */}
                                     <div>
                                       <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Narrative</h4>
                                       <div>
                                         <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Description</label>
                                         <textarea
                                           value={String(edits.description ?? fields["Description"] ?? '')}
                                           onChange={(e) => setIncidentEdit(report.id, { description: e.target.value })}
                                           rows={5}
                                           placeholder="Detailed description of what happened..."
                                           className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                                             isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                           }`}
                                         />
                                       </div>
                                     </div>

                                     {/* Section 3: Personnel & Equipment */}
                                     <div>
                                       <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Personnel & Equipment</h4>
                                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Persons Involved</label>
                                           <input
                                             value={String(edits.personsInvolved ?? fields["Persons Involved"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { personsInvolved: e.target.value })}
                                             placeholder="Names..."
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Equipment Involved</label>
                                           <input
                                             value={String(edits.equipmentInvolved ?? fields["Equipment Involved"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { equipmentInvolved: e.target.value })}
                                             placeholder="Equipment..."
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Witnesses</label>
                                           <input
                                             value={String(edits.witnesses ?? fields["Witnesses"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { witnesses: e.target.value })}
                                             placeholder="Witness names..."
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                       </div>
                                     </div>

                                     {/* Section 4: Risk & Analysis */}
                                     <div>
                                       <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Risk & Analysis</h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Severity (1-5)</label>
                                           <input
                                             type="number" min={1} max={5}
                                             value={Number(edits.severity ?? fields["Severity"] ?? 1)}
                                             onChange={(e) => setIncidentEdit(report.id, { severity: Number(e.target.value) })}
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Likelihood (1-5)</label>
                                           <input
                                             type="number" min={1} max={5}
                                             value={Number(edits.likelihood ?? fields["Likelihood"] ?? 1)}
                                             onChange={(e) => setIncidentEdit(report.id, { likelihood: Number(e.target.value) })}
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                         <div className="md:col-span-2">
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Root Cause</label>
                                           <textarea
                                             value={String(edits.rootCause ?? fields["Root Cause"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { rootCause: e.target.value })}
                                             rows={3}
                                             placeholder="Underlying cause..."
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                         <div className="md:col-span-2">
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Recommended Controls</label>
                                           <textarea
                                             value={String(edits.recommendedControls ?? fields["Recommended Controls"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { recommendedControls: e.target.value })}
                                             rows={3}
                                             placeholder="Suggested controls / preventative measures..."
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                       </div>
                                     </div>

                                     {/* Section 5: Workflow Assignments */}
                                     <div>
                                       <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Workflow Assignments</h4>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Reviewer</label>
                                           <input
                                             list={`incident-${report.id}-reviewers`}
                                             value={String(edits.reviewer ?? fields["Reviewer"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { reviewer: e.target.value })}
                                             placeholder="Select reviewer"
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                           <datalist id={`incident-${report.id}-reviewers`}>
                                             {reviewerNames.map((n: string) => <option key={n} value={n} />)}
                                           </datalist>
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Action Assigned To</label>
                                           <input
                                             list={`incident-${report.id}-assignees`}
                                             value={String(edits.actionAssignedTo ?? fields["Action Assigned To"] ?? '')}
                                             onChange={(e) => setIncidentEdit(report.id, { actionAssignedTo: e.target.value })}
                                             placeholder="Select assignee"
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                           <datalist id={`incident-${report.id}-assignees`}>
                                             {reviewerNames.map((n: string) => <option key={n} value={n} />)}
                                           </datalist>
                                         </div>
                                         <div>
                                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Action Due Date</label>
                                           <input
                                             type="date"
                                             value={String(edits.actionDueDate ?? toDateInputValue(fields["Action Due Date"]))}
                                             onChange={(e) => setIncidentEdit(report.id, { actionDueDate: e.target.value })}
                                             className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                               isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                             }`}
                                           />
                                         </div>
                                       </div>
                                     </div>

                                     {/* Save Button */}
                                     <div className="flex justify-end gap-3">
                                       <button
                                         onClick={() => setShowFullFormEdit(prev => ({ ...prev, [report.id]: false }))}
                                         className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                           isLight ? 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50' : 'bg-black/40 border-white/10 text-white/70 hover:border-white/20'
                                         }`}
                                       >
                                         Cancel
                                       </button>
                                       <button
                                         disabled={busy}
                                         onClick={() => handleSaveIncidentEdits(report.id, filterAssignee, fields)}
                                         className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                           isLight ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-500' : 'bg-purple-600 text-white border-purple-500/20 hover:bg-purple-500'
                                         } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                       >
                                         {busy ? 'Saving…' : 'Save All Changes'}
                                       </button>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             );

                             if (status === INCIDENT_STATUS.PENDING_REVIEW && isReviewer) {
                               return (
                                 <>
                                 {renderFullFormEditor()}
                                 <div className={`p-6 rounded-[2rem] border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'}`}>
                                   <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Reviewer Actions</div>
                                   <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Assign and send to action owner</div>

                                   <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                                     <div className="md:col-span-2">
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Review Comments</label>
                                       <textarea
                                         value={String(edits.reviewComments ?? fields["Review Comments"] ?? '')}
                                         onChange={(e) => setIncidentEdit(report.id, { reviewComments: e.target.value })}
                                         rows={4}
                                         placeholder="Review notes / immediate actions..."
                                         className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                                           isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                         }`}
                                       />
                                     </div>

                                     <div>
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Action Assigned To</label>
                                       <input
                                         value={String(edits.actionAssignedTo ?? fields["Action Assigned To"] ?? '')}
                                         onChange={(e) => setIncidentEdit(report.id, { actionAssignedTo: e.target.value })}
                                         list={`incident-${report.id}-assignees`}
                                         placeholder="Select assignee"
                                         className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                           isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                         }`}
                                       />
                                       <datalist id={`incident-${report.id}-assignees`}>
                                         {reviewerNames.map((n: string) => <option key={n} value={n} />)}
                                       </datalist>
                                     </div>

                                     <div>
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Action Due Date</label>
                                       <input
                                         type="date"
                                         value={String(edits.actionDueDate ?? toDateInputValue(fields["Action Due Date"]))}
                                         onChange={(e) => setIncidentEdit(report.id, { actionDueDate: e.target.value })}
                                         className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                           isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                         }`}
                                       />
                                     </div>
                                   </div>

                                   <div className="flex justify-end mt-5">
                                     <button
                                       disabled={busy}
                                       onClick={() => handleReviewerSendToAssignee(report.id, filterAssignee, fields)}
                                       className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                         isLight ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500' : 'bg-blue-600 text-white border-blue-500/20 hover:bg-blue-500'
                                       } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                     >
                                       {busy ? 'Sending…' : 'Send to Assignee'}
                                     </button>
                                   </div>
                                 </div>
                                 </>
                               );
                             }

                             if (status === INCIDENT_STATUS.ACTION_PENDING && isActionAssignee) {
                               return (
                                 <>
                                 {renderFullFormEditor()}
                                 <div className={`p-6 rounded-[2rem] border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'}`}>
                                   <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Assignee Actions</div>
                                   <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Submit corrective action for verification</div>
                                   <div className="mt-5">
                                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Corrective Action</label>
                                     <textarea
                                       value={String(edits.correctiveAction ?? fields["Corrective Action"] ?? '')}
                                       onChange={(e) => setIncidentEdit(report.id, { correctiveAction: e.target.value })}
                                       rows={5}
                                       placeholder="Describe corrective action completed / controls implemented..."
                                       className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                                         isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                       }`}
                                     />
                                   </div>
                                   <div className="flex justify-end mt-5">
                                     <button
                                       disabled={busy}
                                       onClick={() => handleAssigneeSubmitAction(report.id, filterAssignee, fields)}
                                       className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                         isLight ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500' : 'bg-blue-600 text-white border-blue-500/20 hover:bg-blue-500'
                                       } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                     >
                                       {busy ? 'Submitting…' : 'Submit for Verification'}
                                     </button>
                                   </div>
                                 </div>
                                 </>
                               );
                             }

                             if (status === INCIDENT_STATUS.VERIFICATION_PENDING && isReviewer) {
                               return (
                                 <>
                                 {renderFullFormEditor()}
                                 <div className={`p-6 rounded-[2rem] border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'}`}>
                                   <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Verification & Closure</div>
                                   <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Upload verification evidence and close</div>

                                   <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                                     <div className="md:col-span-2">
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Verification Comments</label>
                                       <textarea
                                         value={String(edits.verificationComments ?? fields["Verification Comments"] ?? '')}
                                         onChange={(e) => setIncidentEdit(report.id, { verificationComments: e.target.value })}
                                         rows={4}
                                         placeholder="Verification notes and findings..."
                                         className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                                           isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                         }`}
                                       />
                                     </div>

                                     <div className="md:col-span-2">
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Verification Photos (Airtable)</label>
                                       <input
                                         type="file"
                                         accept="image/*"
                                         multiple
                                         disabled={uploading}
                                         onChange={(e) => {
                                           if (e.target.files) void handleUploadVerificationPhotos(report.id, e.target.files, fields);
                                         }}
                                         className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                           isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/10 text-white'
                                         } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                       />
                                       <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                                         {uploading ? 'Uploading…' : 'Uploads to Supabase then writes into Airtable “Verification Photos”.'}
                                       </div>
                                     </div>

                                     <div>
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Closed By</label>
                                       <input
                                         value={String(edits.closedBy ?? fields["Closed By"] ?? filterAssignee)}
                                         onChange={(e) => setIncidentEdit(report.id, { closedBy: e.target.value })}
                                         placeholder="Name"
                                         className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                           isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                         }`}
                                       />
                                     </div>

                                     <div>
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Closure Date</label>
                                       <input
                                         type="date"
                                         value={String((edits.closureDate ?? toDateInputValue(fields["Closure Date"])) || todayDate())}
                                         onChange={(e) => setIncidentEdit(report.id, { closureDate: e.target.value })}
                                         className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                           isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                         }`}
                                       />
                                     </div>
                                   </div>

                                   <div className="flex justify-end mt-5">
                                     <button
                                       disabled={busy}
                                       onClick={() => handleReviewerCloseIncident(report.id, filterAssignee, fields)}
                                       className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                         isLight ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 text-white border-emerald-500/20 hover:bg-emerald-500'
                                       } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                     >
                                       {busy ? 'Closing…' : 'Close Incident'}
                                     </button>
                                   </div>
                                 </div>
                                 </>
                               );
                             }

                             return null;
                           })()}
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6 rounded-[2rem] bg-black/20 border border-white/5">
                             <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Operational Identity</h4>
                               <DataField label="Category" value={fields["Category"]} isLight={isLight} />
                               <DataField label="Site / Project" value={fields["Site / Project"]} isLight={isLight} />
                               <DataField label="Department" value={fields["Department"]} isLight={isLight} />
                               <DataField label="Precise Coordinates" value={fields["Location"]} isLight={isLight} />
                             </div>
                             <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Personnel & Assets</h4>
                               <DataField label="Reporter Name" value={fields["Reporter ID"]} isLight={isLight} />
                               <DataField label="Involved Parties" value={fields["Persons Involved"]} isLight={isLight} />
                               <DataField label="Equipment Involved" value={fields["Equipment Involved"]} isLight={isLight} />
                               <DataField label="Direct Witnesses" value={fields["Witnesses"]} isLight={isLight} />
                             </div>
                             <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Critical Analysis</h4>
                               <div className="flex gap-4">
                                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex-1">
                                    <span className="block text-[7px] font-black text-slate-500 uppercase mb-1">Severity</span>
                                    <span className="text-xs font-black text-white">{SEVERITY_LEVELS[fields["Severity"] || 1]}</span>
                                  </div>
                                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex-1">
                                    <span className="block text-[7px] font-black text-slate-500 uppercase mb-1">Likelihood</span>
                                    <span className="text-xs font-black text-white">{LIKELIHOOD_LEVELS[fields["Likelihood"] || 1]}</span>
                                  </div>
                               </div>
                               <DataField label="Root Cause Analysis" value={fields["Root Cause"]} isLight={isLight} />
                               <DataField label="Recommended Controls" value={fields["Recommended Controls"]} isLight={isLight} />
                             </div>
                           </div>

                           <div>
                              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] px-1 mb-4">Event Chronology</h4>
                              <div className={`p-6 rounded-[2rem] border text-sm font-medium leading-relaxed ${isLight ? 'bg-slate-50 text-slate-700' : 'bg-white/5 text-slate-300 border-white/5'}`}>
                                {fields["Description"]}
                              </div>
                           </div>

                           <div className="mt-8">
                             <button 
                               onClick={() => toggleRawMetadata(report.id)}
                               className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${isLight ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white/5 text-slate-400 border-white/5'}`}
                             >
                               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform ${showRawMetadata[report.id] ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                               {showRawMetadata[report.id] ? 'Hide Metadata Audit' : 'Show Metadata Audit'}
                             </button>
                             {showRawMetadata[report.id] && (
                               <div className={`mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6 rounded-[2rem] border animate-in slide-in-from-top-2 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                 {Object.entries(fields).map(([key, val]) => (
                                   <DataField key={key} label={key} value={val} isLight={isLight} />
                                 ))}
                               </div>
                             )}
                           </div>

                           <div className="flex justify-end gap-4 items-center">
                            <button
                              onClick={() => openShareModal(report.id, 'incident', fields["Title"])}
                              className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                isLight ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                              }`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>
                              </svg>
                              Share Report
                            </button>
                            <button
                              onClick={() => onPrint(report as FetchedIncident)}
                              className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/5 text-slate-300 border-white/10'
                              }`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                              Export Audit Document
                            </button>
                          </div>
                          
                          {/* Team Comments Section */}
                          <div className="mt-8">
                            <ReportComments 
                              reportId={report.id} 
                              currentUserName={currentUserName}
                              appTheme={appTheme}
                            />
                          </div>
                         </>
                       ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Observation Data</h4>
                               <DataField label="Observation Type" value={fields["Observation Type"]} isLight={isLight} />
                               <DataField label="Site Location" value={fields["Site / Location"]} isLight={isLight} />
                               <DataField label="Observer" value={fields["Name"]} isLight={isLight} />
                               <DataField label="Assigned To" value={fields["Assigned To"]} isLight={isLight} />
                               <div className="pt-4">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Finding Description</label>
                                  <p className={`text-sm font-bold leading-relaxed ${isLight ? 'text-slate-800' : 'text-white'}`}>{fields["Observation"]}</p>
                               </div>
                            </div>
                            <div className="space-y-6">
                               <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Remediation Status</h4>
                               <DataField label="Action Taken" value={fields["Action taken"]} isLight={isLight} />
                               <DataField label="Closed By" value={fields["Closed by"]} isLight={isLight} />
                               <DataField label="Root Cause" value={fields["Root Cause"]} isLight={isLight} />

                               {isMyTasksMode && filterAssignee && (() => {
                                 const assignedToRaw = String(fields["Assigned To"] || "").trim();
                                 const assignedTokens = normalizeAssignees(assignedToRaw);
                                 const normalizedAssignee = filterAssignee.trim().toLowerCase();
                                 const isAssignedToMe = assignedTokens.includes(normalizedAssignee) || localAssignedObservationIds.has(report.id);
                                 if (!isAssignedToMe) return null;

                                 const draft = actionDrafts[report.id] ?? String(fields["Action taken"] || '');
                                 const isBusy = !!isUpdatingObservation[report.id];
                                 const isUploadingImages = !!isUploadingClosureImages[report.id];

                                 return (
                                   <div className={`mt-6 p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                                     <div className="flex items-center justify-between gap-3 mb-3">
                                       <div>
                                         <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Assigned Action Update</div>
                                         <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Fill action taken and upload closure images</div>
                                       </div>
                                     </div>
                                     <textarea
                                       value={draft}
                                       onChange={(e) => setActionDrafts(prev => ({ ...prev, [report.id]: e.target.value }))}
                                       rows={4}
                                       placeholder="Describe the action taken / update..."
                                       className={`w-full p-4 rounded-2xl border text-sm font-bold outline-none resize-none transition-all ${
                                         isLight ? 'bg-white border-slate-200 focus:border-blue-500' : 'bg-black/30 border-white/10 focus:border-blue-500 text-white'
                                       }`}
                                     />
                                     <div className="mt-4">
                                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
                                         Closure Images (Optional)
                                       </label>
                                       <input
                                         id={`closure-images-${report.id}`}
                                         type="file"
                                         multiple
                                         accept="image/*"
                                         className={`w-full p-3 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                           isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/10 text-white'
                                         }`}
                                       />
                                     </div>
                                     <div className="flex justify-end mt-4">
                                       <button
                                         disabled={isBusy || isUploadingImages}
                                         onClick={() => {
                                           const fileInput = document.getElementById(`closure-images-${report.id}`) as HTMLInputElement;
                                           handleResubmitObservation(report.id, filterAssignee, fileInput?.files || undefined, fields);
                                         }}
                                         className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                           isLight ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500' : 'bg-blue-600 text-white border-blue-500/20 hover:bg-blue-500'
                                         } ${(isBusy || isUploadingImages) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                       >
                                         {isUploadingImages ? 'Uploading Images…' : isBusy ? 'Submitting…' : 'Close Observation'}
                                       </button>
                                     </div>
                                   </div>
                                 );
                               })()}
                               
                               <button 
                                 onClick={() => toggleRawMetadata(report.id)}
                                 className={`mt-4 text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity`}
                               >
                                 {showRawMetadata[report.id] ? '[-] Hide Full Registry' : '[+] View Full Registry'}
                               </button>
                            </div>
                            {showRawMetadata[report.id] && (
                              <div className={`md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-[2rem] border animate-in slide-in-from-top-2 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                {Object.entries(fields).map(([key, val]) => (
                                  <DataField key={key} label={key} value={val} isLight={isLight} />
                                ))}
                              </div>
                            )}
                            
                            {/* Share Button for Observations */}
                            <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                              <button
                                onClick={() => openShareModal(report.id, 'observation', fields["Observation"]?.slice(0, 50) + '...')}
                                className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                                  isLight ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                }`}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                  <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>
                                </svg>
                                Share Observation
                              </button>
                            </div>
                            
                            {/* Team Comments Section for Observations */}
                            <div className="md:col-span-2 mt-4">
                              <ReportComments 
                                reportId={report.id} 
                                currentUserName={currentUserName}
                                appTheme={appTheme}
                              />
                            </div>
                         </div>
                       )}

                       <div className="space-y-8 pt-8 border-t border-white/5">
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                             Photographic Evidence Repository
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4">Initial Acquisition (Detection)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                   {fields.Attachments?.map((att: any, i: number) => (
                                     <a href={att.url} target="_blank" rel="noopener noreferrer" key={i} className="group/img aspect-video rounded-2xl overflow-hidden border-2 border-white/5 shadow-xl transition-all hover:border-blue-500/50">
                                        <img src={att.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="evidence" />
                                     </a>
                                   ))}
                                </div>
                             </div>
                             <div>
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Verification Acquisition (Resolution)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                   {(isIncident ? fields["Verification Photos"] : fields["Closed observations"])?.map((att: any, i: number) => (
                                     <a href={att.url} target="_blank" rel="noopener noreferrer" key={i} className="group/img aspect-video rounded-2xl overflow-hidden border-2 border-white/5 shadow-xl transition-all hover:border-blue-500/50">
                                        <img src={att.url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" alt="resolution" />
                                     </a>
                                   ))}
                                   {!(isIncident ? fields["Verification Photos"] : fields["Closed observations"])?.length && (
                                     <div className="aspect-video rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center opacity-20 bg-white/5">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                     </div>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              );
          })}
        </div>
      )}
      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => { setShareModalOpen(false); setShareTarget(null); }}
          reportId={shareTarget.id}
          reportType={shareTarget.type}
          reportTitle={shareTarget.title}
          appTheme={appTheme}
        />
      )}
    </div>
  );
};

const WorkflowTimeline: React.FC<{status: FetchedIncident['fields']['Status'], isLight: boolean}> = ({ status, isLight }) => {
  const steps = [INCIDENT_STATUS.PENDING_REVIEW, INCIDENT_STATUS.ACTION_PENDING, INCIDENT_STATUS.VERIFICATION_PENDING, INCIDENT_STATUS.CLOSED];
  const currentIndex = steps.indexOf(status);

  return (
    <div className={`flex items-center justify-between p-6 rounded-[2rem] border ${isLight ? 'bg-slate-50 border-slate-200 shadow-inner' : 'bg-black/40 border-white/5'}`}>
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-3 text-center min-w-[80px]">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
              i <= currentIndex ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : (isLight ? 'bg-white border-slate-200 text-slate-300' : 'bg-slate-800 border-slate-700 text-slate-600')
            }`}>
              {i < currentIndex ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <span className="text-xs font-black">{i + 1}</span>
              )}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest max-w-[70px] ${i <= currentIndex ? (isLight ? 'text-blue-600' : 'text-blue-400') : 'text-slate-500'}`}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-1.5 rounded-full mx-2 transition-all duration-1000 ${i < currentIndex ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : (isLight ? 'bg-slate-200' : 'bg-slate-800')}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
