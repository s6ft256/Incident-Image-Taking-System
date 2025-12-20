
import React, { useState } from 'react';
import { ENVIRONMENTAL_POLICY, OHS_POLICY, PRIVACY_POLICY } from '../constants/policies';

interface PolicyModalProps {
  onClose: () => void;
  appTheme?: 'dark' | 'light';
  initialTab?: PolicyTab;
}

export type PolicyTab = 'environmental' | 'ohs' | 'privacy';

/**
 * A small utility component to render text with markdown-style links [Text](URL)
 */
const PolicyContentRenderer: React.FC<{ content: string; accentColor: string }> = ({ content, accentColor }) => {
  // Regex to match [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, text, url] = match;
    const index = match.index;

    // Push text before match
    if (index > lastIndex) {
      parts.push(content.substring(lastIndex, index));
    }

    // Push link
    parts.push(
      <a 
        key={index} 
        href={url} 
        target={url.startsWith('mailto:') ? '_self' : '_blank'} 
        rel="noopener noreferrer"
        className={`${accentColor} underline decoration-current/30 hover:decoration-current transition-all cursor-pointer`}
      >
        {text}
      </a>
    );

    lastIndex = index + fullMatch.length;
  }

  // Push remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return <>{parts}</>;
};

export const PolicyModal: React.FC<PolicyModalProps> = ({ onClose, appTheme = 'dark', initialTab = 'environmental' }) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);
  const isLight = appTheme === 'light';
  
  const getPolicy = () => {
    switch (activeTab) {
      case 'environmental': return ENVIRONMENTAL_POLICY;
      case 'ohs': return OHS_POLICY;
      case 'privacy': return PRIVACY_POLICY;
    }
  };

  const currentPolicy = getPolicy();

  const getAccentColor = () => {
    switch (activeTab) {
      case 'environmental': return 'text-emerald-500';
      case 'ohs': return 'text-blue-500';
      case 'privacy': return 'text-rose-500';
    }
  };

  const accentColor = getAccentColor();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/95 animate-in fade-in duration-500"
        onClick={onClose}
      ></div>
      
      <div className={`relative w-full max-w-4xl h-full max-h-[92vh] rounded-[2.5rem] border shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-500 flex flex-col overflow-hidden ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
      }`}>
        
        {/* TCG Corporate Watermark Background */}
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

        {/* Header */}
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

        {/* Tab Navigation */}
        <div className={`p-2 flex gap-2 shrink-0 border-b z-20 ${isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/5'}`}>
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
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'privacy' 
                ? 'bg-rose-600 text-white shadow-lg' 
                : `${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`
            }`}
          >
            Privacy
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-12 scrollbar-hide relative z-10">
          <div className="space-y-10">
            <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden group shadow-2xl transition-all duration-500 ${
              isLight 
                ? 'bg-white/90 border-slate-300 backdrop-blur-[10px]' 
                : 'bg-slate-950/5 border-white/20 backdrop-blur-[2px]'
            }`}>
              <div className="relative z-10">
                <h1 className={`text-3xl font-black tracking-tighter mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentPolicy.title}</h1>
                <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${activeTab === 'environmental' ? 'bg-emerald-500' : activeTab === 'ohs' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Last Reviewed:</span>
                   <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${accentColor}`}>{currentPolicy.lastReviewed}</span>
                </div>
              </div>
            </div>

            <div className="space-y-12 pb-20">
              {currentPolicy.sections.map((section, idx) => (
                <div key={idx} className="group/section">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-2.5 h-7 rounded-full shadow-lg transition-all duration-300 group-hover/section:scale-y-125 ${activeTab === 'environmental' ? 'bg-emerald-500' : activeTab === 'ohs' ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                    <h3 className={`text-[15px] font-black uppercase tracking-[0.25em] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {section.heading}
                    </h3>
                  </div>
                  
                  <div className={`text-sm leading-relaxed text-justify whitespace-pre-wrap px-8 py-8 rounded-[2rem] border transition-all shadow-xl font-bold ${
                    isLight 
                      ? 'bg-white/90 text-slate-900 border-slate-400 backdrop-blur-[10px]' 
                      : 'bg-slate-950/10 text-white border-white/40 backdrop-blur-[2px]'
                  }`}>
                    <PolicyContentRenderer content={section.content} accentColor={accentColor} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
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
