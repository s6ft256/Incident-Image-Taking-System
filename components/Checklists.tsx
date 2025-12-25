
import React from 'react';

interface ChecklistsProps {
  appTheme?: 'dark' | 'light';
  onBack: () => void;
  onOpenInspection: (url: string) => void;
}

export const Checklists: React.FC<ChecklistsProps> = ({ appTheme = 'dark', onBack, onOpenInspection }) => {
  const isLight = appTheme === 'light';

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-24 max-w-4xl mx-auto">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Crane Checklist Card */}
        <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden transition-all duration-300 group ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/10'
        }`}>
          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center shadow-xl border border-amber-400/30 group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <path d="M12 3v16M17 8l-5 5-5-5" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Crane checklist</h3>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Lifting Equipment Protocol</p>
              </div>
            </div>
            
            <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Access the mandatory pre-operational safety inspection form for all mobile and tower cranes. Ensure structural integrity and hydraulic systems are verified.
            </p>

            <button 
              onClick={() => onOpenInspection('https://checklist-nu-lovat.vercel.app/')}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 text-center border border-amber-400/20"
            >
              Initialize Inspection
            </button>
          </div>
          
          {/* Subtle background graphic */}
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M12 3v16M17 8l-5 5-5-5" />
            </svg>
          </div>
        </div>

        {/* Placeholder for future checklists */}
        <div className={`p-8 rounded-[2.5rem] border border-dashed flex flex-col items-center justify-center gap-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'
        }`}>
          <div className="w-12 h-12 rounded-full border-2 border-slate-700 flex items-center justify-center opacity-20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Future Protocols pending</p>
        </div>
      </div>

      {/* Explicit Return Navigation */}
      <div className="mt-16 flex flex-col items-center gap-4">
        <div className={`h-[1px] w-24 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}></div>
        <button 
          onClick={onBack}
          className={`group px-10 py-5 rounded-[2rem] border flex items-center gap-4 transition-all active:scale-95 shadow-xl ${
            isLight 
              ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300' 
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
