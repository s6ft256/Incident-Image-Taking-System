
import React, { useState, useRef, useEffect } from 'react';

interface FeedbackAssistantProps {
  appTheme?: 'dark' | 'light';
  userName?: string;
}

export const FeedbackAssistant: React.FC<FeedbackAssistantProps> = ({ appTheme = 'dark', userName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', 
    subject: 'General Query',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const isLight = appTheme === 'light';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (feedbackRef.current && !feedbackRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (type: 'whatsapp' | 'email') => {
    const text = `*HSE Guardian Feedback*\n*From:* ${formData.name}\n*Type:* ${formData.subject}\n*Message:* ${formData.message}`;
    
    if (type === 'whatsapp') {
      const encodedText = encodeURIComponent(text);
      window.open(`https://wa.me/971563892557?text=${encodedText}`, '_blank');
    } else {
      const mailtoLink = `mailto:niwamanyaelius95@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(text)}`;
      window.location.href = mailtoLink;
    }
    
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setIsOpen(false);
      setFormData(prev => ({ ...prev, message: '', name: '' }));
    }, 2000);
  };

  return (
    <div className="relative flex flex-col items-center" ref={feedbackRef}>
      {isOpen && (
        <div className={`absolute bottom-20 right-0 w-80 sm:w-96 h-auto max-h-[85vh] ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'} border rounded-[2rem] shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-[100]`}>
          {/* Header */}
          <div className={`${isLight ? 'bg-slate-50 border-b border-slate-100' : 'bg-white/[0.03] border-b border-white/5'} p-6 flex justify-between items-center shrink-0`}>
            <div>
              <h3 className={`text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Support Terminal</h3>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">HSE Guardian Communications</p>
            </div>
            <button onClick={() => setIsOpen(false)} className={`p-2 rounded-xl transition-all ${isLight ? 'hover:bg-slate-200 text-slate-400' : 'hover:bg-white/10 text-slate-500'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {isSubmitted ? (
              <div className="py-12 text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/20">
                   <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                </div>
                <h4 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Transmission Sent</h4>
                <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold">Connecting to Support...</p>
              </div>
            ) : (
              <>
                {/* Social Connect Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href="https://github.com/s6ft256" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-900 hover:text-white' : 'bg-white/5 border-white/5 hover:bg-white hover:text-black'}`}
                  >
                    <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.744.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.003-.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    <span className="text-[9px] font-black uppercase tracking-widest">Source</span>
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/elius-niwamanya-026228187" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${isLight ? 'bg-slate-50 border-slate-200 hover:border-blue-500 hover:bg-blue-500 hover:text-white' : 'bg-white/5 border-white/5 hover:border-blue-500 hover:bg-blue-500/10'}`}
                  >
                    <svg className="w-6 h-6 mb-1 text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24"><path d="M22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0zM7.27 20.1H3.65V9.24h3.62V20.1zM5.47 7.76h-.03c-1.22 0-2.01-.84-2.01-1.88 0-1.06.81-1.88 2.05-1.88 1.24 0 2.01.82 2.04 1.88 0 1.04-.77 1.88-2.05 1.88zM20.11 20.1h-3.63v-5.8c0-1.45-.52-2.45-1.83-2.45-1 0-1.6.67-1.86 1.32-.1.23-.12.55-.12.87v6.06h-3.63s.05-9.83 0-10.86h3.63v1.54c.48-.74 1.34-1.81 3.27-1.81 2.39 0 4.17 1.56 4.17 4.91v6.22z"/></svg>
                    <span className="text-[9px] font-black uppercase tracking-widest">Connect</span>
                  </a>
                </div>

                {/* Quick Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <a href="tel:+971563892557" className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 hover:bg-blue-50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 5a2 2 0 0 1-2-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Call Support</span>
                  </a>
                  <a href="https://wa.me/971563892557" target="_blank" className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 hover:bg-emerald-50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.38 8.38 0 0 1 3.8.9L22 2l-2.5 4.5Z"/></svg>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">WhatsApp</span>
                  </a>
                </div>

                <div className={`h-[1px] w-full ${isLight ? 'bg-slate-100' : 'bg-white/5'}`}></div>

                {/* Feedback Form */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Message Protocol</h4>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                      <div className="w-1 h-1 rounded-full bg-blue-500/50"></div>
                      <div className="w-1 h-1 rounded-full bg-blue-500/20"></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Sender Identification</label>
                    <input 
                      id="name"
                      type="text" 
                      value={formData.name} 
                      onChange={handleInputChange}
                      placeholder="Name"
                      className={`w-full p-4 rounded-xl border text-xs outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`} 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Subject Classification</label>
                    <select 
                      id="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`w-full p-4 rounded-xl border text-xs outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`}
                    >
                      <option value="General Query">General Query</option>
                      <option value="Bug Report">System Bug Report</option>
                      <option value="Feature Request">New Feature Request</option>
                      <option value="System Support">Technical Support</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Secure Message Payload</label>
                    <textarea 
                      id="message"
                      rows={3}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Transmission details..."
                      className={`w-full p-4 rounded-xl border text-xs outline-none transition-all resize-none ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => handleSubmit('email')}
                    disabled={!formData.message.trim()}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 ${isLight ? 'bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200' : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    Email
                  </button>
                  <button 
                    onClick={() => handleSubmit('whatsapp')}
                    disabled={!formData.message.trim()}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 hover:bg-emerald-500 transition-all active:scale-95 border border-emerald-400/20 disabled:opacity-30"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.38 8.38 0 0 1 3.8.9L22 2l-2.5 4.5Z"/></svg>
                    WhatsApp
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div className={`p-4 border-t ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.02] border-white/5'} text-center shrink-0`}>
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em]">HSE Guardian Ecosystem • Security-First Reporting</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-blue-600 to-blue-500 text-white rounded-full shadow-lg hover:scale-105 transition-all duration-300 border border-blue-400 p-0 overflow-hidden active:scale-90"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <div className="flex flex-col items-center">
            {/* Fix: Replaced invalid responsive attributes with Tailwind classes for SVG scaling */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5 sm:w-6 sm:h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="text-[5px] sm:text-[6px] font-black uppercase mt-0.5">Feed</span>
          </div>
        )}
      </button>
    </div>
  );
};
