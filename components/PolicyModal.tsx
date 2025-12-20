
import React, { useState } from 'react';
import { ENVIRONMENTAL_POLICY, OHS_POLICY, PRIVACY_POLICY, USER_AGREEMENT } from '../constants/policies';

interface PolicyModalProps {
  onClose: () => void;
  appTheme?: 'dark' | 'light';
  initialTab?: PolicyTab;
  showAcceptButton?: boolean;
  onAccept?: () => void;
}

export type PolicyTab = 'environmental' | 'ohs' | 'privacy' | 'agreement';

const PolicyContentRenderer: React.FC<{ content: string; accentColor: string }> = ({ content, accentColor }) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, text, url] = match;
    const index = match.index;
    if (index > lastIndex) {
      parts.push(content.substring(lastIndex, index));
    }
    parts.push(
      <a 
        key={index} 
        href={url} 
        target={url.startsWith('mailto:') ? '_self' : '_blank'} 
        rel="noopener noreferrer"
        className={`${accentColor} underline decoration-current/30 hover:decoration-current transition-all cursor-pointer font-black`}
      >
        {text}
      </a>
    );
    lastIndex = index + fullMatch.length;
  }
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  return <>{parts}</>;
};

export const PolicyModal: React.FC<PolicyModalProps> = ({ 
  onClose, 
  appTheme = 'dark', 
  initialTab = 'environmental',
  showAcceptButton = false,
  onAccept
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);
  const isLight = appTheme === 'light';
  
  const getPolicy = () => {
    switch (activeTab) {
      case 'environmental': return ENVIRONMENTAL_POLICY;
      case 'ohs': return OHS_POLICY;
      case 'privacy': return PRIVACY_POLICY;
      case 'agreement': return USER_AGREEMENT;
    }
  };

  const currentPolicy = getPolicy();

  const getAccentColor = () => {
    switch (activeTab) {
      case 'environmental': return 'text-emerald-500';
      case 'ohs': return 'text-blue-500';
      case 'privacy': return 'text-rose-500';
      case 'agreement': return 'text-amber-500';
    }
  };

  const accentColor = getAccentColor();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      <div 
        className="absolute inset-0 bg-slate-950/95 animate-in fade-in duration-500"
        onClick={onClose}
      ></div>
      
      <div className={`relative w-full max-w-4xl h-full max-h-[92vh] rounded-[2.5rem] border shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500 flex flex-col overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
      }`}>
        
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

        <div className={`p-6 sm:p-8 border-b shrink-0 flex items-center justify-between z-20 ${isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/5'}`}>
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/5'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={accentColor}>
                   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
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

        <div className={`p-2 flex gap-2 shrink-0 border-b z-20 overflow-x-auto scrollbar-hide ${isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/5'}`}>
          <button 
            onClick={() => setActiveTab('environmental')}
            className={`min-w-[100px] py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'environmental' ? 'bg-emerald-600 text-white shadow-lg' : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Environmental
          </button>
          <button 
            onClick={() => setActiveTab('ohs')}
            className={`min-w-[100px] py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'ohs' ? 'bg-blue-600 text-white shadow-lg' : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            OHS Safety
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`min-w-[100px] py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'privacy' ? 'bg-rose-600 text-white shadow-lg' : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Privacy
          </button>
          <button 
            onClick={() => setActiveTab('agreement')}
            className={`min-w-[100px] py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'agreement' ? 'bg-amber-600 text-white shadow-lg' : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Agreement
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-12 scrollbar-hide relative z-10">
          <div className="space-y-10">
            <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden group shadow-2xl transition-all duration-500 ${
              isLight ? 'bg-white/90 border-slate-300 backdrop-blur-[10px]' : 'bg-slate-950/5 border-white/20 backdrop-blur-[2px]'
            }`}>
              <div className="relative z-10">
                <h1 className={`text-3xl font-black tracking-tighter mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentPolicy.title}</h1>
                <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${accentColor.replace('text', 'bg')}`}></div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Last Reviewed:</span>
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentColor}`}>{currentPolicy.lastReviewed}</span>
                </div>
              </div>
            </div>

            <div className="space-y-12 pb-20">
              {currentPolicy.sections.map((section, idx) => (
                <div key={idx} className="group/section">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-2.5 h-7 rounded-full shadow-lg transition-all duration-300 group-hover/section:scale-y-125 ${accentColor.replace('text', 'bg')}`}></div>
                    <h3 className={`text-[15px] font-black uppercase tracking-[0.25em] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {section.heading}
                    </h3>
                  </div>
                  <div className={`text-sm leading-relaxed text-justify whitespace-pre-wrap px-8 py-8 rounded-[2rem] border transition-all shadow-xl font-bold ${
                    isLight ? 'bg-white/90 text-slate-900 border-slate-400 backdrop-blur-[10px]' : 'bg-slate-950/10 text-white border-white/40 backdrop-blur-[2px]'
                  }`}>
                    <PolicyContentRenderer content={section.content} accentColor={accentColor} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showAcceptButton && onAccept && (
          <div className={`p-6 border-t z-30 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10'}`}>
            <button 
              onClick={onAccept}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 border border-blue-400/20"
            >
              I Understand & Agree to All Terms
            </button>
          </div>
        )}

        <div className={`p-5 border-t text-center shrink-0 z-20 ${isLight ? 'bg-white border-slate-100' : 'bg-slate-950 border-white/5'}`}>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Trojan Construction Group • HSE System Document</p>
        </div>
      </div>
    </div>
  );
};
