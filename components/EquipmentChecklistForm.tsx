
import React, { useState } from 'react';
import { InputField } from './InputField';
import { sendToast } from '../services/notificationService';

interface EquipmentChecklistFormProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

type CheckStatus = 'ok' | 'fail' | 'na' | 'none';

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
    if (status === 'ok') return 'bg-emerald-500 text-white shadow-emerald-500/20';
    if (status === 'fail') return 'bg-rose-500 text-white shadow-rose-500/20';
    if (status === 'na') return 'bg-slate-400 text-white';
    return isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-600';
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
    <div className="animate-in slide-in-from-bottom-5 duration-500 pb-20 max-w-4xl mx-auto">
      <div className={`p-6 sm:p-10 rounded-[3rem] border shadow-2xl relative overflow-hidden backdrop-blur-md ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#020617]/95 border-white/10'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>EQUIPMENT INSPECTION</h1>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{today}</p>
              </div>
           </div>
           <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-slate-500'}`}>Form: TGC/OPT/D2</div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 px-2 justify-center sm:justify-start">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-500">Pass</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-500">Fail</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-500">N/A</span></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {EQUIPMENT_LIST.slice(0, 8).map(asset => (
            <button 
              key={asset}
              onClick={() => setSelectedAsset(asset)}
              className={`p-3 rounded-2xl border text-[8px] font-black uppercase tracking-widest transition-all ${
                selectedAsset === asset ? 'bg-blue-600 border-blue-400 text-white shadow-xl' : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300'
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

        <div className="overflow-hidden rounded-3xl border border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-50 text-slate-400' : 'bg-white/5 text-slate-500'}`}>
                <th className="py-4 px-6">Verification Point</th>
                <th className="py-4 px-2 text-center w-20">Shift D</th>
                <th className="py-4 px-2 text-center w-20">Shift N</th>
                <th className="py-4 px-6 text-center w-24">Note</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
              {CHECK_ITEMS.map((item, idx) => (
                <tr key={item} className={`group transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-blue-500 w-5 opacity-40">{idx + 1}</span>
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
                           ? 'bg-blue-600 text-white border-blue-400 shadow-md' 
                           : (isLight ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white/5 text-slate-600 border-white/10')
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

        <div className="mt-16 p-8 rounded-[2.5rem] border-2 border-white/5 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-10">
           <div className="flex-1 space-y-4">
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Operator Authorization</h4>
              <p className={`text-[11px] font-bold italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                "I acknowledge the verification of the asset for daily readiness. All defects are recorded for remediation."
              </p>
           </div>
           <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button 
                onClick={handleSync}
                disabled={isSubmitting}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-xl transition-all active:scale-95 border border-blue-400/20"
              >
                {isSubmitting ? "Dispatching..." : "Commit Matrix"}
              </button>
           </div>
        </div>
      </div>

      {activeCommentKey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in duration-300">
           <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-white/10'}`}>
              <h4 className={`text-lg font-black uppercase tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>Asset Remarks</h4>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Item: {activeCommentKey}</p>
              <textarea 
                value={remarks[activeCommentKey] || ''}
                onChange={(e) => setRemarks({...remarks, [activeCommentKey]: e.target.value})}
                placeholder="Log maintenance notes..."
                rows={4}
                className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm resize-none mb-6 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-white focus:border-blue-500'}`}
              />
              <div className="flex flex-col gap-3">
                 <button onClick={() => setActiveCommentKey(null)} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg">Save Note</button>
                 <button onClick={() => setActiveCommentKey(null)} className={`w-full py-4 font-black rounded-2xl uppercase text-[10px] tracking-widest ${isLight ? 'bg-slate-100' : 'bg-white/5'}`}>Dismiss</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
