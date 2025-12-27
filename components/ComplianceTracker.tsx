
import React, { useState, useEffect } from 'react';
import { ComplianceRecord, ComplianceRequirement, UserProfile } from '../types';
import { SITES, STORAGE_KEYS } from '../constants';

interface ComplianceTrackerProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

const AUTHORITIES = ['OSHA', 'ISO', 'ADPHC', 'Federal Authority', 'Municipal Authority', 'Other'];
const JURISDICTIONS = ['UAE', 'GCC', 'International', 'Project Specific'];
const CATEGORIES = ['Safety', 'Health', 'Environment', 'Fire', 'Electrical'];
const FREQUENCIES = ['One-time', 'Monthly', 'Annual', 'Ongoing'];
const COMPLIANCE_STATUSES = ['Compliant', 'Partially Compliant', 'Non-Compliant', 'Not Applicable'];

export const ComplianceTracker: React.FC<ComplianceTrackerProps> = ({ appTheme, onBack }) => {
  const isLight = appTheme === 'light';
  const [currentUser, setCurrentUser] = useState<string>('Unknown User');

  const [form, setForm] = useState<ComplianceRecord>({
    id: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
    createdDate: new Date().toISOString().split('T')[0],
    createdBy: '',
    standardName: '',
    code: '',
    authority: 'ISO',
    jurisdiction: 'UAE',
    category: 'Safety',
    regStatus: 'Draft',
    applicableSites: [],
    applicableProjects: [],
    applicableActivities: '',
    personsAffected: [],
    requirements: [createEmptyRequirement()],
    evidenceRequired: '',
    evidenceType: 'Inspection',
    verifiedBy: '',
    verificationDate: new Date().toISOString().split('T')[0],
    correctiveActionRequired: false,
    actionStatus: 'Open',
    lastReviewDate: new Date().toISOString().split('T')[0],
    nextReviewDate: new Date(Date.now() + 15552000000).toISOString().split('T')[0], // 180 days
    reviewerName: '',
    reviewComments: '',
    isConfirmed: false,
    assessorSigned: false,
    approverSigned: false,
    approvalDate: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        const profile: UserProfile = JSON.parse(saved);
        setCurrentUser(profile.name);
        setForm(prev => ({ ...prev, createdBy: profile.name, reviewerName: profile.name }));
      } catch (e) {}
    }
  }, []);

  function createEmptyRequirement(): ComplianceRequirement {
    return {
      id: crypto.randomUUID(),
      clause: '',
      description: '',
      method: '',
      responsible: '',
      frequency: 'Ongoing',
      nextDueDate: '',
      status: 'Non-Compliant'
    };
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as any).checked : value 
    }));
  };

  const handleMultiSelect = (field: 'applicableSites' | 'personsAffected', value: string) => {
    setForm(prev => {
      const current = prev[field];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value) 
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const addRequirement = () => {
    setForm(prev => ({ ...prev, requirements: [...prev.requirements, createEmptyRequirement()] }));
  };

  const removeRequirement = (id: string) => {
    if (form.requirements.length <= 1) return;
    setForm(prev => ({ ...prev, requirements: prev.requirements.filter(r => r.id !== id) }));
  };

  const updateRequirement = (id: string, updates: Partial<ComplianceRequirement>) => {
    setForm(prev => ({
      ...prev,
      requirements: prev.requirements.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  };

  const isRequirementNonCompliant = form.requirements.some(r => r.status === 'Non-Compliant');

  const validate = () => {
    if (!form.standardName || !form.code || !form.authority) {
      alert("Mandatory Identification fields missing.");
      return false;
    }
    if (form.requirements.length === 0) {
      alert("At least one Compliance Requirement is mandatory.");
      return false;
    }
    return true;
  };

  // Fixed destructuring to use subText instead of sub to match property name in type definition
  const SectionHeader = ({ num, title, subText }: { num: string; title: string; subText?: string; }) => (
    <div className="flex items-start gap-4 mb-8 mt-12 first:mt-0">
      <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0">
        {num}
      </div>
      <div>
        <h3 className={`text-lg font-black uppercase tracking-widest leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {title}
        </h3>
        {subText && <p className="text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-tighter">{subText}</p>}
      </div>
    </div>
  );

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-32 max-w-5xl mx-auto">
      {/* Header Back */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button onClick={onBack} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className={`text-xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Compliance Protocol</h2>
            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-1">Regulatory Governance Terminal</span>
          </div>
        </div>
      </div>

      <div className={`p-8 sm:p-12 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-white/[0.02] border-white/10'
      }`}>
        
        {/* 1. Form Header */}
        <div className="text-center mb-12 border-b border-white/5 pb-8 relative z-10">
          <h1 className={`text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Compliance Management – Regulations Record
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2 italic">Track legal and regulatory compliance obligations.</p>
          
          <div className="grid grid-cols-3 gap-4 mt-8">
             <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Record ID</span>
                <span className="text-[10px] font-mono font-black text-blue-500">{form.id}</span>
             </div>
             <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Created Date</span>
                <span className="text-[10px] font-black text-slate-400">{form.createdDate}</span>
             </div>
             <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Created By</span>
                <span className="text-[10px] font-black text-slate-400 truncate px-1">{form.createdBy}</span>
             </div>
          </div>
        </div>

        {/* 2. Regulation Identification */}
        <SectionHeader num="2" title="Regulation Identification" subText="Core standard parameters and jurisdiction" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Regulation / Standard Name *</label>
            <input name="standardName" value={form.standardName} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Regulation Code / Ref *</label>
            <input name="code" value={form.code} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Issuing Authority *</label>
            <select name="authority" value={form.authority} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}>
              {AUTHORITIES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Jurisdiction</label>
            <select name="jurisdiction" value={form.jurisdiction} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}>
              {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Category</label>
            <select name="category" value={form.category} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Regulation Status</label>
            <div className="flex gap-2">
              {['Active', 'Superseded', 'Draft'].map(s => (
                <button key={s} onClick={() => setForm(p => ({ ...p, regStatus: s as any }))} className={`flex-1 py-3 rounded-lg border text-[9px] font-black uppercase transition-all ${form.regStatus === s ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-black/20 border-white/5 text-slate-500'}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Applicability Details */}
        <SectionHeader num="3" title="Applicability Details" subText="Target scope of implementation" />
        <div className="space-y-6">
           <div className="flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Applicable Site(s)</label>
             <div className="flex flex-wrap gap-2">
               {SITES.map(site => (
                 <button key={site} onClick={() => handleMultiSelect('applicableSites', site)} className={`px-4 py-2 rounded-full border text-[8px] font-black uppercase transition-all ${form.applicableSites.includes(site) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black/20 border-white/5 text-slate-600'}`}>{site}</button>
               ))}
             </div>
           </div>
           <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Applicable Activities / Tasks</label>
              <textarea name="applicableActivities" value={form.applicableActivities} onChange={handleInputChange} rows={2} className={`p-4 rounded-xl border outline-none font-bold text-xs resize-none ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
           </div>
           <div className="flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Persons Affected</label>
             <div className="flex gap-4">
               {['Employees', 'Contractors', 'Public'].map(p => (
                 <label key={p} className="flex items-center gap-2 cursor-pointer group">
                   <input type="checkbox" checked={form.personsAffected.includes(p)} onChange={() => handleMultiSelect('personsAffected', p)} className="w-4 h-4 rounded bg-slate-800 border-white/10 text-cyan-600" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{p}</span>
                 </label>
               ))}
             </div>
           </div>
        </div>

        {/* 4. Compliance Requirements */}
        <SectionHeader num="4" title="Compliance Requirements" subText="Granular clause evaluation" />
        <div className="overflow-x-auto -mx-8 sm:-mx-12 px-8 sm:px-12">
          <div className="min-w-[1000px] space-y-4">
            <div className={`grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr_1fr_50px] gap-2 p-4 text-[8px] font-black uppercase tracking-widest border-b ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Clause / Ref</span>
              <span>Description</span>
              <span>Method</span>
              <span>Responsible</span>
              <span>Frequency</span>
              <span>Due Date</span>
              <span>Status</span>
              <span></span>
            </div>
            {form.requirements.map((req) => (
              <div key={req.id} className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr_1fr_1fr_50px] gap-2 items-center animate-in fade-in duration-300">
                <input value={req.clause} onChange={e => updateRequirement(req.id, { clause: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white' : 'bg-black/20 border-white/5 text-white'}`} placeholder="8.1.2" />
                <input value={req.description} onChange={e => updateRequirement(req.id, { description: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white' : 'bg-black/20 border-white/5 text-white'}`} placeholder="Description" />
                <input value={req.method} onChange={e => updateRequirement(req.id, { method: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white' : 'bg-black/20 border-white/5 text-white'}`} />
                <input value={req.responsible} onChange={e => updateRequirement(req.id, { responsible: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white' : 'bg-black/20 border-white/5 text-white'}`} />
                <select value={req.frequency} onChange={e => updateRequirement(req.id, { frequency: e.target.value as any })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white' : 'bg-black/20 border-white/5 text-white'}`}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input type="date" value={req.nextDueDate} onChange={e => updateRequirement(req.id, { nextDueDate: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white' : 'bg-black/20 border-white/5 text-white'}`} />
                <select value={req.status} onChange={e => updateRequirement(req.id, { status: e.target.value as any })} className={`p-2 rounded-lg border text-[10px] font-black uppercase ${
                  req.status === 'Compliant' ? 'text-emerald-500' : req.status === 'Non-Compliant' ? 'text-rose-500' : 'text-amber-500'
                } ${isLight ? 'bg-white' : 'bg-black/20 border-white/5'}`}>
                  {COMPLIANCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => removeRequirement(req.id)} className="text-rose-500 hover:text-rose-400 transition-colors flex justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            ))}
            <button onClick={addRequirement} className="w-full py-4 border-2 border-dashed border-cyan-500/30 rounded-2xl flex items-center justify-center gap-3 text-cyan-500 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/5 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 5v14M5 12h14"/></svg>
              Add Compliance Requirement Row
            </button>
          </div>
        </div>

        {/* 5. Evidence & Records */}
        <SectionHeader num="5" title="Evidence & Records" subText="Verification data and validation" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-2 flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Evidence Required</label>
             <input name="evidenceRequired" value={form.evidenceRequired} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} placeholder="e.g. Current Permit to Work, Certification etc." />
           </div>
           <div className="flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Evidence Type</label>
             <select name="evidenceType" value={form.evidenceType} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}>
               {['Permit', 'Training', 'Inspection', 'Certificate'].map(t => <option key={t} value={t}>{t}</option>)}
             </select>
           </div>
           <div className="flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Verified By</label>
             <input name="verifiedBy" value={form.verifiedBy} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
           </div>
           <div className="flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Verification Date</label>
             <input type="date" name="verificationDate" value={form.verificationDate} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
           </div>
           <div className="flex flex-col gap-1.5 justify-center">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Evidence Upload</label>
             <div className={`p-2 rounded-xl border border-dashed flex items-center justify-center cursor-pointer transition-all ${isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <span className="text-[8px] font-black uppercase ml-2 text-slate-500">Secure File Sync</span>
             </div>
           </div>
        </div>

        {/* 6. Risk & Impact (Conditional) */}
        {isRequirementNonCompliant && (
          <div className="animate-in slide-in-from-top-4 duration-500">
            <SectionHeader num="6" title="Risk & Impact" subText="Required for Non-Compliant findings" />
            <div className={`p-8 rounded-[2rem] border-2 border-rose-500/30 ${isLight ? 'bg-rose-50' : 'bg-rose-900/10'}`}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">Potential Risk / Impact</label>
                    <textarea name="riskImpact" value={form.riskImpact} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs resize-none ${isLight ? 'bg-white border-rose-200' : 'bg-black/20 border-white/10 text-white'}`} />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">Interim Control Measures</label>
                    <textarea name="interimControls" value={form.interimControls} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs resize-none ${isLight ? 'bg-white border-rose-200' : 'bg-black/20 border-white/10 text-white'}`} />
                 </div>
                 <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest px-1">Severity Level</label>
                    <div className="flex gap-2">
                       {['Low', 'Medium', 'High'].map(l => (
                         <button key={l} onClick={() => setForm(p => ({ ...p, riskSeverity: l as any }))} className={`flex-1 py-3 rounded-lg border text-[9px] font-black uppercase transition-all ${form.riskSeverity === l ? 'bg-rose-600 text-white shadow-lg' : 'bg-white/10 text-slate-500 border-white/5'}`}>{l}</button>
                       ))}
                    </div>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* 7. Corrective Action */}
        <SectionHeader num="7" title="Corrective Action" subText="Planned remediation tasks" />
        <div className="space-y-6">
           <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/20 border border-white/5">
              <span className="text-[10px] font-black uppercase text-slate-400">Corrective Action Required?</span>
              <button onClick={() => setForm(p => ({ ...p, correctiveActionRequired: !p.correctiveActionRequired }))} className={`w-12 h-6 rounded-full relative transition-colors ${form.correctiveActionRequired ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                 <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.correctiveActionRequired ? 'right-1' : 'left-1'}`} />
              </button>
           </div>
           {form.correctiveActionRequired && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Action Description</label>
                  <textarea name="correctiveActionDesc" value={form.correctiveActionDesc} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs resize-none ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Responsible Person</label>
                  <input name="correctiveResponsible" value={form.correctiveResponsible} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Target Completion Date</label>
                  <input type="date" name="correctiveTargetDate" value={form.correctiveTargetDate} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
                </div>
             </div>
           )}
        </div>

        {/* 8. Review & Approval */}
        <SectionHeader num="8" title="Review & Approval" subText="Management oversight and cycle" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Last Review Date</label>
             <input type="date" name="lastReviewDate" value={form.lastReviewDate} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
           </div>
           <div className="flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Next Review Date</label>
             <input type="date" name="nextReviewDate" value={form.nextReviewDate} onChange={handleInputChange} className={`p-4 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
           </div>
           <div className="md:col-span-2 flex flex-col gap-1.5">
             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Review Comments</label>
             <textarea name="reviewComments" value={form.reviewComments} onChange={handleInputChange} rows={3} className={`p-4 rounded-xl border outline-none font-bold text-xs resize-none ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
           </div>
        </div>

        {/* 9. Declaration & Sign-Off */}
        <SectionHeader num="9" title="Declaration & Sign-Off" subText="Final confirmation of regulatory integrity" />
        <div className="space-y-8">
           <label className="flex items-start gap-4 cursor-pointer group p-6 rounded-[2rem] bg-cyan-600/5 border border-cyan-500/20">
              <input type="checkbox" checked={form.isConfirmed} onChange={(e) => setForm(p => ({ ...p, isConfirmed: e.target.checked }))} className="mt-1 w-6 h-6 rounded bg-slate-900 border-white/10 text-cyan-600" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 leading-relaxed group-hover:text-white transition-colors">I confirm this regulation has been assessed and recorded accurately in accordance with corporate HSE standards.</span>
           </label>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-white/5">
              <div className="space-y-4">
                 <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Prepared By – Assessor</span>
                 <button onClick={() => setForm(p => ({ ...p, assessorSigned: !p.assessorSigned }))} className={`w-full py-8 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${form.assessorSigned ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10'}`}>
                    {form.assessorSigned ? (
                      <span className="font-serif italic text-2xl tracking-widest">{currentUser}</span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-[0.3em]">Digitally Authorize</span>
                    )}
                 </button>
              </div>
              <div className="space-y-4">
                 <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Approved By – Manager</span>
                 <button onClick={() => setForm(p => ({ ...p, approverSigned: !p.approverSigned }))} className={`w-full py-8 rounded-[2rem] border transition-all flex flex-col items-center justify-center gap-2 ${form.approverSigned ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl' : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10'}`}>
                    {form.approverSigned ? (
                      <span className="font-serif italic text-2xl tracking-widest">Authorized Manager</span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-[0.3em]">Establish Approval</span>
                    )}
                 </button>
              </div>
           </div>
        </div>

        {/* 10. Sticky Footer Actions */}
        <div className={`fixed bottom-0 left-0 right-0 p-6 flex justify-center items-center z-[50] ${isLight ? 'bg-white/80 border-t border-slate-200' : 'bg-[#020617]/80 border-t border-white/5'} backdrop-blur-2xl`}>
           <div className="max-w-4xl w-full flex gap-3">
              <button onClick={() => { if(validate()) alert("Draft Synchronized to Local Terminal Database."); }} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-white hover:bg-white/10'}`}>💾 Save Draft</button>
              <button onClick={() => { if(validate()) alert("Regulatory Record Compiled and Dispatched."); }} className="flex-[2] py-4 rounded-2xl bg-cyan-600 text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:bg-cyan-500 transition-all active:scale-95 border border-cyan-400/20">📤 Submit Protocol</button>
              <button onClick={onBack} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'bg-slate-100 text-rose-500' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20'}`}>❌ Cancel</button>
           </div>
        </div>

      </div>
    </div>
  );
};
