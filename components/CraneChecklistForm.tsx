
import React, { useState, useEffect, useCallback } from 'react';
import { InputField } from './InputField';
import { sendToast } from '../services/notificationService';
import { submitCraneChecklist } from '../services/airtableService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { STORAGE_KEYS } from '../constants';
import { UserProfile } from '../types';
import { useEdgeSwipeBack } from '../hooks/useSwipeGesture';

interface CraneChecklistFormProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

type CheckStatus = 'ok' | 'fail' | 'na' | 'none';

const CRANE_BG = 'https://sanyglobal-img.sany.com.cn/product/goods/20220627/STC300T5-225032.jpg?x-oss-process=image/format,webp';

const CHECK_ITEMS = [
  'Documents', 'Load Chart', 'Crane Manual', 'Engine Condition', 'Hydraulic System', 
  'Hydraulic Hoses / Cylinder Condition', 'Load Monitor', 'Load Indicator Light', 
  'Anemometer Device', 'Operator Cabin', 'Breaking System', 'Gauges', 
  'Horn system / Sheaves', 'Beacon / Reverse Alarm', 'Head & Rear light', 
  'Hook Block & safety Latch', 'Wedge Socket & Wire Rope', 'Sheaves', 
  'Anti-Two Block Devices', 'Winch & Spooling', 'Wire Rope Guide Roller',
  'Outrigger Jack', 'Outrigger Pad / Mat', 'Outriggers Control System', 
  'Level Indicator', 'Boom Angle Indicator', 'Oil Leak', 'Moving Parts', 
  'Tires', 'Crawler Track', 'Side Mirrors', 'Fire Extinguisher', 
  'Counterweight', 'Seat Belt', 'Battery Condition', 'Fuel Tank', 
  'Telescopic Boom', 'Lattice Boom', 'Fly Jib'
];

