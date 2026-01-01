
import React, { useState } from 'react';
import { InputField } from './InputField';
import { sendToast } from '../services/notificationService';

interface EquipmentChecklistFormProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

type CheckStatus = 'ok' | 'fail' | 'na' | 'none';

const EQUIPMENT_BG = 'https://m.media-amazon.com/images/I/71axUXxO12L.jpg';

const EQUIPMENT_LIST = [
  'BACKHOE LOADER', 'SKIDSTEER LOADER', 'DUMPER', 'EXCAVATOR', 'FORKLIFT', 'DUMP TRUCK',
  'BUS', 'TELEHANDLER', 'ROLLAR COMPACTOR', 'WHEEL LOADER', 'ROAD GRADER', 'CONCRETE PUMP'
];

const CHECK_ITEMS = [
  'Documents', 'Fire Extinguisher', 'Tires', 'Engine Condition', 'Hydraulic System',
  'Track Condition', 'Roller Condition', 'Breaking System', 'Oil Leakage',
  'Operator Cabin', 'Beacon / Reverse Alarm / Horn', 'Outrigger / Stabilizer',
  'Bucket Condition', 'Fork Attachment', 'Mirror Condition', 'Battery Connection',
  'Fuel Tank Condition', 'Seat Belt'
];

export const EquipmentChecklistForm: React.FC<EquipmentChecklistFormProps> = ({ appTheme, onBack }) => {
  const isLight = appTheme === 'light';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  
  const [selectedAsset, setSelectedAsset] = useState('');
  const [metadata, setMetadata] = useState({ make: '', plate: '', inspector: '' });
  const [checks, setChecks] = useState<Record<string, CheckStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCommentKey, setActiveCommentKey] = useState<string | null>(null);

  const toggleCheck = (item: string, shift: 'D' | 'N') => {
    const key = `${item}-${shift}`;
    setChecks(prev => {
      const current = prev[key] || 'none';
      let next: CheckStatus = 'ok';
      if (current === 'ok') next = 'fail';
      else if (current === 'fail') next = 'na';
      else if (current === 'na') next = 'none';
      return { ...prev, [key]: next };
    });
  };

  const getStatusColor = (status: CheckStatus) => {
    if (status === 'ok') return 'bg-emerald-500 text-white shadow-emerald-500/40';
    if (status === 'fail') return 'bg-rose-500 text-white shadow-rose-500/40';
    if (status === 'na') return 'bg-slate-400 text-white';
    return isLight ? 'bg-white/60 text-slate-400' : 'bg-white/5 text-slate-600';
  };

  const getStatusLabel = (status: CheckStatus) => {
    if (status === 'ok') return '✓';
    if (status === 'fail') return '✗';
    if (status === 'na') return '—';
    return '';
  };

  const handleSync = async () => {
    if (!selectedAsset || !metadata.plate) {
      sendToast("Plant ID and Equipment Type required.", "warning");
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    sendToast("Equipment Inspection Dispatched", "success");
    setIsSubmitting(false);
    onBack();
  };

  return (
    <div className="animate-in slide-in-from-bottom-5 duration-500 pb-20 max-w-4xl mx-auto relative">
      {/* Thematic Background Image */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img 
          src={EQUIPMENT_BG} 
          className="w-full h-full object-cover" 
          alt="Heavy Equipment Background" 
        />
        <div className={`absolute inset-0 ${isLight ? 'bg-white/10' : 'bg-black/20'}`}></div>
      </div>

      <div className={`relative z-10 p-6 sm:p-10 rounded-[3rem] border shadow-2xl overflow-hidden backdrop-blur-md form-container-glow ${
        isLight ? 'bg-white/60 border-slate-200/50 shadow-white/10' : 'bg-[#020617]/60 border-white/10 shadow-black/20'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>EQUIPMENT INSPECTION</h1>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] bg-black/10 px-2 py-0.5 rounded-full inline-block">{today}</p>
              </div>
           </div>
           <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-white/80 border-slate-200 text-slate-600' : 'bg-black/40 border-white/10 text-slate-500'}`}>Form: TGC/OPT/D2</div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 px-2 justify-center sm:justify-start">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div><span className={`text-[9px] font-black uppercase ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>Pass</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div><span className={`text-[9px] font-black uppercase ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>Fail</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 rounded-full shadow-[0_0_8px_rgba(148,163,184,0.5)]"></div><span className={`text-[9px] font-black uppercase ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>N/A</span></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {EQUIPMENT_LIST.slice(0, 8).map(asset => (
            <button 
              key={asset}
              onClick={() => setSelectedAsset(asset)}
              className={`p-3 rounded-2xl border text-[8px] font-black uppercase tracking-widest transition-all ${
                selectedAsset === asset ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-[1.02]' : 'bg-black/40 border-white/10 text-slate-300 hover:bg-black/60'
              }`}
            >
              {asset}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <InputField id="plate" label="Plant No." value={metadata.plate} onChange={e => setMetadata({...metadata, plate: e.target.value})} placeholder="e.g. BC-09" />
           <InputField id="make" label="Make / Model" value={metadata.make} onChange={e => setMetadata({...metadata, make: e.target.value})} placeholder="Caterpillar / JCB" />
           <InputField id="inspector" label="Supervisor" value={metadata.inspector} onChange={e => setMetadata({...metadata, inspector: e.target.value})} placeholder="Name" />
        </div>

        <div className={`overflow-hidden rounded-3xl border ${isLight ? 'border-slate-200 bg-white/40' : 'border-white/5 bg-black/40'}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-100/80 text-slate-500' : 'bg-white/5 text-slate-400'}`}>
                <th className="py-4 px-6">Verification Point</th>
                <th className="py-4 px-2 text-center w-20">Shift D</th>
                <th className="py-4 px-2 text-center w-20">Shift N</th>
                <th className="py-4 px-6 text-center w-24">Note</th>
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
                    <button 
                      onClick={() => toggleCheck(item, 'D')} 
                      className={`w-full h-10 rounded-xl flex items-center justify-center transition-all text-sm font-black active:scale-95 ${getStatusColor(checks[`${item}-D`] || 'none')}`}
                    >
                      {getStatusLabel(checks[`${item}-D`] || 'none')}
                    </button>
                  </td>
                  <td className="py-2 px-1">
                    <button 
                      onClick={() => toggleCheck(item, 'N')} 
                      className={`w-full h-10 rounded-xl flex items-center justify-center transition-all text-sm font-black active:scale-95 ${getStatusColor(checks[`${item}-N`] || 'none')}`}
                    >
                      {getStatusLabel(checks[`${item}-N`] || 'none')}
                    </button>
                  </td>
                  <td className="py-2 px-6 text-center">
                     <button 
                       onClick={() => setActiveCommentKey(item)}
                       className={`p-3 rounded-xl transition-all border ${
                         remarks[item] 
                           ? 'bg-blue-600 text-white border-blue-400 shadow-lg' 
                           : (isLight ? 'bg-white/80 text-slate-400 border-slate-200' : 'bg-black/20 text-slate-500 border-white/5 hover:text-white')
                       }`}
                     >
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`mt-16 p-8 rounded-[2.5rem] border-2 flex flex-col sm:flex-row items-center justify-between gap-10 ${isLight ? 'bg-white/40 border-slate-200/50' : 'bg-black/40 border-white/5'}`}>
           <div className="flex-1 space-y-4">
              <h4 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-blue-600' : 'text-blue-500'}`}>Operator Authorization</h4>
              <p className={`text-[11px] font-bold italic ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                "I acknowledge the verification of the asset for daily readiness. All defects are recorded for remediation."
              </p>
           </div>
           <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button 
                onClick={handleSync}
                disabled={isSubmitting}
                className="px-10 py-6 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-[2rem] uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-95 border border-blue-400/20"
              >
                {isSubmitting ? "Dispatching..." : "Commit Matrix"}
              </button>
           </div>
        </div>
      </div>

      {activeCommentKey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in duration-300">
           <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl ${isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-950/95 border-white/10'}`}>
              <h4 className={`text-lg font-black uppercase tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>Asset Remarks</h4>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Item: {activeCommentKey}</p>
              <textarea 
                value={remarks[activeCommentKey] || ''}
                onChange={(e) => setRemarks({...remarks, [activeCommentKey]: e.target.value})}
                placeholder="Log maintenance notes..."
                rows={4}
                className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm resize-none mb-6 ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 text-white focus:border-blue-500'}`}
              />
              <div className="flex flex-col gap-3">
                 <button onClick={() => setActiveCommentKey(null)} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-500 transition-all">Save Note</button>
                 <button onClick={() => setActiveCommentKey(null)} className={`w-full py-4 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all ${isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>Dismiss</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
