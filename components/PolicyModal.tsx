
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-hidden print:p-0">
      <div 
        className="absolute inset-0 bg-slate-950/95 animate-in fade-in duration-500 print:hidden"
        onClick={onClose}
      ></div>
      
      <div className={`relative w-full max-w-4xl h-full max-h-[92vh] rounded-[2.5rem] border shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500 flex flex-col overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
      }`}>
        
        <div 
          className="absolute inset-0 pointer-events-none opacity-50 z-0 select-none print:opacity-10"
          style={{
            backgroundImage: `url('https://procurement.trojanholding.ae/Styles/Images/TCG.PNG')`,
            backgroundSize: '70%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        />

        <div className={`p-6 sm:p-8 border-b shrink-0 flex items-center justify-between z-20 print:hidden ${isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/5'}`}>
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
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className={`p-3 rounded-xl transition-all border ${isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'}`}
              title="Print Policy"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
            </button>
            <button onClick={onClose} className={`p-3 rounded-xl transition-all ${isLight ? 'hover:bg-slate-200 text-slate-400' : 'hover:bg-white/10 text-slate-500'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className={`p-2 flex gap-2 shrink-0 border-b z-20 overflow-x-auto scrollbar-hide print:hidden ${isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/5'}`}>
          <button 
            onClick={() => setActiveTab('environmental')}
            className={`min-w-[120px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'environmental' ? 'bg-emerald-600 text-white shadow-lg' : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Environmental
          </button>
          <button 
            onClick={() => setActiveTab('ohs')}
            className={`min-w-[120px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'ohs' ? 'bg-blue-600 text-white shadow-lg' : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            OHS Safety
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`min-w-[120px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'privacy' ? 'bg-rose-600 text-white shadow-lg' : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Privacy
          </button>
          <button 
            onClick={() => setActiveTab('agreement')}
            className={`min-w-[120px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'agreement' ? 'bg-amber-600 text-white shadow-lg' : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Agreement
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-12 scrollbar-hide relative z-10 print:p-0 print:overflow-visible">
          <div className="space-y-10 max-w-3xl mx-auto">
            <div className={`p-10 rounded-[2.5rem] border relative overflow-hidden group shadow-2xl transition-all duration-500 print:p-0 print:border-none print:shadow-none ${
              isLight ? 'bg-white/90 border-slate-300 backdrop-blur-[10px]' : 'bg-slate-950/20 border-white/20 backdrop-blur-[4px]'
            }`}>
              <div className="relative z-10">
                <div className={`w-12 h-1 bg-current rounded-full mb-6 opacity-30 ${accentColor}`}></div>
                <h1 className={`text-4xl font-black tracking-tighter mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentPolicy.title}</h1>
                <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${accentColor.replace('text', 'bg')}`}></div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Status: Authorized</span>
                   <span className="text-slate-600 px-2">•</span>
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentColor}`}>Updated: {currentPolicy.lastReviewed}</span>
                </div>
              </div>
            </div>

            <div className="space-y-12 pb-24 print:pb-0">
              {currentPolicy.sections.map((section, idx) => (
                <div key={idx} className="group/section break-inside-avoid">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-3 h-8 rounded-full shadow-lg transition-all duration-300 group-hover/section:scale-y-125 ${accentColor.replace('text', 'bg')}`}></div>
                    <h3 className={`text-lg font-black uppercase tracking-[0.2em] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {section.heading}
                    </h3>
                  </div>
                  <div className={`text-[15px] leading-[1.8] text-justify whitespace-pre-wrap px-10 py-10 rounded-[2.5rem] border transition-all shadow-xl font-medium ${
                    isLight ? 'bg-white/95 text-slate-800 border-slate-200 shadow-slate-200/50' : 'bg-slate-900/40 text-slate-200 border-white/10 shadow-black/20'
                  }`}>
                    <PolicyContentRenderer content={section.content} accentColor={accentColor} />
                  </div>
                </div>
              ))}
              
              <div className="pt-10 flex flex-col items-center opacity-40">
                <img src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" className="h-16 w-auto mb-4 grayscale" alt="TGC Logo" />
                <p className="text-[8px] font-black uppercase tracking-[0.8em] text-slate-500">Official Controlled Document</p>
              </div>
            </div>
          </div>
        </div>

        {showAcceptButton && onAccept && (
          <div className={`p-8 border-t z-30 print:hidden ${isLight ? 'bg-white/95 border-slate-100' : 'bg-slate-950 border-white/5'}`}>
            <button 
              onClick={onAccept}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-3xl text-[12px] uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 border border-blue-400/30"
            >
              Acknowledge & Establish Compliance
            </button>
          </div>
        )}

        <div className={`p-6 border-t text-center shrink-0 z-20 print:hidden ${isLight ? 'bg-white border-slate-100' : 'bg-slate-950 border-white/5'}`}>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Trojan Construction Group • Group Policy Framework v2.5</p>
        </div>
      </div>
    </div>
  );
};
