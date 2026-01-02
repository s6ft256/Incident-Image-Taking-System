import React, { useState, useEffect, useMemo } from 'react';
import { getAllCraneChecklists, getAllEquipmentChecklists } from '../services/airtableService';
import { FetchedCraneChecklist, FetchedEquipmentChecklist } from '../types';

interface ChecklistsProps {
  appTheme?: 'dark' | 'light';
  onBack: () => void;
  onOpenInspection: (url: string) => void;
  onOpenCrane: () => void;
  onOpenEquipment: () => void;
}

type Tab = 'inventory' | 'crane-history' | 'equipment-history';

const CRANE_ITEMS = [
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

const EQUIP_ITEMS = [
  'Documents', 'Fire Extinguisher', 'Tires', 'Engine Condition', 'Hydraulic System',
  'Track Condition', 'Roller Condition', 'Breaking System', 'Oil Leakage',
  'Operator Cabin', 'Beacon / Reverse Alarm / Horn', 'Outrigger / Stabilizer',
  'Bucket Condition', 'Fork Attachment', 'Mirror Condition', 'Battery Connection',
  'Fuel Tank Condition', 'Seat Belt'
];

export const Checklists: React.FC<ChecklistsProps> = ({ appTheme = 'dark', onBack, onOpenInspection, onOpenCrane, onOpenEquipment }) => {
  const isLight = appTheme === 'light';
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [craneHistory, setCraneHistory] = useState<FetchedCraneChecklist[]>([]);
  const [equipmentHistory, setEquipmentHistory] = useState<FetchedEquipmentChecklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === 'crane-history') fetchCraneHistory();
    if (activeTab === 'equipment-history') fetchEquipmentHistory();
  }, [activeTab]);

  const fetchCraneHistory = async () => {
    setLoading(true);
    try {
      const data = await getAllCraneChecklists();
      setCraneHistory(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchEquipmentHistory = async () => {
    setLoading(true);
    try {
      const data = await getAllEquipmentChecklists();
      setEquipmentHistory(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const parsedData = useMemo(() => {
    if (!selectedRecord?.fields["Inspection Data"]) return null;
    try {
      return JSON.parse(selectedRecord.fields["Inspection Data"]);
    } catch (e) {
      return null;
    }
  }, [selectedRecord]);

  const getStatusDisplay = (item: string, shift: 'D' | 'N') => {
    const status = parsedData?.checks?.[`${item}-${shift}`] || 'none';
    if (status === 'ok') return <span className="text-emerald-500 font-black text-xs">PASS</span>;
    if (status === 'fail') return <span className="text-rose-500 font-black text-xs animate-pulse">FAIL</span>;
    if (status === 'na') return <span className="text-slate-500 font-black text-xs">N/A</span>;
    return <span className="opacity-10 text-[8px]">VOID</span>;
  };

  const RecordCard: React.FC<{ record: any, type: 'crane' | 'equipment' }> = ({ record, type }) => {
    const isGrounded = record.fields["Status"] === "Grounded";
    return (
      <div 
        onClick={() => setSelectedRecord({ ...record, inspectionType: type })}
        className={`p-5 rounded-3xl border transition-all duration-300 cursor-pointer group hover:translate-x-1 ${
          isLight ? 'bg-white border-slate-200 hover:border-blue-400' : 'bg-white/[0.03] border-white/5 hover:border-blue-500/50'
        }`}
      >
        <div className="flex justify-between items-start mb-4">
           <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{record.fields["Inspection Date"]}</span>
              <h4 className={`text-sm font-black mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {record.fields["Plant Number"]} • {record.fields["Make and Model"]}
              </h4>
           </div>
           <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${
             isGrounded ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
           }`}>
             {record.fields["Status"]}
           </span>
        </div>
        <div className="flex items-center justify-between opacity-60">
           <span className="text-[9px] font-bold truncate max-w-[150px]">{record.fields["Inspector Name"]}</span>
           <div className="flex gap-1">
              {record.fields["Image"]?.length > 0 && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-24 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button onClick={onBack} className={`mr-4 p-3 rounded-2xl border transition-all ${isLight ? 'bg-white text-slate-500 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className={`text-2xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Check lists</h2>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Inspection Protocol Hub</span>
          </div>
        </div>
      </div>

      <div className={`flex p-1 mb-8 rounded-2xl border transition-colors max-w-lg ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
         {['inventory', 'crane-history', 'equipment-history'].map((t) => (
           <button 
             key={t}
             onClick={() => setActiveTab(t as Tab)}
             className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
               activeTab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
             }`}
           >
             {t.replace('-', ' ')}
           </button>
         ))}
      </div>

      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
           <InventoryCard title="Crane checklist" sub="Lifting Protocol" img="https://sanyglobal-img.sany.com.cn/product/goods/20220627/STC300T5-225032.jpg" onAction={onOpenCrane} color="amber" isLight={isLight} />
           <InventoryCard title="Equipment Check" sub="General Assets" img="https://m.media-amazon.com/images/I/71axUXxO12L.jpg" onAction={onOpenEquipment} color="blue" isLight={isLight} />
           <InventoryCard title="Legacy Portal" sub="Cloud Forms" img="" onAction={() => onOpenInspection('https://checklist-nu-lovat.vercel.app/')} color="emerald" isLight={isLight} />
        </div>
      )}

      {(activeTab === 'crane-history' || activeTab === 'equipment-history') && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Accessing Archives...</span>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === 'crane-history' ? craneHistory : equipmentHistory).map(rec => (
                // FIX: Added key prop to the component call, which is a standard React requirement for lists.
                <RecordCard key={rec.id} record={rec} type={activeTab === 'crane-history' ? 'crane' : 'equipment'} />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
           <div className={`w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-[3rem] border shadow-2xl p-6 sm:p-12 ${isLight ? 'bg-white' : 'bg-[#020617] border-white/10'}`}>
              
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-6 border-b border-white/5 pb-8">
                 <div className="space-y-1">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Official Audit Record</span>
                    <h3 className={`text-3xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {selectedRecord.inspectionType === 'crane' ? 'DAILY CRANE CHECK' : 'EQUIPMENT INSPECTION'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                       <div className={`w-2.5 h-2.5 rounded-full ${selectedRecord.fields["Status"] === "Grounded" ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_15px_currentColor]`}></div>
                       <span className={`text-[11px] font-black uppercase tracking-widest ${selectedRecord.fields["Status"] === "Grounded" ? 'text-rose-500' : 'text-emerald-500'}`}>
                         Fleet Status: {selectedRecord.fields["Status"]}
                       </span>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                      FORM: {selectedRecord.inspectionType === 'crane' ? 'TGC/CRN/D1' : 'TGC/OPT/D2'}
                    </div>
                    <button onClick={() => setSelectedRecord(null)} className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 transition-all text-rose-500 border border-rose-500/20">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                 </div>
              </div>

              {/* Identification Grid */}
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 p-8 rounded-[2rem] border mb-10 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5 shadow-inner'}`}>
                 {[
                   { label: 'Inspection Date', val: selectedRecord.fields["Inspection Date"] },
                   { label: 'Inspector Name', val: selectedRecord.fields["Inspector Name"] },
                   { label: 'Plant Number', val: selectedRecord.fields["Plant Number"], color: 'text-blue-500' },
                   { label: 'Make and Model', val: selectedRecord.fields["Make and Model"] || selectedRecord.fields["Equipment Type"] }
                 ].map(i => (
                   <div key={i.label}>
                      <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{i.label}</span>
                      <span className={`text-[13px] font-black uppercase truncate block ${i.color || (isLight ? 'text-slate-800' : 'text-slate-100')}`}>{i.val}</span>
                   </div>
                 ))}
              </div>

              {/* Component Matrix Viewer */}
              <div className="mb-12">
                 <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-6 px-2">Safety Component Audit Matrix</h4>
                 <div className={`overflow-hidden rounded-[2.5rem] border ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-100/80 text-slate-500' : 'bg-white/5 text-slate-400'}`}>
                             <th className="py-5 px-8">Component</th>
                             <th className="py-5 px-4 text-center w-32 border-x border-white/5">Day (D)</th>
                             <th className="py-5 px-4 text-center w-32 border-r border-white/5">Night (N)</th>
                             <th className="py-5 px-8">Inspector Remarks</th>
                          </tr>
                       </thead>
                       <tbody className={`divide-y ${isLight ? 'divide-slate-200/50' : 'divide-white/10'}`}>
                          {(selectedRecord.inspectionType === 'crane' ? CRANE_ITEMS : EQUIP_ITEMS).map((item, idx) => {
                             const isDefect = parsedData?.checks?.[`${item}-D`] === 'fail' || parsedData?.checks?.[`${item}-N`] === 'fail';
                             return (
                               <tr key={item} className={`group transition-colors ${
                                 isDefect ? (isLight ? 'bg-rose-50/50' : 'bg-rose-500/[0.04]') : (isLight ? 'hover:bg-blue-50/30' : 'hover:bg-white/[0.01]')
                               }`}>
                                  <td className="py-4 px-8">
                                     <div className="flex items-center gap-4">
                                        <span className={`text-[9px] font-black w-6 h-6 rounded-lg flex items-center justify-center border ${
                                          isDefect ? 'bg-rose-500 text-white border-rose-400' : (isLight ? 'bg-white text-blue-500 border-slate-200' : 'bg-black/20 text-blue-500 border-white/5')
                                        }`}>{idx + 1}</span>
                                        <span className={`text-[12px] font-bold ${isDefect ? (isLight ? 'text-rose-900' : 'text-rose-400') : (isLight ? 'text-slate-800' : 'text-slate-100')}`}>{item}</span>
                                     </div>
                                  </td>
                                  <td className="py-4 px-4 text-center border-x border-white/5">{getStatusDisplay(item, 'D')}</td>
                                  <td className="py-4 px-4 text-center border-r border-white/5">{getStatusDisplay(item, 'N')}</td>
                                  <td className="py-4 px-8 italic text-[11px] text-slate-500">
                                     {parsedData?.remarks?.[item] || "—"}
                                  </td>
                               </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Defect Documentation Footer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] px-2">Critical Failure Summary</h4>
                    <div className={`p-8 rounded-[2.5rem] border-2 shadow-2xl relative overflow-hidden min-h-[160px] flex flex-col justify-center ${
                      selectedRecord.fields["Critical Failures"] && selectedRecord.fields["Critical Failures"] !== "None"
                        ? (isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-500/[0.03] border-rose-500/20 text-rose-100 shadow-rose-900/20')
                        : (isLight ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-black/40 border-white/5 opacity-30')
                    }`}>
                       {selectedRecord.fields["Critical Failures"] && selectedRecord.fields["Critical Failures"] !== "None" ? (
                         <div className="relative z-10 space-y-4">
                            <p className="text-sm font-black uppercase tracking-[0.1em]">{selectedRecord.fields["Critical Failures"]}</p>
                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 animate-pulse">Action Required</span>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center opacity-60">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            <span className="text-[10px] font-black uppercase mt-3 tracking-widest">No Failures Logged</span>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] px-2">Photographic Evidence</h4>
                    {selectedRecord.fields["Image"]?.length > 0 ? (
                       <div className="grid grid-cols-2 gap-4">
                          {selectedRecord.fields["Image"].map((img: any, i: number) => (
                             <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="group/img aspect-video rounded-[1.5rem] overflow-hidden border-2 border-white/5 shadow-2xl relative transition-all active:scale-95 hover:border-blue-500/50">
                                <img src={img.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110" alt="Defect Detail" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                   <div className="bg-blue-600 p-3 rounded-full shadow-2xl">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                   </div>
                                </div>
                                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[7px] font-black text-white uppercase tracking-widest">Evidence ID: {i + 1}</div>
                             </a>
                          ))}
                       </div>
                    ) : (
                       <div className={`h-[160px] rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center opacity-20 ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-white/5 border-white/10'}`}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          <span className="text-[10px] font-black uppercase mt-4 tracking-[0.2em]">Zero Attachments</span>
                       </div>
                    )}
                 </div>
              </div>

              <div className="mt-16 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div>
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Certified By Inspector</span>
                       <span className={`text-lg font-black tracking-tight uppercase ${isLight ? 'text-slate-900' : 'text-blue-500'}`}>{selectedRecord.fields["Inspector Name"]}</span>
                    </div>
                 </div>
                 <button 
                   onClick={() => setSelectedRecord(null)} 
                   className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:bg-blue-500 transition-all border border-blue-400/30"
                 >
                   Close Audit Terminal
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const InventoryCard = ({ title, sub, img, onAction, color, isLight }: any) => {
  const colors: any = { amber: 'bg-amber-600', blue: 'bg-blue-600', emerald: 'bg-emerald-600' };
  return (
    <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-all duration-300 group flex flex-col justify-between h-72 ${isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
      <div className="absolute inset-0 z-0 opacity-[0.05] group-hover:opacity-[0.12] transition-opacity duration-500">
         {img && <img src={img} className="w-full h-full object-cover blur-[1px]" alt="context" />}
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl border border-white/20 group-hover:scale-110 transition-transform ${colors[color]}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
          </div>
          <div>
            <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isLight ? 'text-slate-500' : `text-${color}-500`}`}>{sub}</p>
          </div>
        </div>
      </div>
      <button onClick={onAction} className={`relative z-10 w-full py-4 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 border border-white/10 ${colors[color]}`}>Initialize</button>
    </div>
  );
};