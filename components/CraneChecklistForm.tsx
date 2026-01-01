
import React, { useState } from 'react';
import { InputField } from './InputField';
import { sendToast } from '../services/notificationService';

interface CraneChecklistFormProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

type CheckStatus = 'ok' | 'fail' | 'na' | 'none';

const CRANE_TYPES = [
  'ROUGH TERRAIN', 
  'CRAWLER LATTICE BOOM', 
  'ALL TERRAIN', 
  'CRAWLER TELESCOPIC', 
  'SPIDER CRANE', 
  'LORRY MOUNTED CRANE'
];

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
  const isLight = appTheme === 'light';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  
  const [craneType, setCraneType] = useState('');
  const [metadata, setMetadata] = useState({ make: '', plate: '', date: new Date().toISOString().split('T')[0], inspector: '' });
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
    if (status === 'ok') return 'bg-emerald-500 text-white';
    if (status === 'fail') return 'bg-rose-500 text-white';
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
    if (!craneType || !metadata.plate) {
      sendToast("Plant ID and Crane Type required.", "warning");
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    sendToast("Daily Inspection Synced Successfully", "success");
    setIsSubmitting(false);
    onBack();
  };

  return (
    <div className="animate-in slide-in-from-bottom-5 duration-500 pb-20 max-w-4xl mx-auto">
      <div className={`p-6 sm:p-10 rounded-[3rem] border shadow-2xl relative overflow-hidden backdrop-blur-md ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a]/90 border-white/10'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>DAILY CRANE CHECK</h1>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">{today}</p>
              </div>
           </div>
           <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5 text-slate-400'}`}>Form: TGC/CRN/D1</div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 px-2 justify-center sm:justify-start">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-500">Pass</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-500">Fail</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 rounded-full"></div><span className="text-[9px] font-black uppercase text-slate-500">N/A</span></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
          {CRANE_TYPES.slice(0, 6).map(type => (
            <button 
              key={type}
              onClick={() => setCraneType(type)}
              className={`p-3 rounded-2xl border text-[8px] font-black uppercase tracking-widest transition-all ${
                craneType === type ? 'bg-amber-600 border-amber-400 text-white shadow-xl' : 'bg-black/20 border-white/5 text-slate-500'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <InputField id="plate" label="Plant No." value={metadata.plate} onChange={e => setMetadata({...metadata, plate: e.target.value})} placeholder="e.g. CR-101" />
           <InputField id="make" label="Make / Model" value={metadata.make} onChange={e => setMetadata({...metadata, make: e.target.value})} placeholder="Liebherr / Kato" />
           <InputField id="inspector" label="Inspector" value={metadata.inspector} onChange={e => setMetadata({...metadata, inspector: e.target.value})} placeholder="Full Name" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/5">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-50 text-slate-400' : 'bg-white/5 text-slate-500'}`}>
                <th className="py-4 px-6">Safety Component</th>
                <th className="py-4 px-2 text-center w-20">Shift D</th>
                <th className="py-4 px-2 text-center w-20">Shift N</th>
                <th className="py-4 px-6 text-center w-24">Remark</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
              {CHECK_ITEMS.map((item, idx) => (
                <tr key={item} className={`group transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-slate-500 w-5 opacity-30">{idx + 1}</span>
                      <span className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{item}</span>
                    </div>
                  </td>
                  <td className="py-2 px-1">
                    <button 
                      onClick={() => toggleCheck(item, 'D')}
                      className={`w-full h-10 rounded-xl flex items-center justify-center transition-all text-sm font-black shadow-sm active:scale-95 ${getStatusColor(checks[`${item}-D`] || 'none')}`}
                    >
                      {getStatusLabel(checks[`${item}-D`] || 'none')}
                    </button>
                  </td>
                  <td className="py-2 px-1">
                    <button 
                      onClick={() => toggleCheck(item, 'N')}
                      className={`w-full h-10 rounded-xl flex items-center justify-center transition-all text-sm font-black shadow-sm active:scale-95 ${getStatusColor(checks[`${item}-N`] || 'none')}`}
                    >
                      {getStatusLabel(checks[`${item}-N`] || 'none')}
                    </button>
                  </td>
                  <td className="py-2 px-6 text-center">
                     <button 
                       onClick={() => setActiveCommentKey(item)}
                       className={`p-3 rounded-xl transition-all border ${
                         remarks[item] 
                           ? 'bg-blue-600 text-white border-blue-400' 
                           : (isLight ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-white/5 text-slate-600 border-white/10')
                       }`}
                     >
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.38 8.38 0 0 1 3.8.9L22 2l-2.5 4.5Z"/></svg>
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex flex-col items-center gap-8">
           <div className={`p-6 rounded-3xl border text-center w-full ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5'}`}>
              <p className={`text-xs font-black uppercase italic leading-relaxed ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
                "I certify that the mobile crane was inspected for today's shifts. Any FAIL components have been reported."
              </p>
           </div>
           <button 
             onClick={handleSync}
             disabled={isSubmitting}
             className="w-full sm:w-80 py-5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-95 border border-amber-400/20"
           >
             {isSubmitting ? "Syncing..." : "Commit Daily Report"}
           </button>
        </div>
      </div>

      {activeCommentKey && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className={`w-full max-w-md p-8 rounded-[2.5rem] border shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
              <h4 className={`text-lg font-black uppercase tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>Item Remark</h4>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">Item: {activeCommentKey}</p>
              <textarea 
                value={remarks[activeCommentKey] || ''}
                onChange={(e) => setRemarks({...remarks, [activeCommentKey]: e.target.value})}
                placeholder="Log details..."
                rows={4}
                className={`w-full p-4 rounded-2xl border outline-none font-bold text-sm resize-none mb-6 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5 text-white focus:border-blue-500'}`}
              />
              <div className="flex flex-col gap-3">
                 <button onClick={() => setActiveCommentKey(null)} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest">Save</button>
                 <button onClick={() => setActiveCommentKey(null)} className={`w-full py-4 font-black rounded-2xl uppercase text-[10px] tracking-widest ${isLight ? 'bg-slate-100' : 'bg-white/5'}`}>Dismiss</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
