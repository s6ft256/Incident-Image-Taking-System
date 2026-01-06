
import React, { useState, useMemo } from 'react';
import { InputField } from './InputField';
import { ImageGrid } from './ImageGrid';
import { INCIDENT_TYPES, DEPARTMENTS, SITES, MIN_IMAGES, getRiskLevel, LIKELIHOOD_LEVELS, SEVERITY_LEVELS } from '../constants';
import { UploadedImage } from '../types';
import { useIncidentReportForm } from '../hooks/useIncidentReportForm';
import { ImageAnnotator } from './ImageAnnotator';
import { useAppContext } from '../context/AppContext';
import { sendToast } from '../services/notificationService';

interface IncidentReportFormProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

export const IncidentReportForm: React.FC<IncidentReportFormProps> = ({ appTheme, onBack }) => {
  const isLight = appTheme === 'light';
  const { state } = useAppContext();
  const [annotatingImage, setAnnotatingImage] = useState<UploadedImage | null>(null);

  const personnelNames = useMemo(() => {
    return state.personnel.map(p => p.name).sort();
  }, [state.personnel]);

  const {
    formData,
    setFormData,
    images,
    setImages,
    submitStatus,
    isLocating,
    errorMessage,
    fetchCurrentLocation,
    handleInputChange,
    handleAddFiles,
    handleRemoveImage,
    handleRetryUpload,
    handleSubmit,
  } = useIncidentReportForm();

  const handleAnnotationSave = (annotatedFile: File) => {
    if (!annotatingImage) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newPreviewUrl = reader.result as string;
      setImages(prev => prev.map(img => 
        img.id === annotatingImage.id 
          ? { ...img, file: annotatedFile, previewUrl: newPreviewUrl, isAnnotated: true }
          : img
      ));
      setAnnotatingImage(null);
    };
    reader.readAsDataURL(annotatedFile);
  };

  const riskScore = formData.severityScore * formData.likelihoodScore;
  const riskInfo = getRiskLevel(riskScore);
  const isAnnotationMissing = images.length > 0 && !images.some(img => img.isAnnotated);

  if (submitStatus === 'success' || submitStatus === 'offline-saved') {
    const isOfflineSaved = submitStatus === 'offline-saved';
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in zoom-in duration-500">
         <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
         </div>
         <h2 className={`text-4xl font-black tracking-tight mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>{isOfflineSaved ? 'INCIDENT QUEUED' : 'INCIDENT LOGGED'}</h2>
         <p className="text-slate-500 uppercase tracking-widest text-[10px] font-black mb-10 max-w-xs leading-relaxed">
            {isOfflineSaved
              ? 'Record serialized to local ledger. It will sync to cloud grid when connectivity returns.'
              : 'Record successfully serialized and synced to cloud grid. Audit trail initiated.'}
         </p>
         <button onClick={onBack} className="px-12 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-500 transition-all border border-blue-400/20">Return to Grid</button>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-24 max-w-4xl mx-auto">
      {annotatingImage && (
        <ImageAnnotator 
          src={annotatingImage.previewUrl}
          onSave={handleAnnotationSave}
          onClose={() => setAnnotatingImage(null)}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className={`p-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-white'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Reactive Incident Report</h2>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1 block text-left">High-Integrity Data Acquisition</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className={`p-8 rounded-[3rem] border shadow-2xl backdrop-blur-md ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-white/5'}`}>
          <div className="space-y-8">
            {/* 1. Identification */}
            <section>
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1 mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                 1. Event Identification
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <InputField id="title" label="Incident Title *" value={formData.title} onChange={handleInputChange} placeholder="e.g. Structural Collapse - Zone 4" required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField id="type" label="Event Type *" value={formData.type} onChange={handleInputChange} list={INCIDENT_TYPES} required />
                  <InputField id="department" label="Department *" value={formData.department} onChange={handleInputChange} list={DEPARTMENTS} required />
                  <InputField id="site" label="Work Site *" value={formData.site} onChange={handleInputChange} list={SITES} required />
                  <div className="flex items-end gap-2">
                    <div className="flex-1"><InputField id="location" label="GPS Precise Location *" value={formData.location} onChange={handleInputChange} placeholder="Click icon to sync GPS" required /></div>
                    <button type="button" onClick={fetchCurrentLocation} disabled={isLocating} className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-all border ${isLocating ? 'bg-blue-600/20 border-blue-500/20' : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'}`}>
                      {isLocating ? <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Investigation */}
            <section className="pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1 mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                 2. Narrative & Investigation
              </h3>
              <div className="space-y-6">
                <InputField id="description" label="Detailed Chronology *" type="textarea" value={formData.description} onChange={handleInputChange} placeholder="Provide a step-by-step account of the event..." required />
                <InputField id="involvedParties" label="Personnel Involved" type="textarea" value={formData.involvedParties} onChange={handleInputChange} placeholder="List names, IDs, and injuries (if any)..." />
                <InputField id="equipmentInvolved" label="Assets / Equipment Impacted" type="textarea" value={formData.equipmentInvolved} onChange={handleInputChange} placeholder="Machine IDs, serial numbers, property damage..." />
                <InputField id="witnesses" label="Direct Witnesses" type="textarea" value={formData.witnesses} onChange={handleInputChange} placeholder="Name and contact info for all witnesses..." />
              </div>
            </section>

            {/* 3. Risk Assessment */}
            <section className="pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1 mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                 3. Dynamic Risk Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 rounded-[2rem] bg-black/20 border border-white/5 shadow-inner">
                <div className="flex flex-col gap-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Initial Severity: <span className="text-blue-400">{SEVERITY_LEVELS[formData.severityScore]}</span></label>
                  <input type="range" min="1" max="5" value={formData.severityScore} onChange={e => setFormData(p => ({ ...p, severityScore: +e.target.value }))} className="w-full accent-blue-600 cursor-pointer" />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Likelihood: <span className="text-blue-400">{LIKELIHOOD_LEVELS[formData.likelihoodScore]}</span></label>
                  <input type="range" min="1" max="5" value={formData.likelihoodScore} onChange={e => setFormData(p => ({ ...p, likelihoodScore: +e.target.value }))} className="w-full accent-blue-600 cursor-pointer" />
                </div>
                <div className={`${riskInfo.color} p-5 rounded-2xl flex flex-col items-center justify-center text-center border-2 transition-all duration-500 ${riskInfo.textColor.replace('text-', 'border-')}/40 shadow-2xl`}>
                  <span className="text-white text-4xl font-black tracking-tighter">{riskScore}</span>
                  <span className="text-white/80 text-[8px] font-black uppercase tracking-[0.3em] mt-1">{riskInfo.level} PRIORITY</span>
                </div>
              </div>
            </section>
            {/* 3b. Root Cause Analysis */}
            <section className="pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] px-1 mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                 Root Cause Analysis
              </h3>
              <div className="space-y-6">
                <InputField id="rootCause" label="Root Cause" type="textarea" value={formData.rootCause} onChange={handleInputChange} placeholder="Identify the underlying cause(s) of the incident..." />
                <InputField id="recommendedControls" label="Recommended Controls" type="textarea" value={formData.recommendedControls} onChange={handleInputChange} placeholder="Propose preventative measures and controls..." />
              </div>
            </section>
            {/* 4. Evidence */}
            <section className="pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1 mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                 4. Photographic Evidence acquisition
              </h3>
              <div className={`p-6 rounded-[2rem] border transition-all ${isAnnotationMissing ? 'border-amber-500/30 bg-amber-500/5' : 'bg-black/20 border-white/5'}`}>
                <ImageGrid 
                  images={images} 
                  onAdd={handleAddFiles} 
                  onRemove={handleRemoveImage} 
                  onRetry={handleRetryUpload}
                  onAnnotate={(id) => setAnnotatingImage(images.find(img => img.id === id) || null)}
                  appTheme={appTheme} 
                  hideHeader={true}
                />
              </div>
              {isAnnotationMissing && images.length > 0 && (
                <div className="mt-4 flex items-center gap-2 px-2 text-amber-500 animate-pulse">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                   <span className="text-[8px] font-black uppercase tracking-widest">Digital Annotation required for context</span>
                </div>
              )}
            </section>

            {/* 5. Workflow & Oversight */}
            <section className="pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] px-1 mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                 5. Workflow & Oversight
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField id="reviewer" label="Reviewer / Safety Lead" value={formData.reviewer} onChange={handleInputChange} list={personnelNames} />
                <InputField id="reviewDate" label="Review Date" type="date" value={formData.reviewDate} onChange={handleInputChange} />
                <div className="md:col-span-2">
                  <InputField id="reviewComments" label="Managerial Review Comments" type="textarea" value={formData.reviewComments} onChange={handleInputChange} placeholder="Administrative or technical feedback on the report..." />
                </div>
                <InputField id="actionAssignedTo" label="Action Assigned To" value={formData.actionAssignedTo} onChange={handleInputChange} list={personnelNames} />
                <InputField id="actionDueDate" label="Action Due Date" type="date" value={formData.actionDueDate} onChange={handleInputChange} />
              </div>
            </section>

            {/* 6. Remediation & Closure */}
            <section className="pt-8 border-t border-white/5">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] px-1 mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                 6. Remediation & Closure
              </h3>
              <div className="space-y-6">
                <InputField id="correctiveAction" label="Corrective Action Details" type="textarea" value={formData.correctiveAction} onChange={handleInputChange} placeholder="Describe the physical actions taken to prevent recurrence..." />
                <InputField id="verificationComments" label="Verification Note" type="textarea" value={formData.verificationComments} onChange={handleInputChange} placeholder="Validation comments from the inspector..." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField id="closedBy" label="Closure Certified By" value={formData.closedBy} onChange={handleInputChange} list={personnelNames} />
                  <InputField id="closureDate" label="Closure Date" type="date" value={formData.closureDate} onChange={handleInputChange} />
                </div>
              </div>
            </section>
          </div>
        </div>

        {errorMessage && (
          <div className="p-5 rounded-2xl bg-rose-600/10 border-2 border-rose-500/20 text-rose-500 flex items-center gap-4 animate-in shake">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
             <span className="text-[10px] font-black uppercase tracking-widest">{errorMessage}</span>
          </div>
        )}

        <button 
          type="submit"
          disabled={submitStatus === 'submitting'}
          className={`w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-[0.98] border border-blue-400/20 ${submitStatus === 'submitting' ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
          {submitStatus === 'submitting' ? (
            <div className="flex items-center justify-center gap-4">
               <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
               <span>Serializing & Syncing...</span>
            </div>
          ) : (formData.reviewer?.trim() ? 'Send to Reviewer' : 'Dispatch Unified Incident Record')}
        </button>
      </form>
    </div>
  );
};
