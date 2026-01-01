
import React, { useState } from 'react';
import { InputField } from './InputField';
import { sendToast } from '../services/notificationService';

interface EquipmentChecklistFormProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

const EQUIPMENT_LIST = [
  'BACKHOE LOADER', 'SKIDSTEER LOADER', 'DUMPER', 'EXCAVATOR', 'FORKLIFT', 'DUMP TRUCK',
  'BUS', 'TELEHANDLER', 'ROLLAR COMPACTOR', 'WHEEL LOADER', 'ROAD GRADER', 'CONCRETE PUMP'
];

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const CHECK_ITEMS = [
  'Documents', 'Fire Extinguisher', 'Tires', 'Engine Condition', 'Hydraulic System',
  'Track Condition', 'Roller Condition', 'Breaking System', 'Oil Leakage',
  'Operator Cabin', 'Beacon / Reverse Alarm / Horn', 'Outrigger / Stabilizer',
  'Bucket Condition', 'Fork Attachment', 'Mirror Condition', 'Battery Connection',
  'Fuel Tank Condition', 'Seat Belt'
];

export const EquipmentChecklistForm: React.FC<EquipmentChecklistFormProps> = ({ appTheme, onBack }) => {
  const isLight = appTheme === 'light';
  const [selectedAsset, setSelectedAsset] = useState('');
  const [metadata, setMetadata] = useState({ make: '', plate: '', fromDate: '', toDate: '' });
  // Fix: Changed state type from Record<string, Record<string, 'ok' | 'fail' | 'none'>> to a flat Record.
  const [checks, setChecks] = useState<Record<string, 'ok' | 'fail' | 'none'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCheck = (item: string, day: string, shift: 'day' | 'night') => {
    const key = `${item}-${day}-${shift}`;
    setChecks(prev => {
      // Fix: current is now correctly inferred as 'ok' | 'fail' | 'none' | undefined
      const current = prev[key] || 'none';
      const next = current === 'ok' ? 'fail' : current === 'fail' ? 'none' : 'ok';
      return { ...prev, [key]: next };
    });
  };

  const getStatusColor = (item: string, day: string, shift: 'day' | 'night') => {
    const status = checks[`${item}-${day}-${shift}`];
    if (status === 'ok') return 'bg-emerald-500 text-white shadow-emerald-500/20';
    if (status === 'fail') return 'bg-rose-500 text-white shadow-rose-500/20';
    return isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-600';
  };

  const handleSync = async () => {
    if (!selectedAsset || !metadata.plate) {
      sendToast("Plant ID and Equipment Type required.", "warning");
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    sendToast("Equipment Inspection Authorized & Dispatched", "success");
    setIsSubmitting(false);
    onBack();
  };

  return (
    <div className="animate-in slide-in-from-bottom-5 duration-500 pb-20 max-w-7xl mx-auto">
      <div className={`p-8 sm:p-12 rounded-[3rem] border shadow-2xl relative overflow-hidden backdrop-blur-md ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#020617]/95 border-white/10'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>OPERATOR PRE-USE INSPECTION</h1>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Heavy Machinery Safety Matrix</p>
              </div>
           </div>
           <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'}`}>Form: NPC/OPT/CL/001</div>
        </div>

        {/* Asset Selection Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
          {EQUIPMENT_LIST.map(asset => (
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
           <InputField id="make" label="Manufacturer / Make" value={metadata.make} onChange={e => setMetadata({...metadata, make: e.target.value})} placeholder="e.g. Caterpillar" />
           <InputField id="plate" label="Asset / Plant No." value={metadata.plate} onChange={e => setMetadata({...metadata, plate: e.target.value})} placeholder="e.g. BC-09" />
           <InputField id="fromDate" label="Date From" type="text" value={metadata.fromDate} onChange={e => setMetadata({...metadata, fromDate: e.target.value})} placeholder="DD/MM/YYYY" />
           <InputField id="toDate" label="Date To" type="text" value={metadata.toDate} onChange={e => setMetadata({...metadata, toDate: e.target.value})} placeholder="DD/MM/YYYY" />
        </div>

        <div className="overflow-x-auto -mx-8 sm:-mx-12 px-8 sm:px-12">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                <th className="py-4 px-2 border-b border-white/5 w-72">Operational Verification Points</th>
                {DAYS.map(day => (
                  <th key={day} className="py-4 px-2 border-b border-white/5 text-center" colSpan={2}>{day}</th>
                ))}
              </tr>
              <tr className={`text-[7px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                <th className="py-2 px-2"></th>
                {DAYS.map(day => (
                  <React.Fragment key={day}>
                    <th className="py-2 px-1 text-center border-l border-white/5">D</th>
                    <th className="py-2 px-1 text-center border-r border-white/5">N</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {CHECK_ITEMS.map((item, idx) => (
                <tr key={item} className={`group ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-blue-500 w-5 opacity-40">{idx + 1}</span>
                      <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>{item}</span>
                    </div>
                  </td>
                  {DAYS.map(day => (
                    <React.Fragment key={day}>
                      <td className="py-2 px-1 border-l border-white/5">
                        <button onClick={() => toggleCheck(item, day, 'day')} className={`w-full h-8 rounded-lg flex items-center justify-center transition-all ${getStatusColor(item, day, 'day')}`}>
                          {checks[`${item}-${day}-day`] === 'ok' ? '✓' : checks[`${item}-${day}-day`] === 'fail' ? '✗' : ''}
                        </button>
                      </td>
                      <td className="py-2 px-1 border-r border-white/5">
                        <button onClick={() => toggleCheck(item, day, 'night')} className={`w-full h-8 rounded-lg flex items-center justify-center transition-all ${getStatusColor(item, day, 'night')}`}>
                          {checks[`${item}-${day}-night`] === 'ok' ? '✓' : checks[`${item}-${day}-night`] === 'fail' ? '✗' : ''}
                        </button>
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-16 p-8 rounded-[2.5rem] border-2 border-white/5 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-10">
           <div className="flex-1 space-y-4">
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Operator Authorization</h4>
              <p className={`text-[11px] font-bold italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                "I acknowledge that the above inspection points have been verified for the designated asset. All mechanical defects have been logged for remediation."
              </p>
           </div>
           <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center">
                 <span className="text-[6px] font-black uppercase text-slate-500 tracking-widest mb-1">Authenticated Account</span>
                 <span className="text-[10px] font-black text-emerald-500 uppercase">Status: VERIFIED</span>
              </div>
              <button 
                onClick={handleSync}
                disabled={isSubmitting}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-[0.4em] text-xs shadow-xl transition-all active:scale-95 border border-blue-400/20"
              >
                {isSubmitting ? "Transmitting..." : "Submit Inspection Matrix"}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
