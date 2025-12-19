
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UserProfile } from '../types';
import { ROLES, SITES } from '../constants';
import { registerProfile, getProfileByName, updateProfile } from '../services/profileService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { InputField } from './InputField';
import { isBiometricsAvailable, authenticateBiometrics, registerBiometrics } from '../services/biometricService';

interface AuthScreenProps {
  onAuthComplete: (profile: UserProfile) => void;
  appTheme: 'dark' | 'light';
}

const LAST_USER_KEY = 'hse_guardian_last_user';

const AuthCard: React.FC<{ children: React.ReactNode, isLight: boolean }> = ({ children, isLight }) => (
  <div className={`relative w-full max-w-md p-8 sm:p-10 rounded-[3.5rem] border backdrop-blur-3xl transition-all duration-700 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 z-20 overflow-hidden ${
    isLight 
      ? 'bg-white/[0.05] border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.15)]' 
      : 'bg-slate-950/[0.05] border-red-600/50 shadow-[0_0_50px_rgba(220,38,38,0.3)] ring-1 ring-red-500/20'
  }`}>
    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

const VideoBackground: React.FC<{ isLight: boolean }> = ({ isLight }) => (
  <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 flex items-center justify-center">
    <div className="relative w-full h-[65vh] overflow-hidden opacity-70">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"
      >
        <source src="https://v1.pinimg.com/videos/mc/720p/be/15/5a/be155abccdc19354019151163e21a073.mp4" type="video/mp4" />
      </video>
      <div className={`absolute inset-0 bg-gradient-to-b ${
        isLight 
          ? 'from-white via-transparent to-white' 
          : 'from-slate-950 via-transparent to-slate-950'
      }`}></div>
    </div>
    <div className={`absolute inset-0 bg-gradient-to-br ${
      isLight 
        ? 'from-white/40 via-blue-50/10 to-white/60' 
        : 'from-slate-950 via-slate-900/20 to-slate-950'
    }`}></div>
  </div>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete, appTheme }) => {
  const [mode, setMode] = useState<'welcome' | 'signup' | 'login' | 'post-signup-bio'>('welcome');
  const [profile, setProfile] = useState<UserProfile>({ name: '', role: '', site: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [lastUserName, setLastUserName] = useState<string | null>(null);
  const [newlyCreatedProfile, setNewlyCreatedProfile] = useState<UserProfile | null>(null);

  const isLight = appTheme === 'light';

  useEffect(() => {
    isBiometricsAvailable().then(setBioAvailable);
    setLastUserName(localStorage.getItem(LAST_USER_KEY));
  }, []);

  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    if (id === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setProfile(p => ({ ...p, [id]: value }));
    }
    if (error) setError('');
  }, [error]);

  const handleBiometricLogin = async (targetName?: string) => {
    const nameToVerify = targetName || profile.name;
    if (!nameToVerify) return setError('Please enter your personnel name for biometric verification.');
    
    setIsProcessing(true);
    setError('');

    try {
      const existing = await getProfileByName(nameToVerify);
      if (!existing || !existing.webauthn_credential_id) {
        throw new Error('Biometric lock not configured for this identity. Please use Access Key.');
      }

      const success = await authenticateBiometrics(existing.webauthn_credential_id);
      if (success) {
        localStorage.setItem(LAST_USER_KEY, existing.name);
        onAuthComplete(existing);
      }
    } catch (err: any) {
      setError(err.message || 'Biometric authentication failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name || !profile.role || !profile.password) {
      return setError('Identification details and Access Key are required.');
    }
    if (profile.password.length < 6) {
      return setError('Security protocols require at least 6 characters.');
    }
    if (profile.password !== confirmPassword) {
      return setError('Access Key mismatch: Keys must be identical.');
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      let imageUrl = '';
      if (fileInputRef.current?.files?.[0]) {
        const compressed = await compressImage(fileInputRef.current.files[0]);
        imageUrl = await uploadImageToStorage(compressed, 'profiles');
      }

      const newProfile = await registerProfile({ ...profile, profileImageUrl: imageUrl });
      setNewlyCreatedProfile(newProfile);
      localStorage.setItem(LAST_USER_KEY, newProfile.name);
      
      if (bioAvailable) {
        setMode('post-signup-bio');
      } else {
        onAuthComplete(newProfile);
      }
    } catch (err: any) {
      setError(err.message || 'System fault: Failed to synchronize new identity.');
    } finally {
      setIsProcessing(false);
    }
  };

  const registerBioAfterSignup = async () => {
    if (!newlyCreatedProfile) return;
    setIsProcessing(true);
    try {
      const { credentialId, publicKey } = await registerBiometrics(newlyCreatedProfile.name);
      if (newlyCreatedProfile.id) {
        await updateProfile(newlyCreatedProfile.id, {
          webauthn_credential_id: credentialId,
          webauthn_public_key: publicKey
        });
        const finalProfile = { ...newlyCreatedProfile, webauthn_credential_id: credentialId, webauthn_public_key: publicKey };
        onAuthComplete(finalProfile);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to link biometric scanner.');
      // Proceed anyway since profile is created
      onAuthComplete(newlyCreatedProfile);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name || !profile.password) {
      return setError('Verification requires name and Access Key.');
    }

    setIsProcessing(true);
    setError('');

    try {
      const existing = await getProfileByName(profile.name);
      if (existing) {
        if (existing.password === profile.password) {
          localStorage.setItem(LAST_USER_KEY, existing.name);
          onAuthComplete(existing);
        } else {
          setError('Invalid Credentials: Access Key rejected.');
        }
      } else {
        setError('Unauthorized: Profile not found in safety database.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification system timeout.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (mode === 'post-signup-bio') {
    return (
      <div className="relative min-h-[85vh] flex items-center justify-center p-6">
        <VideoBackground isLight={isLight} />
        <AuthCard isLight={isLight}>
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div className="space-y-2">
              <h2 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Identity Verified</h2>
              <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Would you like to link your biometric scanner for faster future access?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={registerBioAfterSignup}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {isProcessing ? 'Linking...' : 'Enable Biometric Lock'}
              </button>
              <button 
                onClick={() => newlyCreatedProfile && onAuthComplete(newlyCreatedProfile)}
                className={`w-full font-black py-4 rounded-2xl border transition-all uppercase tracking-widest text-[10px] ${isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10'}`}
              >
                Skip for now
              </button>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center p-6 overflow-hidden">
      <VideoBackground isLight={isLight} />
      
      {mode === 'welcome' ? (
        <AuthCard isLight={isLight}>
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full"></div>
              <img 
                src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
                className="h-28 w-auto relative z-10 drop-shadow-2xl animate-pulse" 
                alt="TGC" 
              />
            </div>
            
            <div className="space-y-3 mb-10">
              <h2 className={`text-5xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
                HSE <span className="text-blue-500">Guardian</span>
              </h2>
              <div className="flex flex-col items-center">
                 <div className="h-1 w-12 bg-red-600 mt-2 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse"></div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-4">
              {lastUserName && bioAvailable && (
                <button 
                  onClick={() => handleBiometricLogin(lastUserName)}
                  className="group w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs border border-emerald-400/30 flex items-center justify-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Login as {lastUserName.split(' ')[0]}
                </button>
              )}
              
              <button 
                onClick={() => setMode('signup')}
                className={`w-full font-black py-5 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs border ${
                  isLight 
                    ? 'bg-blue-600 text-white hover:bg-blue-500 border-blue-400/30' 
                    : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                } ${lastUserName ? 'py-4' : 'py-5'}`}
              >
                Establish New Identity
              </button>
              
              <button 
                onClick={() => setMode('login')}
                className={`w-full font-black rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs border ${
                  isLight 
                    ? 'bg-white/10 border-white/20 text-slate-900 hover:bg-white/20' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                } ${lastUserName ? 'py-3.5' : 'py-5'}`}
              >
                Verify Existing Profile
              </button>
            </div>
            
            <p className={`mt-10 text-[9px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Secure Personnel Authentication System
            </p>
          </div>
        </AuthCard>
      ) : (
        <AuthCard isLight={isLight}>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <button 
              onClick={() => { setMode('welcome'); setError(''); }} 
              className={`p-3 rounded-2xl transition-all flex items-center gap-2 border ${
                isLight ? 'hover:bg-white/20 border-white/40 text-slate-900' : 'hover:bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest pr-1">Back</span>
            </button>
            <div className="text-right">
               <h3 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                 {mode === 'signup' ? 'Identity Setup' : 'Restore Access'}
               </h3>
               <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest">Protocol {mode === 'signup' ? '01-A' : '01-B'}</span>
            </div>
          </div>

          <div className="relative z-10">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl mb-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                 <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 {error}
              </div>
            )}
            
            <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-6">
              {mode === 'signup' && (
                <div className="flex flex-col items-center pb-4" onClick={() => fileInputRef.current?.click()}>
                  <div className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group shadow-2xl ${
                      isLight ? 'bg-white/10 border-white/40 hover:border-blue-400' : 'bg-black/20 border-white/10 hover:border-blue-500'
                    }`}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-500">
                        <svg className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={2.5} /></svg>
                        <span className="text-[8px] font-black uppercase">Bio Photo</span>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && setPreviewUrl(URL.createObjectURL(e.target.files[0]))} className="hidden" accept="image/*" />
                </div>
              )}

              <div className="space-y-5">
                <InputField id="name" label="Personnel Name" value={profile.name} onChange={handleFieldChange} required placeholder="Full Name" autoComplete="name" />

                {mode === 'signup' && (
                  <>
                    <InputField id="role" label="Role" value={profile.role} onChange={handleFieldChange} required list={ROLES} />
                    <InputField id="site" label="Zone" value={profile.site} onChange={handleFieldChange} list={SITES} />
                  </>
                )}

                <InputField id="password" label="Access Key" type="password" value={profile.password || ''} onChange={handleFieldChange} required placeholder="••••••••" />

                {mode === 'signup' && (
                   <InputField id="confirmPassword" label="Confirm Key" type="password" value={confirmPassword} onChange={handleFieldChange} required placeholder="••••••••" />
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-2xl transition-all disabled:opacity-50 uppercase tracking-widest text-xs border border-blue-400/30">
                  {isProcessing ? 'Synchronizing...' : mode === 'signup' ? 'Establish Identity' : 'Verify Access'}
                </button>
                
                {mode === 'login' && bioAvailable && (
                  <button type="button" onClick={() => handleBiometricLogin()} disabled={isProcessing} className={`w-full font-black py-4 rounded-2xl border transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 ${isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-blue-400 border-white/10'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Use Biometric Lock
                  </button>
                )}
              </div>
            </form>
          </div>
        </AuthCard>
      )}
    </div>
  );
};

const CardBackgroundGlow = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3rem]">
    <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-red-500/10 via-transparent to-blue-500/10 opacity-30 animate-pulse"></div>
  </div>
);