export const CraneChecklistForm: React.FC<CraneChecklistFormProps> = ({ appTheme, onBack }) => {
  // Enable swipe from left edge to go back
  useEdgeSwipeBack();

  const isLight = appTheme === 'light';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  
  const [craneType, setCraneType] = useState('');
  const [metadata, setMetadata] = useState({ make: '', plate: '', date: new Date().toISOString().split('T')[0], inspector: '' });
  const [checks, setChecks] = useState<Record<string, CheckStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [defectImages, setDefectImages] = useState<Array<{ url: string; filename: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeDefectItem, setActiveDefectItem] = useState<{ item: string; shift: 'D' | 'N' } | null>(null);
  const [activeCommentKey, setActiveCommentKey] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        const profile: UserProfile = JSON.parse(saved);
        setMetadata(prev => ({ ...prev, inspector: profile.name }));
      } catch (e) {}
    }
  }, []);

  const toggleCheck = (item: string, shift: 'D' | 'N') => {
    const key = `${item}-${shift}`;
    setChecks(prev => {
      const current = prev[key] || 'none';
      let next: CheckStatus = 'ok';
      if (current === 'ok') next = 'fail';
      else if (current === 'fail') next = 'na';
      else if (current === 'na') next = 'none';
      
      if (next === 'fail') {
        setActiveDefectItem({ item, shift });
      }
      
      return { ...prev, [key]: next };
    });
  };

  const handleDefectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDefectItem) return;

    sendToast(`Uploading defect evidence for ${activeDefectItem.item}...`, "info");
    try {
      const compressed = await compressImage(file);
      // Fixed storage folder for Crane checklists
      const url = await uploadImageToStorage(compressed, 'checklists/crane');
      setDefectImages(prev => [...prev, { url, filename: `${activeDefectItem.item}_${activeDefectItem.shift}_CRANE.jpg` }]);
      sendToast("Defect image archived.", "success");
      setActiveDefectItem(null);
    } catch (err: any) {
      sendToast("Upload failed: " + err.message, "critical");
    }
  };

  const handleSync = async () => {
    if (!craneType || !metadata.plate || !metadata.inspector) {
      sendToast("Plant ID, Crane Type, and Inspector Name required.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitCraneChecklist(craneType, metadata, checks, remarks, defectImages);
      sendToast("Daily Inspection Synced", "success");
      onBack();
    } catch (err: any) {
      sendToast("Sync Failed: " + err.message, "critical");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-in slide-in-from-bottom-5 duration-500 pb-20 max-w-4xl mx-auto relative">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img src={CRANE_BG} className="w-full h-full object-cover" alt="Crane" />
        <div className={`absolute inset-0 ${isLight ? 'bg-white/10' : 'bg-black/20'}`}></div>
      </div>

      <div className={`relative z-10 p-6 sm:p-10 rounded-[3rem] border shadow-2xl backdrop-blur-md form-container-glow ${isLight ? 'bg-white/60 border-slate-200/50' : 'bg-[#0f172a]/60 border-white/10'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-3 rounded-2xl bg-white/10 border border-white/10 text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>DAILY CRANE CHECK</h1>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] bg-black/10 px-2 py-0.5 rounded-full inline-block">{today}</p>
              </div>
           </div>
           <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-white/80 border-slate-200 text-slate-600' : 'bg-black/40 border-white/10 text-slate-400'}`}>Form: TGC/CRN/D1</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
          {['ROUGH TERRAIN', 'CRAWLER LATTICE BOOM', 'ALL TERRAIN', 'CRAWLER TELESCOPIC', 'SPIDER CRANE'].map(type => (
            <button key={type} onClick={() => setCraneType(type)} className={`p-3 rounded-2xl border text-[8px] font-black uppercase tracking-widest transition-all ${craneType === type ? 'bg-amber-600 border-amber-400 text-white shadow-xl scale-[1.02]' : 'bg-black/40 border-white/10 text-slate-300 hover:bg-black/60'}`}>{type}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <InputField id="plate" label="Plant No." value={metadata.plate} onChange={e => setMetadata({...metadata, plate: e.target.value})} placeholder="CR-101" />
           <InputField id="make" label="Make / Model" value={metadata.make} onChange={e => setMetadata({...metadata, make: e.target.value})} placeholder="Liebherr / Kato" />
           <InputField id="inspector" label="Inspector" value={metadata.inspector} onChange={e => setMetadata({...metadata, inspector: e.target.value})} placeholder="Full Name" />
        </div>

        <div className={`overflow-hidden rounded-3xl border ${isLight ? 'border-slate-200 bg-white/40' : 'border-white/5 bg-black/40'}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-100/80 text-slate-500' : 'bg-white/5 text-slate-400'}`}>
                <th className="py-4 px-6">Safety Component</th>
                <th className="py-4 px-2 text-center w-20">Shift D</th>
                <th className="py-4 px-2 text-center w-20">Shift N</th>
                <th className="py-4 px-6 text-center w-24">Remark</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200/50' : 'divide-white/10'}`}>
              {CHECK_ITEMS.map((item, idx) => (
                <tr key={item} className={`group transition-colors ${isLight ? 'hover:bg-blue-50/50' : 'hover:bg-white/[0.04]'}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-blue-500 w-5 opacity-60">{idx + 1}</span>
                      <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>{item}</span>
                    </div>
                  </td>
                  <td className="py-2 px-1">
                    <button onClick={() => toggleCheck(item, 'D')} className={`w-full h-10 rounded-xl flex items-center justify-center transition-all text-sm font-black active:scale-95 ${getStatusColor(checks[`${item}-D`] || 'none')}`}>{getStatusLabel(checks[`${item}-D`] || 'none')}</button>
                  </td>
                  <td className="py-2 px-1">
                    <button onClick={() => toggleCheck(item, 'N')} className={`w-full h-10 rounded-xl flex items-center justify-center transition-all text-sm font-black active:scale-95 ${getStatusColor(checks[`${item}-N`] || 'none')}`}>{getStatusLabel(checks[`${item}-N`] || 'none')}</button>
                  </td>
                  <td className="py-2 px-6 text-center">
                     <button onClick={() => setActiveCommentKey(item)} className={`p-3 rounded-xl border ${remarks[item] ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.38 8.38 0 0 1 3.8.9L22 2l-2.5 4.5Z"/></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex flex-col items-center gap-8">
           <button onClick={handleSync} disabled={isSubmitting} className="w-full sm:w-80 py-6 bg-amber-600 text-white font-black rounded-[2rem] uppercase tracking-[0.4em] text-xs shadow-2xl transition-all border border-amber-400/20">{isSubmitting ? "Syncing..." : "Commit Daily Report"}</button>
        </div>
      </div>

      {activeDefectItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in zoom-in duration-300">
           <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl text-center ${isLight ? 'bg-white' : 'bg-slate-900 border-white/10'}`}>
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-6 text-rose-500 border border-rose-500/20 shadow-lg">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
              </div>
              <h4 className={`text-xl font-black mb-2 tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Defect Detected</h4>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-8">Component: {activeDefectItem.item}</p>
              <div className="space-y-4">
                 <label className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 cursor-pointer shadow-xl active:scale-95">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Capture Evidence
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleDefectUpload} />
                 </label>
                 <button onClick={() => setActiveDefectItem(null)} className="w-full py-4 text-slate-500 font-black uppercase text-[9px] tracking-widest">Bypass (Audit Flag)</button>
              </div>
           </div>
        </div>
      )}

      {activeCommentKey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`w-full max-w-md p-8 rounded-[2.5rem] border shadow-2xl ${isLight ? 'bg-white' : 'bg-[#0f172a]'}`}>
              <h4 className={`text-lg font-black uppercase tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>Item Remark</h4>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Item: {activeCommentKey}</p>
              <textarea value={remarks[activeCommentKey] || ''} onChange={(e) => setRemarks({...remarks, [activeCommentKey]: e.target.value})} placeholder="Log details..." rows={4} className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm resize-none mb-6 ${isLight ? 'bg-slate-50' : 'bg-black/40 border-white/5 text-white'}`} />
              <button onClick={() => setActiveCommentKey(null)} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest">Save</button>
           </div>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status: CheckStatus) => {
  if (status === 'ok') return 'bg-emerald-500 text-white';
  if (status === 'fail') return 'bg-rose-500 text-white';
  if (status === 'na') return 'bg-slate-400 text-white';
  return 'bg-white/5 text-slate-600';
};

const getStatusLabel = (status: CheckStatus) => {
  if (status === 'ok') return '✓';
  if (status === 'fail') return '✗';
  if (status === 'na') return '—';
  return '';
};
