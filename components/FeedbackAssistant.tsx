
import React, { useState } from 'react';

interface FeedbackAssistantProps {
  appTheme?: 'dark' | 'light';
  userName?: string;
}

export const FeedbackAssistant: React.FC<FeedbackAssistantProps> = ({ appTheme = 'dark', userName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: userName,
    subject: 'General Query',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isLight = appTheme === 'light';

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
      setFormData(prev => ({ ...prev, message: '' }));
    }, 2000);
  };

  return (
    <div className="relative flex flex-col items-center">
      {isOpen && (
        <div className={`absolute bottom-20 right-0 w-80 sm:w-96 h-auto max-h-[85vh] ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'} border rounded-[2rem] shadow-2xl flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-[100]`}>
          <div className={`${isLight ? 'bg-slate-50 border-b border-slate-100' : 'bg-white/[0.03] border-b border-white/5'} p-6 flex justify-between items-center`}>
            <div>
              <h3 className={`text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Developer Support</h3>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Connect with @Elius</p>
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
                <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold">Connecting you now...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <a href="tel:+971563892557" className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 hover:border-blue-400' : 'bg-white/5 border-white/5 hover:border-blue-500/50'}`}>
                    <svg className="w-5 h-5 text-blue-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 5a2 2 0 0 1-2-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500">Call Support</span>
                  </a>
                  <a href="https://wa.me/971563892557" target="_blank" className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 hover:border-emerald-400' : 'bg-white/5 border-white/5 hover:border-emerald-500/50'}`}>
                    <svg className="w-5 h-5 text-emerald-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500">WhatsApp</span>
                  </a>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Personnel Name</label>
                    <input 
                      id="name"
                      type="text" 
                      value={formData.name} 
                      onChange={handleInputChange}
                      className={`w-full p-3.5 rounded-xl border text-xs outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`} 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Inquiry Type</label>
                    <select 
                      id="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`w-full p-3.5 rounded-xl border text-xs outline-none transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`}
                    >
                      <option value="General Query">General Query</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="System Support">System Support</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Message / Feedback</label>
                    <textarea 
                      id="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="How can @Elius assist you today?"
                      className={`w-full p-3.5 rounded-xl border text-xs outline-none transition-all resize-none ${isLight ? 'bg-slate-50 border-slate-200 focus:border-blue-500' : 'bg-black/40 border-white/5 focus:border-blue-500 text-white'}`}
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
          
          <div className={`p-4 border-t ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.02] border-white/5'} text-center`}>
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em]">HSE Guardian Ecosystem • Developed by @Elius</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-500 text-white rounded-full shadow-lg hover:scale-105 transition-all duration-300 border border-blue-400 p-0 overflow-hidden"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <div className="flex flex-col items-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
            <span className="text-[6px] font-black uppercase mt-0.5">Feed</span>
          </div>
        )}
      </button>
    </div>
  );
};
