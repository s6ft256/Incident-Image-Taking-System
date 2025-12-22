
import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { authenticateBiometrics } from '../services/biometricService';

interface BiometricLockModalProps {
  profile: UserProfile;
  onUnlock: () => void;
  onSwitchAccount: () => void;
  appTheme?: 'dark' | 'light';
}

export const BiometricLockModal: React.FC<BiometricLockModalProps> = ({ 
  profile, 
  onUnlock, 
  onSwitchAccount,
  appTheme = 'dark' 
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const isLight = appTheme === 'light';

  const handleAuthenticate = async () => {
    if (!profile.webauthn_credential_id) return;
    
    setIsAuthenticating(true);
    setStatus('scanning');
    setError(null);
    
    try {
      const success = await authenticateBiometrics(profile.webauthn_credential_id);
      if (success) {
        setStatus('success');
        setTimeout(onUnlock, 600);
      } else {
        setStatus('failed');
        setError("Verification Timed Out.");
      }
    } catch (err: any) {
      setStatus('failed');
      setError(err.message || "Security Handshake Failed.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleAuthenticate();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 overflow-hidden">
      {/* Heavy Blur Backdrop */}
      <div className={`absolute inset-0 backdrop-blur-[40px] transition-colors duration-1000 ${
        isLight ? 'bg-white/90' : 'bg-slate-950/95'
      }`}></div>
      
      {/* Security Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, ${isLight ? '#cbd5e1' : '#1e293b'} 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }}></div>

      <div className={`relative w-full max-sm rounded-[3.5rem] border shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in fade-in duration-700 overflow-hidden flex flex-col items-center p-8 sm:p-12 ${
        isLight ? 'bg-white border-slate-200' : 'bg-[#020617]/80 border-white/10'
      }`}>
        
        {/* Company Branding */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-20 group">
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYqYOT4CeopLGtllzFtkjrt1iueEfdM7ejCA&s" 
            className="h-10 w-auto transition-all group-hover:opacity-100 rounded-lg" 
            alt="TGC" 
          />
        </div>

        {/* Biometric Scanning Terminal */}
        <div className="relative mb-10 mt-6">
           {/* Outer Rotating Radar */}
           <div className={`absolute -inset-8 rounded-full border border-dashed transition-all duration-1000 ${
             status === 'scanning' ? 'animate-[spin_10s_linear_infinite] border-blue-500/40 scale-110' : 'border-slate-800 scale-100'
           }`}></div>

           {/* Inner Pulse Ring */}
           <div className={`absolute -inset-4 rounded-full border-2 transition-all duration-700 ${
             status === 'scanning' ? 'animate-ping border-blue-500/20' : 
             status === 'success' ? 'border-emerald-500 scale-125 opacity-0' : 'border-transparent'
           }`}></div>

           {/* The Profile Container */}
           <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center shadow-2xl overflow-hidden relative z-10 transition-all duration-500 ${
             status === 'scanning' ? 'border-blue-500 ring-8 ring-blue-500/10' : 
             status === 'success' ? 'border-emerald-500 ring-8 ring-emerald-500/20' : 
             status === 'failed' ? 'border-rose-500' :
             (isLight ? 'bg-slate-50 border-white' : 'bg-slate-900 border-slate-800')
           }`}>
             {profile.profileImageUrl ? (
               <img src={profile.profileImageUrl} alt="Profile" className={`w-full h-full object-cover transition-all duration-700 ${status === 'scanning' ? 'scale-110 blur-[1px]' : 'scale-100'}`} />
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
             )}

             {/* Scanning Laser Line */}
             {status === 'scanning' && (
               <div className="absolute inset-0 z-20 pointer-events-none">
                 <div className="w-full h-[2px] bg-blue-400 shadow-[0_0_15px_#60a5fa] animate-[bounce_2s_infinite] absolute"></div>
                 <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
               </div>
             )}
           </div>

           {/* Success Checkmark Overlay */}
           {status === 'success' && (
             <div className="absolute inset-0 z-30 flex items-center justify-center animate-in zoom-in duration-300">
               <div className="bg-emerald-500 rounded-full p-4 shadow-[0_0_30px_#10b981]">
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                   <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
               </div>
             </div>
           )}
        </div>

        <div className="text-center space-y-3 mb-10 relative z-10">
          <div className="flex flex-col items-center">
             <h2 className={`text-2xl font-black tracking-tight uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {status === 'scanning' ? 'Scanning Identity' : status === 'success' ? 'Protocol Verified' : 'Logged out'}
             </h2>
             <div className={`h-1 w-12 rounded-full mt-1.5 transition-colors duration-500 ${
               status === 'scanning' ? 'bg-blue-500 animate-pulse' : 
               status === 'success' ? 'bg-emerald-500' : 'bg-rose-600'
             }`}></div>
          </div>
          <p className={`text-[9px] font-black uppercase tracking-[0.5em] transition-colors ${
            status === 'scanning' ? 'text-blue-400' : isLight ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {profile.name}
          </p>
        </div>

        <div className="w-full space-y-4 relative z-10">
          <button 
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl group border overflow-hidden relative ${
              status === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' :
              isLight 
                ? 'bg-blue-600 text-white border-blue-400' 
                : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
            }`}
          >
            {isAuthenticating ? (
              <div className="flex items-center gap-3">
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Contacting OS...</span>
              </div>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Trigger Handshake</span>
              </>
            )}
          </button>

          <button 
            onClick={onSwitchAccount}
            className={`w-full py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
              isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Terminal Switch
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-in shake duration-500">
            <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest text-center leading-relaxed">
              System Error: {error}<br/>Use Fallback Access Key
            </p>
          </div>
        )}

        <div className="mt-12 flex flex-col items-center">
           <p className={`text-[7px] font-black uppercase tracking-widest ${isLight ? 'text-slate-300' : 'text-slate-700'}`}>
             © ELIUS 2025 • SAFETY FIRST
           </p>
        </div>
      </div>
    </div>
  );
};
