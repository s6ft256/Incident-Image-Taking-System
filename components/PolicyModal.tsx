
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
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500"
        onClick={onClose}
      ></div>
      
      <div className={`relative w-full max-w-3xl h-full max-h-[90vh] rounded-[2.5rem] border shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500 flex flex-col overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/95 border-white/10'
      }`}>
        {/* Header */}
        <div className={`p-6 sm:p-8 border-b shrink-0 flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-white/5'}`}>
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

        {/* Tab Navigation */}
        <div className={`p-2 flex gap-2 shrink-0 border-b ${isLight ? 'bg-white border-slate-100' : 'bg-black/20 border-white/5'}`}>
          <button 
            onClick={() => setActiveTab('environmental')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'environmental' 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Environmental
          </button>
          <button 
            onClick={() => setActiveTab('ohs')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'ohs' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            OHS Safety
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-hide">
          <div className={`p-6 rounded-[2rem] border ${accentBg}`}>
            <h1 className={`text-2xl font-black tracking-tighter mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentPolicy.title}</h1>
            <div className="flex items-center gap-2">
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Last Reviewed:</span>
               <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${accentColor}`}>{currentPolicy.lastReviewed}</span>
            </div>
          </div>

          <div className="space-y-12 pb-16">
            {currentPolicy.sections.map((section, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-1 h-5 rounded-full ${activeTab === 'environmental' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                  <h3 className={`text-[12px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {section.heading}
                  </h3>
                </div>
                <div className={`text-sm leading-relaxed text-justify whitespace-pre-wrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t text-center shrink-0 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-black/40 border-white/5'}`}>
          <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.5em]">Trojan Construction Group • System Integrity Document</p>
        </div>
      </div>
    </div>
  );
};
