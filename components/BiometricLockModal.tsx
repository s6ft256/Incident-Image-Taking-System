
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
  const [error, setError] = useState<string | null>(null);
  const isLight = appTheme === 'light';

  const handleAuthenticate = async () => {
    if (!profile.webauthn_credential_id) return;
    
    setIsAuthenticating(true);
    setError(null);
    
    try {
      const success = await authenticateBiometrics(profile.webauthn_credential_id);
      if (success) {
        onUnlock();
      } else {
        setError("Authentication failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to access biometric scanner.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Attempt to trigger automatically on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAuthenticate();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 overflow-hidden">
      {/* Heavy Blur Backdrop */}
      <div className={`absolute inset-0 backdrop-blur-[20px] transition-colors duration-1000 ${
        isLight ? 'bg-white/80' : 'bg-slate-950/90'
      }`}></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px] animate-pulse [animation-delay:1s]"></div>
      </div>

      <div className={`relative w-full max-w-sm rounded-[3rem] border shadow-2xl animate-in zoom-in fade-in duration-500 overflow-hidden flex flex-col items-center p-8 sm:p-12 ${
        isLight ? 'bg-white/90 border-slate-200 shadow-slate-200' : 'bg-slate-900/40 border-white/10 shadow-black'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-red-500/5 pointer-events-none"></div>
        
        {/* App Branding */}
        <img 
          src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
          className="h-16 w-auto mb-8 drop-shadow-2xl relative z-10" 
          alt="TGC" 
        />

        <div className="relative mb-8">
           <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center shadow-2xl overflow-hidden relative z-10 transition-all duration-500 ${
             isLight ? 'bg-slate-50 border-white' : 'bg-slate-800 border-slate-700'
           }`}>
             {profile.profileImageUrl ? (
               <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
             )}
           </div>
           {/* Online Status Ring */}
           <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-slate-900 rounded-full z-20"></div>
        </div>

        <div className="text-center space-y-2 mb-10 relative z-10">
          <h2 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            System <span className="text-blue-500">Locked</span>
          </h2>
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
            Authenticated: {profile.name}
          </p>
        </div>

        <div className="w-full space-y-4 relative z-10">
          <button 
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl group border ${
              isLight 
                ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20' 
                : 'bg-white/10 text-white border-white/10 hover:bg-white/20'
            }`}
          >
            {isAuthenticating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <div className={`p-2 rounded-lg ${isLight ? 'bg-white/20' : 'bg-blue-600/20'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Unlock Gateway</span>
              </>
            )}
          </button>

          <button 
            onClick={onSwitchAccount}
            className={`w-full py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
              isLight ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Switch Account
          </button>
        </div>

        {error && (
          <div className="mt-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
            <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest text-center">{error}</p>
          </div>
        )}

        <div className="mt-12 flex flex-col items-center">
           <div className="h-0.5 w-8 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
           <p className={`text-[7px] font-black uppercase tracking-[0.5em] mt-3 ${isLight ? 'text-slate-300' : 'text-slate-600'}`}>
             High-Integrity Evidence Protocol
           </p>
        </div>
      </div>
    </div>
  );
};
