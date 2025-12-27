
import React, { useState } from 'react';
import { RiskAssessment, HazardRow } from '../types';

interface RiskAssessmentModuleProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

const PERSONS_AT_RISK_OPTIONS = ['Employees', 'Contractors', 'Visitors', 'Public', 'Supervisors / Engineers', 'Vulnerable persons'];
const PPE_OPTIONS = ['Safety helmet', 'Gloves', 'Eye protection', 'Safety boots', 'Respirator', 'Harness'];
const CONTROL_TYPES = ['Elimination', 'Substitution', 'Engineering', 'Administrative', 'PPE'];

export const RiskAssessmentModule: React.FC<RiskAssessmentModuleProps> = ({ appTheme, onBack }) => {
  const isLight = appTheme === 'light';
  const [form, setForm] = useState<Partial<RiskAssessment>>({
    companyName: 'Trojan Construction Group',
    assessmentDate: new Date().toISOString().split('T')[0],
    reviewDate: new Date(Date.now() + 31536000000).toISOString().split('T')[0],
    versionNumber: '1.0',
    personsAtRisk: [],
    ppeRequirements: [],
    hazardTable: [createEmptyHazardRow()],
    workerSignatures: [{ name: '', signed: false }]
  });

  function createEmptyHazardRow(): HazardRow {
    return {
      id: crypto.randomUUID(),
      step: '',
      hazard: '',
      consequences: '',
      personsAtRisk: '',
      existingControls: '',
      likelihood: 1,
      severity: 1,
      rating: 1,
      additionalControls: '',
      controlType: 'Elimination',
      responsiblePerson: '',
      targetDate: '',
      residualRating: 1,
      status: 'Open'
    };
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (field: 'personsAtRisk' | 'ppeRequirements', option: string) => {
    setForm(prev => {
      const current = (prev[field] as string[]) || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [field]: updated };
    });
  };

  const updateHazardRow = (id: string, updates: Partial<HazardRow>) => {
    setForm(prev => ({
      ...prev,
      hazardTable: (prev.hazardTable || []).map(row => {
        if (row.id === id) {
          const updated = { ...row, ...updates };
          if (updates.likelihood !== undefined || updates.severity !== undefined) {
            updated.rating = updated.likelihood * updated.severity;
          }
          return updated;
        }
        return row;
      })
    }));
  };

  const addHazardRow = () => {
    setForm(prev => ({
      ...prev,
      hazardTable: [...(prev.hazardTable || []), createEmptyHazardRow()]
    }));
  };

  const addWorkerSignature = () => {
    setForm(prev => ({
      ...prev,
      workerSignatures: [...(prev.workerSignatures || []), { name: '', signed: false }]
    }));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 15) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (rating >= 8) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  const SectionHeader = ({ num, title }: { num: string; title: string }) => (
    <div className="flex items-center gap-4 mb-6 mt-10">
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg border border-blue-400/20">
        {num}
      </div>
      <h3 className={`text-lg font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>
        {title}
      </h3>
    </div>
  );

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-20 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button onClick={onBack} className={`mr-4 p-2 rounded-xl transition-all ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Risk Management</h2>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1 text-left">Strategic Documentation Terminal</span>
          </div>
        </div>
      </div>

      <div className={`p-8 sm:p-12 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="text-center mb-12 border-b border-white/5 pb-8">
          <h1 className={`text-3xl sm:text-4xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
            GENERAL RISK ASSESSMENT
          </h1>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mt-2">Professional EHS Compliance Document</p>
        </div>

        {/* Section 1: Identification */}
        <SectionHeader num="1" title="General Identification" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: 'Company / Organization', name: 'companyName' },
            { label: 'Department / Project', name: 'department' },
            { label: 'Assessment Title', name: 'title', placeholder: 'e.g. Working at Height' },
            { label: 'Reference Number', name: 'refNumber' },
            { label: 'Site / Location', name: 'site' },
            { label: 'Task / Activity', name: 'taskActivity' },
            { label: 'Assessment Date', name: 'assessmentDate', type: 'date' },
            { label: 'Review Date', name: 'reviewDate', type: 'date' },
            { label: 'Version / Revision', name: 'versionNumber' },
            { label: 'Assessor Name', name: 'assessorName' },
            { label: 'Assessor Position', name: 'assessorPosition' },
            { label: 'Approver Name', name: 'approverName' },
          ].map(field => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">{field.label}</label>
              <input 
                type={field.type || 'text'}
                name={field.name}
                value={(form as any)[field.name] || ''}
                onChange={handleInputChange}
                placeholder={field.placeholder}
                className={`w-full p-4 rounded-xl border outline-none transition-all font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/20 border-white/5 focus:border-blue-500 text-white'}`}
              />
            </div>
          ))}
        </div>

        {/* Section 2: Scope */}
        <SectionHeader num="2" title="Scope & Description" />
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Task or Activity Description</label>
            <textarea 
              name="scopeDescription"
              value={form.scopeDescription}
              onChange={handleInputChange}
              rows={3}
              className={`w-full p-4 rounded-xl border outline-none transition-all font-bold text-xs resize-none ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500 shadow-inner' : 'bg-black/20 border-white/5 focus:border-blue-500 text-white'}`}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Equipment / Substances', name: 'equipmentInvolved' },
              { label: 'Area / Process Covered', name: 'areaProcess' },
              { label: 'Workers (Roles Involved)', name: 'workersInvolved' },
            ].map(field => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">{field.label}</label>
                <input 
                  type="text"
                  name={field.name}
                  value={(form as any)[field.name] || ''}
                  onChange={handleInputChange}
                  className={`w-full p-4 rounded-xl border outline-none transition-all font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/20 border-white/5 focus:border-blue-500 text-white'}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Persons at Risk */}
        <SectionHeader num="3" title="Persons at Risk" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {PERSONS_AT_RISK_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleCheckboxChange('personsAtRisk', opt)}
              className={`p-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                form.personsAtRisk?.includes(opt)
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                  : (isLight ? 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10')
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Section 4: Hazard Identification Table */}
        <SectionHeader num="4" title="Hazard Identification Table" />
        <div className="overflow-x-auto -mx-8 sm:-mx-12 px-8 sm:px-12">
          <div className="min-w-[1200px] space-y-4">
            <div className={`grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1.5fr_80px_80px_100px_1.5fr_120px_1fr_100px_100px_100px] gap-2 p-4 text-[8px] font-black uppercase tracking-widest border-b ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Step / Task</span>
              <span>Hazard Identified</span>
              <span>Consequences</span>
              <span>At Risk</span>
              <span>Existing Controls</span>
              <span className="text-center">L</span>
              <span className="text-center">S</span>
              <span className="text-center">Rating</span>
              <span>Additional Controls</span>
              <span>Type</span>
              <span>Responsible</span>
              <span>Date</span>
              <span>Residual</span>
              <span>Status</span>
            </div>
            {(form.hazardTable || []).map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1.5fr_80px_80px_100px_1.5fr_120px_1fr_100px_100px_100px] gap-2 items-center">
                <input value={row.step} onChange={e => updateHazardRow(row.id, { step: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <input value={row.hazard} onChange={e => updateHazardRow(row.id, { hazard: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <input value={row.consequences} onChange={e => updateHazardRow(row.id, { consequences: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <input value={row.personsAtRisk} onChange={e => updateHazardRow(row.id, { personsAtRisk: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <input value={row.existingControls} onChange={e => updateHazardRow(row.id, { existingControls: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <input type="number" min="1" max="5" value={row.likelihood} onChange={e => updateHazardRow(row.id, { likelihood: parseInt(e.target.value) })} className={`p-2 rounded-lg border text-[10px] font-bold text-center ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <input type="number" min="1" max="5" value={row.severity} onChange={e => updateHazardRow(row.id, { severity: parseInt(e.target.value) })} className={`p-2 rounded-lg border text-[10px] font-bold text-center ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <div className={`p-2 rounded-lg border text-[10px] font-black text-center ${getRatingColor(row.rating)}`}>{row.rating}</div>
                <input value={row.additionalControls} onChange={e => updateHazardRow(row.id, { additionalControls: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <select value={row.controlType} onChange={e => updateHazardRow(row.id, { controlType: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}>
                  {CONTROL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={row.responsiblePerson} onChange={e => updateHazardRow(row.id, { responsiblePerson: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <input type="date" value={row.targetDate} onChange={e => updateHazardRow(row.id, { targetDate: e.target.value })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`} />
                <input type="number" min="1" max="25" value={row.residualRating} onChange={e => updateHazardRow(row.id, { residualRating: parseInt(e.target.value) })} className={`p-2 rounded-lg border text-[10px] font-black text-center ${getRatingColor(row.residualRating)}`} />
                <select value={row.status} onChange={e => updateHazardRow(row.id, { status: e.target.value as any })} className={`p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            ))}
            <button 
              onClick={addHazardRow}
              className="mt-4 w-full py-4 border-2 border-dashed border-blue-500/30 rounded-2xl flex items-center justify-center gap-3 group hover:bg-blue-500/5 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Append New Hazard Entry Row</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-16">
          {/* Section 5 & 6 */}
          <div>
            <SectionHeader num="5" title="Risk Rating Matrix" />
            <div className={`p-6 rounded-[2rem] border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
               <div className="grid grid-cols-5 gap-1 mb-4">
                  <div className="text-[7px] font-black uppercase text-center py-2 rounded bg-rose-500 text-white">Extreme (15+)</div>
                  <div className="text-[7px] font-black uppercase text-center py-2 rounded bg-amber-500 text-white">High (8-14)</div>
                  <div className="text-[7px] font-black uppercase text-center py-2 rounded bg-emerald-600 text-white">Medium (4-7)</div>
                  <div className="text-[7px] font-black uppercase text-center py-2 rounded bg-blue-600 text-white">Low (1-3)</div>
                  <div className="text-[7px] font-black uppercase text-center py-2 border border-white/10 text-slate-500">Scale: 1-5</div>
               </div>
               <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Evaluation Protocol: Likelihood (Rare 1 → Almost Certain 5) × Severity (Minor 1 → Fatality 5). Initial ratings guide critical resource allocation.</p>
            </div>

            <SectionHeader num="6" title="Control Hierarchy" />
            <div className="grid grid-cols-1 gap-2">
              {['Elimination (Highest Priority)', 'Substitution', 'Engineering Controls', 'Administrative Controls', 'Personal Protective Equipment (PPE)'].map((c, i) => (
                <div key={c} className={`px-4 py-3 rounded-xl border flex items-center gap-4 ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/5'}`}>
                  <span className="text-xs font-black text-blue-500 w-4">{i + 1}.</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7 */}
          <div>
            <SectionHeader num="7" title="Emergency & Contingency" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Emergency Procedures', name: 'emergencyProcedures' },
                { label: 'First Aid Arrangements', name: 'firstAidArrangements' },
                { label: 'Fire Response Protocol', name: 'fireResponse' },
                { label: 'Spill Response Kit', name: 'spillResponse' },
                { label: 'Emergency Contacts', name: 'emergencyContacts' },
                { label: 'Nearest Medical Facility', name: 'medicalFacility' },
              ].map(field => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">{field.label}</label>
                  <input 
                    name={field.name}
                    value={(form as any)[field.name] || ''}
                    onChange={handleInputChange}
                    className={`w-full p-3 rounded-xl border outline-none font-bold text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white'}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 8: PPE */}
        <SectionHeader num="8" title="PPE Requirements" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {PPE_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => handleCheckboxChange('ppeRequirements', opt)}
              className={`p-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                form.ppeRequirements?.includes(opt)
                  ? 'bg-amber-600 border-amber-400 text-white shadow-lg'
                  : (isLight ? 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10')
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Section 9 & 10 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <SectionHeader num="9" title="Training & Competency" />
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Required Certifications</label>
                <input name="trainingCertifications" value={form.trainingCertifications} onChange={handleInputChange} className={`w-full p-3 rounded-xl border font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Toolbox Talk (TBT) Conducted</label>
                <input name="tbtConducted" value={form.tbtConducted} onChange={handleInputChange} className={`w-full p-3 rounded-xl border font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
              </div>
              <button 
                onClick={() => setForm(p => ({ ...p, inductionCompleted: !p.inductionCompleted }))}
                className={`w-full py-4 rounded-xl border text-[9px] font-black uppercase transition-all ${form.inductionCompleted ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-500'}`}
              >
                Induction Verified: {form.inductionCompleted ? 'YES' : 'NO'}
              </button>
            </div>
          </div>

          <div>
            <SectionHeader num="10" title="Environmental Considerations" />
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Waste Disposal Method', name: 'environmentalWaste' },
                { label: 'Noise Control Protocol', name: 'environmentalNoise' },
                { label: 'Dust Mitigation Plan', name: 'environmentalDust' },
                { label: 'Chemical Handling', name: 'environmentalChemical' },
                { label: 'Pollution Prevention', name: 'environmentalPollution' },
              ].map(field => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">{field.label}</label>
                  <input name={field.name} value={(form as any)[field.name] || ''} onChange={handleInputChange} className={`w-full p-3 rounded-xl border font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 11: Monitoring */}
        <SectionHeader num="11" title="Monitoring & Review" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Review Frequency</label>
            <input name="monitoringFrequency" value={form.monitoringFrequency} onChange={handleInputChange} placeholder="e.g. Weekly / Incident-based" className={`w-full p-4 rounded-xl border font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Review Triggers</label>
            <input name="monitoringTriggers" value={form.monitoringTriggers} onChange={handleInputChange} className={`w-full p-4 rounded-xl border font-bold text-xs ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
          </div>
          <div className="flex flex-col md:col-span-2 gap-1.5">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Assessor Review Comments</label>
            <textarea name="monitoringComments" value={form.monitoringComments} onChange={handleInputChange} rows={3} className={`w-full p-4 rounded-xl border font-bold text-xs resize-none ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5 text-white'}`} />
          </div>
        </div>

        {/* Section 12: Declaration & Sign-Off */}
        <SectionHeader num="12" title="Declaration & Sign-Off" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end border-t border-white/5 pt-10">
          <div className="space-y-4">
             <div className="flex flex-col gap-1.5">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Assessor Authorization</label>
               <button 
                 onClick={() => setForm(p => ({ ...p, assessorSigned: !p.assessorSigned }))}
                 className={`w-full py-6 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${form.assessorSigned ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-white/5 border-white/5 text-slate-600'}`}
               >
                 {form.assessorSigned ? (
                   <>
                     <span className="font-serif italic text-lg tracking-widest">{form.assessorName || 'AUTHORIZED'}</span>
                     <span className="text-[6px] font-black uppercase opacity-60">Verified {new Date().toLocaleDateString()}</span>
                   </>
                 ) : (
                   <span className="text-[9px] font-black uppercase tracking-widest">Verify Assessor Identity</span>
                 )}
               </button>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex flex-col gap-1.5">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Managerial Approval</label>
               <button 
                 onClick={() => setForm(p => ({ ...p, supervisorSigned: !p.supervisorSigned }))}
                 className={`w-full py-6 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${form.supervisorSigned ? 'bg-emerald-600 border-emerald-400 text-white shadow-xl' : 'bg-white/5 border-white/5 text-slate-600'}`}
               >
                 {form.supervisorSigned ? (
                   <>
                     <span className="font-serif italic text-lg tracking-widest">{form.approverName || 'SITE MANAGER'}</span>
                     <span className="text-[6px] font-black uppercase opacity-60">Verified {new Date().toLocaleDateString()}</span>
                   </>
                 ) : (
                   <span className="text-[9px] font-black uppercase tracking-widest">Verify Supervisor Consent</span>
                 )}
               </button>
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex flex-col gap-1.5">
               <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Worker Acknowledgement</label>
               <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide p-2 bg-black/20 rounded-xl">
                 {(form.workerSignatures || []).map((sig, i) => (
                    <div key={i} className="flex gap-2">
                       <input 
                         placeholder="Worker Name" 
                         value={sig.name} 
                         onChange={e => {
                           const next = [...(form.workerSignatures || [])];
                           next[i].name = e.target.value;
                           setForm(p => ({ ...p, workerSignatures: next }));
                         }}
                         className={`flex-1 p-2 rounded-lg border text-[10px] font-bold ${isLight ? 'bg-white' : 'bg-slate-900 border-white/5 text-white'}`}
                       />
                       <button 
                         onClick={() => {
                            const next = [...(form.workerSignatures || [])];
                            next[i].signed = !next[i].signed;
                            setForm(p => ({ ...p, workerSignatures: next }));
                         }}
                         className={`px-3 rounded-lg text-[8px] font-black uppercase ${sig.signed ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}
                       >
                         {sig.signed ? 'Signed' : 'Sign'}
                       </button>
                    </div>
                 ))}
                 <button onClick={addWorkerSignature} className="w-full py-2 border border-dashed border-slate-700 text-[8px] font-black uppercase text-slate-500 rounded-lg hover:text-white transition-colors">Add Worker</button>
               </div>
             </div>
          </div>
        </div>

        {/* Final Statement */}
        <div className={`mt-16 p-8 rounded-[2rem] border-2 text-center relative overflow-hidden ${isLight ? 'bg-blue-50 border-blue-100 text-blue-900 shadow-xl' : 'bg-blue-500/5 border-blue-500/20 text-blue-300 shadow-2xl shadow-blue-900/10'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <p className="text-xs sm:text-sm font-black leading-relaxed max-w-3xl mx-auto italic">
            “This risk assessment has been reviewed and approved. All identified control measures must be implemented before work commences and continuously monitored throughout the activity.”
          </p>
        </div>

        {/* Submission Mock */}
        <div className="mt-12 flex justify-center">
           <button 
             className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[0.4em] text-xs shadow-2xl hover:bg-blue-500 transition-all active:scale-95 border border-blue-400/30"
             onClick={() => alert("Risk Assessment Matrix Compiled and Queued for Submission.")}
           >
             Lock & Publish Assessment
           </button>
        </div>
      </div>
    </div>
  );
};
