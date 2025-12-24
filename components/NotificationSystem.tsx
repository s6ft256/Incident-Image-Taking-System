
import React, { useState, useEffect } from 'react';
import { FetchedObservation } from '../types';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'critical' | 'ai';
  progress?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationSystemProps {
  appTheme: 'dark' | 'light';
  onViewTask: (taskId: string) => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ appTheme, onViewTask }) => {
  const [activeAlert, setActiveAlert] = useState<FetchedObservation | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isLight = appTheme === 'light';

  useEffect(() => {
    const handleAlert = (e: any) => setActiveAlert(e.detail);
    
    const handleToast = (e: any) => {
      const newToast: Toast = {
        id: e.detail.id || crypto.randomUUID(),
        message: e.detail.message,
        type: e.detail.type || 'info',
        progress: e.detail.progress,
        action: e.detail.action
      };

      setToasts(prev => {
        // If ID exists, update it instead of adding new
        const existingIndex = prev.findIndex(t => t.id === newToast.id);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newToast;
          return updated;
        }
        return [...prev, newToast];
      });

      if (!newToast.progress && !newToast.action) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 5000);
      }
    };

    window.addEventListener('hse-guardian-alert', handleAlert);
    window.addEventListener('app-toast', handleToast);

    return () => {
      window.removeEventListener('hse-guardian-alert', handleAlert);
      window.removeEventListener('app-toast', handleToast);
    };
  }, []);

  const dismissAlert = () => setActiveAlert(null);
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="fixed inset-0 pointer-events-none z-[1000] flex flex-col items-center p-4">
      <style>{`
        @keyframes hazard-slide {
          from { background-position: 0 0; }
          to { background-position: 40px 0; }
        }
        .hazard-border {
          background: repeating-linear-gradient(
            -45deg,
            #e11d48,
            #e11d48 10px,
            #fbbf24 10px,
            #fbbf24 20px
          );
          background-size: 40px 100%;
          animation: hazard-slide 1s linear infinite;
        }
        .toast-stack-item {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      {activeAlert && (
        <div className="pointer-events-auto w-full max-w-sm mt-12 animate-in fade-in zoom-in slide-in-from-top-10 duration-500">
          <div className={`relative overflow-hidden rounded-[2.5rem] border-4 shadow-2xl ${
            isLight ? 'bg-white border-rose-500' : 'bg-slate-950 border-rose-600'
          }`}>
            <div className="hazard-border h-3 w-full" />
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-16 h-16 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                     <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                   </svg>
                 </div>
                 <div>
                   <h3 className={`text-lg font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>CRITICAL THREAT</h3>
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Sector {activeAlert.fields["Site / Location"]?.split(' ')[0]}</p>
                 </div>
              </div>
              <div className={`p-4 rounded-2xl border mb-6 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Incident Profile</p>
                <p className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeAlert.fields["Observation Type"]}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { onViewTask(activeAlert.id); dismissAlert(); }} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all border border-rose-400/20">Authorize Action</button>
                <button onClick={dismissAlert} className={`px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest ${isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-slate-400'}`}>Ignore</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-8 right-0 left-0 flex flex-col-reverse items-center gap-3 px-4 sm:items-end">
        {toasts.map((toast, index) => {
          const depth = toasts.length - 1 - index;
          return (
            <div 
              key={toast.id}
              className={`toast-stack-item pointer-events-auto w-full max-w-[320px] rounded-[1.5rem] border shadow-2xl overflow-hidden flex flex-col p-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-white/10 backdrop-blur-xl'
              } ${toast.type === 'critical' ? 'border-rose-500/50 shadow-rose-900/20' : ''} ${toast.type === 'ai' ? 'border-blue-500/50 shadow-blue-900/20 ring-1 ring-blue-500/20' : ''}`}
              style={{
                transform: `translateY(${depth * -8}px) scale(${1 - depth * 0.05})`,
                zIndex: 100 - depth,
                opacity: 1 - depth * 0.2
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                  toast.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                  toast.type === 'ai' ? 'bg-blue-600 text-white animate-pulse' :
                  'bg-blue-500/20 text-blue-500'
                }`}>
                   {toast.type === 'ai' ? (
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v8m0 4v8m-10-10h8m4 0h8"/></svg>
                   ) : (
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                   )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-widest truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {toast.message}
                  </p>
                  {toast.progress !== undefined && (
                    <div className="mt-2 w-full bg-white/10 rounded-full h-1 overflow-hidden">
                       <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${toast.progress}%` }} />
                    </div>
                  )}
                </div>
                <button onClick={() => removeToast(toast.id)} className="text-slate-500 hover:text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              
              {toast.action && (
                <button 
                  onClick={() => { toast.action?.onClick(); removeToast(toast.id); }}
                  className="mt-3 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-400 transition-all"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
