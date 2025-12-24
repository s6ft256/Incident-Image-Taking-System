
import React, { useState, useEffect, useCallback } from 'react';
// Fix: Use correct exported member 'FetchedObservation' instead of 'FetchedIncident'
import { FetchedObservation } from '../types';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface NotificationSystemProps {
  appTheme: 'dark' | 'light';
  onViewTask: (taskId: string) => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ appTheme, onViewTask }) => {
  // Fix: Use correct exported member 'FetchedObservation' instead of 'FetchedIncident'
  const [activeAlert, setActiveAlert] = useState<FetchedObservation | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isLight = appTheme === 'light';

  // Listen for global notification events
  useEffect(() => {
    const handleAlert = (e: any) => {
      setActiveAlert(e.detail);
    };

    const handleToast = (e: any) => {
      const newToast: Toast = {
        id: crypto.randomUUID(),
        message: e.detail.message,
        type: e.detail.type || 'info'
      };
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener('hse-guardian-alert', handleAlert);
    window.addEventListener('app-toast', handleToast);

    return () => {
      window.removeEventListener('hse-guardian-alert', handleAlert);
      window.removeEventListener('app-toast', handleToast);
    };
  }, []);

  const dismissAlert = () => setActiveAlert(null);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1000] flex flex-col items-center justify-start p-4">
      {/* Layer 1: HSE Guardian Alert Overlay */}
      {activeAlert && (
        <div className="pointer-events-auto w-full max-w-sm mt-12 animate-in fade-in zoom-in slide-in-from-top-10 duration-500">
          <div className={`relative overflow-hidden rounded-[2.5rem] border-2 shadow-[0_0_50px_rgba(225,29,72,0.3)] ring-1 ring-rose-500/50 ${
            isLight ? 'bg-white border-rose-500' : 'bg-slate-950 border-rose-600'
          }`}>
            {/* Hazard Stripe Header */}
            <div className="h-2 w-full flex">
               {[...Array(20)].map((_, i) => (
                 <div key={i} className={`h-full w-8 skew-x-[-45deg] ${i % 2 === 0 ? 'bg-rose-600' : 'bg-amber-400'}`}></div>
               ))}
            </div>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-16 h-16 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                     <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                   </svg>
                 </div>
                 <div>
                   <h3 className={`text-lg font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>HSE GUARDIAN ALERT</h3>
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">Critical Task Assigned</p>
                 </div>
              </div>

              <div className={`p-4 rounded-2xl border mb-6 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                {/* Fix: Update labels and field mapping to match types.ts Observation Schema */}
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Observation Type</p>
                <p className={`text-sm font-black mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeAlert.fields["Observation Type"]}</p>
                
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Location</p>
                <p className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeAlert.fields["Site / Location"]}</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => { onViewTask(activeAlert.id); dismissAlert(); }}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-blue-900/20 border border-blue-400/20"
                >
                  View Details
                </button>
                <button 
                  onClick={dismissAlert}
                  className={`px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layer 2: Toast System Stack */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 items-end">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto min-w-[240px] p-4 rounded-2xl border shadow-2xl animate-in slide-in-from-right-10 fade-in duration-300 flex items-center gap-4 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
              toast.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
              'bg-blue-500/20 text-blue-500'
            }`}>
              {toast.type === 'success' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              )}
            </div>
            <p className={`text-[11px] font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {toast.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
