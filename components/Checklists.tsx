
import React from 'react';

interface ChecklistsProps {
  appTheme?: 'dark' | 'light';
  onBack: () => void;
  onOpenInspection: (url: string) => void;
  onOpenCrane: () => void;
  onOpenEquipment: () => void;
}

const CRANE_CARD_IMG = 'https://sanyglobal-img.sany.com.cn/product/goods/20220627/STC300T5-225032.jpg?x-oss-process=image/format,webp';
const EQUIPMENT_CARD_IMG = 'https://m.media-amazon.com/images/I/71axUXxO12L.jpg';

export const Checklists: React.FC<ChecklistsProps> = ({ appTheme = 'dark', onBack, onOpenInspection, onOpenCrane, onOpenEquipment }) => {
  const isLight = appTheme === 'light';

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-24 max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 mb-4 px-1 opacity-60">
        <button 
          onClick={onBack} 
          className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isLight ? 'text-slate-500 hover:text-blue-600' : 'text-slate-400 hover:text-blue-400'}`}
        >
          Command Center
        </button>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-600">
          <path d="m9 18 6-6-6-6"/>
        </svg>
        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Inventory & Checklists</span>
      </nav>

      {/* Header Section */}
      <div className="flex items-center mb-8">
        <button 
          onClick={onBack} 
          className={`mr-4 p-3 rounded-2xl border transition-all shadow-sm ${
            isLight 
              ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' 
              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white shadow-black/20'
          }`}
          title="Back to Dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex flex-col">
          <h2 className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Check lists</h2>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 text-left">Safety Verification Hub</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Crane Checklist Card */}
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-all duration-300 group flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/10'
        }`}>
          {/* Card Image Background Overlay */}
          <div className="absolute inset-0 z-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
             <img src={CRANE_CARD_IMG} className="w-full h-full object-cover" alt="Crane context" />
          </div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center shadow-xl border border-amber-400/30 group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Crane checklist</h3>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Lifting Equipment Protocol</p>
              </div>
            </div>
            
            <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Mandatory pre-operational safety inspection form for all mobile cranes. Verification of structural integrity and hydraulic safety devices.
            </p>

            <button 
              onClick={onOpenCrane}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 text-center border border-amber-400/20"
            >
              Initialize Inspection
            </button>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /></svg>
          </div>
        </div>

        {/* Standard Equipment Checklist Card */}
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-all duration-300 group flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/10'
        }`}>
          {/* Card Image Background - 0% transparency (opacity-100) and 2% blur (approx blur-[2px]) */}
          <div className="absolute inset-0 z-0 opacity-[0.05] group-hover:opacity-[0.1] transition-all duration-500 blur-[2px]">
             <img src={EQUIPMENT_CARD_IMG} className="w-full h-full object-cover" alt="Equipment context" />
          </div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl border border-blue-400/30 group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Equipment Check</h3>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">General Asset Inspection</p>
              </div>
            </div>
            
            <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Weekly inspection protocol for excavators, loaders, dumpers, and other heavy equipment. Covers mechanical and fire safety.
            </p>

            <button 
              onClick={onOpenEquipment}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 text-center border border-blue-400/20"
            >
              Start Inspection
            </button>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
             <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
        </div>

        {/* Legacy Portal Card */}
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-all duration-300 group flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/10'
        }`}>
          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-xl border border-emerald-400/30 group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>External Framework</h3>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Legacy Reporting System</p>
              </div>
            </div>
            
            <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Access legacy inspection forms hosted on the external cloud portal for historical data entry.
            </p>

            <button 
              onClick={() => onOpenInspection('https://checklist-nu-lovat.vercel.app/')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 text-center border border-emerald-400/20"
            >
              Open Legacy Portal
            </button>
          </div>
        </div>
      </div>

      {/* Return Navigation */}
      <div className="mt-16 flex flex-col items-center gap-4">
        <div className={`h-[1px] w-24 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}></div>
        <button 
          onClick={onBack}
          className={`group px-10 py-5 rounded-[2rem] border flex items-center gap-4 transition-all active:scale-95 shadow-xl ${
            isLight 
              ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white shadow-black/40'
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isLight ? 'bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-600' : 'bg-white/5 group-hover:bg-blue-600/20 group-hover:text-blue-400'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Hub</span>
            <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest">Main Command Dashboard</span>
          </div>
        </button>
      </div>
    </div>
  );
};
