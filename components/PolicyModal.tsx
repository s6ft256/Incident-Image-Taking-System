
import React, { useState } from 'react';
import { ENVIRONMENTAL_POLICY, OHS_POLICY } from '../constants/policies';

interface PolicyModalProps {
  onClose: () => void;
  appTheme?: 'dark' | 'light';
}

type PolicyTab = 'environmental' | 'ohs';

export const PolicyModal: React.FC<PolicyModalProps> = ({ onClose, appTheme = 'dark' }) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>('environmental');
  const isLight = appTheme === 'light';
  
  const currentPolicy = activeTab === 'environmental' ? ENVIRONMENTAL_POLICY : OHS_POLICY;
  const accentColor = activeTab === 'environmental' ? 'text-emerald-500' : 'text-blue-500';
  const accentBg = activeTab === 'environmental' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-blue-500/10 border-blue-500/20';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Background Overlay - High opacity solid background for the modal layer */}
      <div 
        className="absolute inset-0 bg-slate-950/95 animate-in fade-in duration-500"
        onClick={onClose}
      ></div>
      
      <div className={`relative w-full max-w-4xl h-full max-h-[92vh] rounded-[2.5rem] border shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500 flex flex-col overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
      }`}>
        
        {/* TCG Corporate Watermark Background - Constant/Fixed, 100% Visibility, No Blur, No Transparency */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-100 z-0 select-none"
          style={{
            backgroundImage: `url('https://procurement.trojanholding.ae/Styles/Images/TCG.PNG')`,
            backgroundSize: '70%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        />

        {/* Header - Solid Opaque */}
        <div className={`p-6 sm:p-8 border-b shrink-0 flex items-center justify-between z-20 ${isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/5'}`}>
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/5'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={accentColor}>
                   <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
             </div>
             <div>
               <h2 className={`text-xl font-black tracking-tight leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>Compliance Hub</h2>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Official Corporate Policies</p>
             </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-all ${isLight ? 'hover:bg-slate-200 text-slate-400' : 'hover:bg-white/10 text-slate-500'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tab Navigation - Solid Opaque */}
        <div className={`p-2 flex gap-2 shrink-0 border-b z-20 ${isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/5'}`}>
          <button 
            onClick={() => setActiveTab('environmental')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'environmental' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Environmental
          </button>
          <button 
            onClick={() => setActiveTab('ohs')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'ohs' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            OHS Safety
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 scrollbar-hide relative z-10">
          <div className="space-y-10">
            {/* Policy Title Card - For Standard theme: 10% transparency (90% opacity) and 10% blur styling */}
            <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden group shadow-2xl transition-all duration-500 ${
              isLight 
                ? 'bg-white/90 border-slate-300 backdrop-blur-[10px]' 
                : 'bg-slate-950/2 border-white/20 backdrop-blur-[1px]'
            }`}>
              <div className="relative z-10">
                <h1 className={`text-3xl font-black tracking-tighter mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentPolicy.title}</h1>
                <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${activeTab === 'environmental' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Last Reviewed:</span>
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentColor}`}>{currentPolicy.lastReviewed}</span>
                </div>
              </div>
            </div>

            <div className="space-y-12 pb-20">
              {currentPolicy.sections.map((section, idx) => (
                <div key={idx} className="group/section">
                  {/* Section Heading */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-2.5 h-7 rounded-full shadow-lg transition-all duration-300 group-hover/section:scale-y-125 ${activeTab === 'environmental' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-500 shadow-blue-500/20'}`}></div>
                    <h3 className={`text-[15px] font-black uppercase tracking-[0.25em] ${isLight ? 'text-slate-900 underline decoration-slate-300' : 'text-white underline decoration-white/10'}`}>
                      {section.heading}
                    </h3>
                  </div>
                  
                  {/* Section Content - For Standard theme: 10% transparency (90% opacity) and 10% blur styling */}
                  <div className={`text-sm leading-relaxed text-justify whitespace-pre-wrap px-8 py-8 rounded-[2rem] border transition-all shadow-xl font-bold ${
                    isLight 
                      ? 'bg-white/90 text-slate-900 border-slate-400 backdrop-blur-[10px]' 
                      : 'bg-slate-950/2 text-white border-white/40 backdrop-blur-[1px]'
                  }`}>
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - Solid Opaque */}
        <div className={`p-5 border-t text-center shrink-0 z-20 ${isLight ? 'bg-white border-slate-100' : 'bg-slate-950 border-white/5'}`}>
          <div className="flex items-center justify-center gap-6">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Trojan Construction Group</p>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">System Integrity Document</p>
          </div>
        </div>
      </div>
    </div>
  );
};
