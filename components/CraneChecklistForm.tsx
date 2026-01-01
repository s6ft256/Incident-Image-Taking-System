
import React, { useState } from 'react';
import { InputField } from './InputField';
import { sendToast } from '../services/notificationService';

interface CraneChecklistFormProps {
  appTheme: 'dark' | 'light';
  onBack: () => void;
}

const CRANE_TYPES = [
  'ROUGH TERRAIN', 
  'CRAWLER LATTICE BOOM', 
  'ALL TERRAIN', 
  'CRAWLER TELESCOPIC', 
  'SPIDER CRANE', 
  'LORRY MOUNTED CRANE'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const [craneType, setCraneType] = useState('');
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
    if (status === 'ok') return 'bg-emerald-500 text-white';
    if (status === 'fail') return 'bg-rose-500 text-white';
    return isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-slate-600';
  };

  const handleSync = async () => {
    if (!craneType || !metadata.plate) {
      sendToast("Plant ID and Crane Type required.", "warning");
      return;
    }
    setIsSubmitting(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    sendToast("Crane Inspection Record Synced Successfully", "success");
    setIsSubmitting(false);
    onBack();
  };

  return (
    <div className="animate-in slide-in-from-bottom-5 duration-500 pb-20 max-w-7xl mx-auto">
      <div className={`p-8 sm:p-12 rounded-[3rem] border shadow-2xl relative overflow-hidden backdrop-blur-md ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a]/90 border-white/10'
      }`}>
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <button onClick={onBack} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>MOBILE CRANE CHECKLIST</h1>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Operational Pre-Use Verification</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-50' : 'bg-black/20'}`}>Ref No: NPC/CRN/2024</div>
           </div>
        </div>

        {/* Crane Type Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {CRANE_TYPES.map(type => (
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

        {/* Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
           <InputField id="make" label="Make / Model" value={metadata.make} onChange={e => setMetadata({...metadata, make: e.target.value})} placeholder="e.g. Liebherr" />
           <InputField id="plate" label="Plant No." value={metadata.plate} onChange={e => setMetadata({...metadata, plate: e.target.value})} placeholder="e.g. CR-101" />
           <InputField id="fromDate" label="Date From" type="text" value={metadata.fromDate} onChange={e => setMetadata({...metadata, fromDate: e.target.value})} placeholder="DD/MM/YYYY" />
           <InputField id="toDate" label="Date To" type="text" value={metadata.toDate} onChange={e => setMetadata({...metadata, toDate: e.target.value})} placeholder="DD/MM/YYYY" />
        </div>

        {/* Main Grid Table */}
        <div className="overflow-x-auto -mx-8 sm:-mx-12 px-8 sm:px-12">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                <th className="py-4 px-2 border-b border-white/5 w-64">Safety Items / Components</th>
                {DAYS.map(day => (
                  <th key={day} className="py-4 px-2 border-b border-white/5 text-center" colSpan={2}>{day}</th>
                ))}
              </tr>
              <tr className={`text-[7px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                <th className="py-2 px-2"></th>
                {DAYS.map(day => (
                  <React.Fragment key={day}>
                    <th className="py-2 px-1 text-center border-l border-white/5">Day</th>
                    <th className="py-2 px-1 text-center border-r border-white/5">Night</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {CHECK_ITEMS.map((item, idx) => (
                <tr key={item} className={`group ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-500 w-6 opacity-30">{idx + 1}</span>
                      <span className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{item}</span>
                    </div>
                  </td>
                  {DAYS.map(day => (
                    <React.Fragment key={day}>
                      <td className="py-2 px-1 border-l border-white/5">
                        <button 
                          onClick={() => toggleCheck(item, day, 'day')}
                          className={`w-full h-8 rounded-lg flex items-center justify-center transition-all ${getStatusColor(item, day, 'day')}`}
                        >
                          {checks[`${item}-${day}-day`] === 'ok' ? '✓' : checks[`${item}-${day}-day`] === 'fail' ? '✗' : ''}
                        </button>
                      </td>
                      <td className="py-2 px-1 border-r border-white/5">
                        <button 
                          onClick={() => toggleCheck(item, day, 'night')}
                          className={`w-full h-8 rounded-lg flex items-center justify-center transition-all ${getStatusColor(item, day, 'night')}`}
                        >
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

        {/* Footer Authorization */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-white/5">
           <div className={`p-8 rounded-[2rem] border ${isLight ? 'bg-slate-50' : 'bg-black/20 border-white/5'}`}>
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6">Operator Verification</h4>
              <div className="space-y-4">
                 <div className="flex flex-col gap-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Digital Signature</label>
                   <div className={`h-16 border-2 border-dashed rounded-xl flex items-center justify-center italic text-xl font-serif ${isLight ? 'border-slate-300 text-slate-400' : 'border-white/10 text-slate-600'}`}>Digitally Verified Account</div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">3rd Party Expiry</label>
                     <input type="text" placeholder="DD/MM/YYYY" className={`p-3 rounded-lg border text-xs font-bold ${isLight ? 'bg-white' : 'bg-slate-900 border-white/10 text-white'}`} />
                   </div>
                   <div className="flex flex-col gap-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Reg. Expiry</label>
                     <input type="text" placeholder="DD/MM/YYYY" className={`p-3 rounded-lg border text-xs font-bold ${isLight ? 'bg-white' : 'bg-slate-900 border-white/10 text-white'}`} />
                   </div>
                 </div>
              </div>
           </div>
           
           <div className="flex flex-col justify-center gap-6">
              <p className={`text-xs font-black uppercase italic leading-relaxed text-center ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
                "I hereby certify that I have conducted a thorough inspection of the mobile crane as logged above and confirm it is safe for operational deployment."
              </p>
              <button 
                onClick={handleSync}
                disabled={isSubmitting}
                className="w-full py-6 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-[2rem] uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-95 border border-amber-400/20"
              >
                {isSubmitting ? "Transmitting Report..." : "Sync Inspection to Cloud"}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
