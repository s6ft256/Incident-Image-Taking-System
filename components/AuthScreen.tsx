
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UserProfile } from '../types';
import { ROLES, SITES } from '../constants';
import { registerProfile, getProfileByName } from '../services/profileService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { InputField } from './InputField';
import { isBiometricsAvailable, authenticateBiometrics } from '../services/biometricService';
import { PolicyModal } from './PolicyModal';

interface AuthScreenProps {
  onAuthComplete: (profile: UserProfile) => void;
  appTheme: 'dark' | 'light';
}

const LAST_USER_KEY = 'hse_guardian_last_user';

const AuthCard: React.FC<{ children: React.ReactNode, isLight: boolean }> = ({ children, isLight }) => (
  <div className={`relative w-full max-w-xs p-6 sm:p-8 rounded-[3rem] border backdrop-blur-sm transition-all duration-300 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 z-20 overflow-hidden ${
    isLight 
      ? 'bg-transparent border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]' 
      : 'bg-transparent border-red-600/50 shadow-[0_0_40px_rgba(220,38,38,0.2)] ring-1 ring-red-500/10'
  }`}>
    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
    <div className="relative z-10">{children}</div>
  </div>
);

const CardBackgroundGlow: React.FC = () => (
  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[100px]"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
  </div>
);

const VideoBackground: React.FC<{ isLight: boolean }> = ({ isLight }) => (
  <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 flex items-center justify-center">
    <div className="relative w-full h-[65vh] overflow-hidden opacity-70">
      <video autoPlay muted loop playsInline className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover">
        <source src="https://v1.pinimg.com/videos/mc/720p/be/15/5a/be155abccdc19354019151163e21a073.mp4" type="video/mp4" />
      </video>
      <div className={`absolute inset-0 bg-gradient-to-b ${isLight ? 'from-white via-transparent to-white' : 'from-slate-950 via-transparent to-slate-950'}`}></div>
    </div>
    <div className={`absolute inset-0 bg-gradient-to-br ${isLight ? 'from-white/40 via-blue-50/10 to-white/60' : 'from-slate-950 via-slate-900/20 to-slate-950'}`}></div>
  </div>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete, appTheme }) => {
  const [mode, setMode] = useState<'welcome' | 'signup' | 'login'>('welcome');
  const [profile, setProfile] = useState<UserProfile>({ name: '', role: '', site: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [imageConsent, setImageConsent] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [lastUserName, setLastUserName] = useState<string | null>(localStorage.getItem(LAST_USER_KEY));

  const isLight = appTheme === 'light';

  useEffect(() => {
    isBiometricsAvailable().then(setBioAvailable);
  }, []);

  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    if (id === 'confirmPassword') setConfirmPassword(value);
    else setProfile(p => ({ ...p, [id]: value }));
    if (error) setError('');
  }, [error]);

  const handleBiometricLogin = async (targetName?: string) => {
    const nameToVerify = targetName || profile.name;
    if (!nameToVerify) return setError('Identification name required.');
    setIsProcessing(true);
    setError('');
    try {
      const existing = await getProfileByName(nameToVerify);
      if (!existing) throw new Error('Personnel identity not found.');
      if (!existing.webauthn_credential_id) throw new Error('Biometric lock not linked. Use Password.');
      const success = await authenticateBiometrics(existing.webauthn_credential_id);
      if (success) {
        localStorage.setItem(LAST_USER_KEY, existing.name);
        onAuthComplete(existing);
      } else setError('Biometric authentication failed.');
    } catch (err: any) { setError(err.message || 'Biometric scanner error.'); }
    finally { setIsProcessing(false); }
  };

  const validateSignup = () => {
    if (!profile.name || !profile.role || !profile.password) {
      setError('Identification details required.');
      return false;
    }
    if (profile.password.length < 6) {
      setError('Key must be > 6 characters.');
      return false;
    }
    if (profile.password !== confirmPassword) {
      setError('Keys do not match.');
      return false;
    }
    if (!privacyConsent) {
      setError('Accept User Agreement & Privacy Policy.');
      setShowComplianceModal(true);
      return false;
    }
    if (!imageConsent) {
      setError('Confirm Image Upload Authorization.');
      return false;
    }
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    
    setIsProcessing(true);
    setError('');
    try {
      let imageUrl = '';
      if (fileInputRef.current?.files?.[0]) {
        const compressed = await compressImage(fileInputRef.current.files[0]);
        imageUrl = await uploadImageToStorage(compressed, 'profiles');
      }
      const newProfile = await registerProfile({ 
        ...profile, 
        profileImageUrl: imageUrl,
        privacy_policy_consent: true,
        user_agreement_consent: true,
        image_consent: imageConsent
      });
      localStorage.setItem(LAST_USER_KEY, newProfile.name);
      onAuthComplete(newProfile);
    } catch (err: any) { setError(err.message || 'Signup failed.'); }
    finally { setIsProcessing(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name || !profile.password) return setError('Name and Key required.');
    setIsProcessing(true);
    setError('');
    try {
      const existing = await getProfileByName(profile.name);
      if (existing) {
        if (existing.password === profile.password) {
          localStorage.setItem(LAST_USER_KEY, existing.name);
          onAuthComplete(existing);
        } else setError('Incorrect Access Key.');
      } else setError('Personnel not registered.');
    } catch (err: any) { setError(err.message || 'Authentication timeout.'); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center p-6 overflow-hidden">
      <VideoBackground isLight={isLight} />
      
      {mode === 'welcome' ? (
        <AuthCard isLight={isLight}>
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
              <img src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" className="h-20 w-auto relative z-10 drop-shadow-2xl animate-pulse" alt="TGC" />
            </div>
            <div className="space-y-2 mb-8">
              <h2 className={`text-4xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>HSE <span className="text-blue-500">Guardian</span></h2>
              <div className="flex flex-col items-center"><div className="h-1 w-10 bg-red-600 mt-1 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)]"></div></div>
            </div>
            <div className="w-full flex flex-col gap-3">
              {lastUserName && bioAvailable && (
                <button onClick={() => handleBiometricLogin(lastUserName)} className="group w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] border border-emerald-400/30 flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Scan: {lastUserName.split(' ')[0]}
                </button>
              )}
              <button onClick={() => setMode('login')} className={`w-full font-black py-4 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] border ${isLight ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20 shadow-md' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}>Access Protocol</button>
              <button onClick={() => setMode('signup')} className={`w-full font-black py-4 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] border ${isLight ? 'bg-white/10 border-white/20 text-slate-900' : 'bg-white/5 border-white/10 text-slate-300'}`}>New Identity</button>
            </div>
            <p className={`mt-8 text-[8px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Secure Personal Authentication System</p>
          </div>
          <CardBackgroundGlow />
        </AuthCard>
      ) : (
        <AuthCard isLight={isLight}>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <button onClick={() => { setMode('welcome'); setError(''); }} className={`p-2 rounded-xl transition-all flex items-center gap-1 border ${isLight ? 'hover:bg-white/20 border-white/40 text-slate-900' : 'hover:bg-white/5 border-white/10 text-slate-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg> <span className="text-[8px] font-black uppercase tracking-widest pr-1">Back</span>
            </button>
            <div className="text-right"><h3 className={`text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{mode === 'signup' ? 'Profile' : 'Access'}</h3><span className="text-[8px] font-black uppercase text-blue-500 tracking-widest">Protocol</span></div>
          </div>
          <div className="relative z-10">
            {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl mb-4 text-[8px] font-black uppercase tracking-widest flex items-center gap-2"><svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{error}</div>}
            <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-4">
              {mode === 'signup' && (
                <div className="flex flex-col items-center pb-2" onClick={() => fileInputRef.current?.click()}>
                  <div className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative shadow-lg ${isLight ? 'bg-white/10 border-white/40' : 'bg-black/20 border-white/10'}`}>
                    {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" /> : <div className="flex flex-col items-center text-slate-500"><svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={2.5} /></svg><span className="text-[6px] font-black uppercase">Photo</span></div>}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && setPreviewUrl(URL.createObjectURL(e.target.files[0]))} className="hidden" accept="image/*" />
                </div>
              )}
              <div className="space-y-4">
                <InputField id="name" label="Personnel Name" value={profile.name} onChange={handleFieldChange} required placeholder="Name" autoComplete="name" />
                {mode === 'signup' && (<><InputField id="role" label="Role" value={profile.role} onChange={handleFieldChange} required list={ROLES} /><InputField id="site" label="Zone" value={profile.site} onChange={handleFieldChange} list={SITES} /></>)}
                <InputField id="password" label="Key / Fallback" type="password" value={profile.password || ''} onChange={handleFieldChange} required placeholder="••••••••" />
                {mode === 'signup' && <InputField id="confirmPassword" label="Confirm Key" type="password" value={confirmPassword} onChange={handleFieldChange} required placeholder="••••••••" />}
              </div>

              {mode === 'signup' && (
                <div className="space-y-3 pt-2">
                   <div className="flex items-start gap-3 px-1">
                      <input type="checkbox" id="privacyConsent" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
                      <label htmlFor="privacyConsent" className={`text-[7px] font-black uppercase tracking-widest leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        I confirm that I have read and agree to the <button type="button" onClick={() => setShowComplianceModal(true)} className="text-blue-500 underline decoration-blue-500/30">Privacy Policy</button> and <button type="button" onClick={() => setShowComplianceModal(true)} className="text-blue-500 underline decoration-blue-500/30">User Consent & Agreement</button> of HSE Guardian, and I consent to the collection and processing of my data for HSE purposes.
                      </label>
                   </div>
                   <div className="flex items-start gap-3 px-1">
                      <input type="checkbox" id="imageConsent" checked={imageConsent} onChange={(e) => setImageConsent(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
                      <label htmlFor="imageConsent" className={`text-[7px] font-black uppercase tracking-widest leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        I confirm that I am authorized to upload these images and that they are related to HSE incidents or observations. I consent to their secure storage and use for safety purposes in accordance with ISO 45001 / GDPR.
                      </label>
                   </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button type="submit" disabled={isProcessing} className={`w-full font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest text-[10px] border ${isLight ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}>
                  {isProcessing ? 'Verifying...' : mode === 'signup' ? 'I Agree & Continue' : 'Verify Key'}
                </button>
              </div>
            </form>
          </div>
          <CardBackgroundGlow />
        </AuthCard>
      )}

      {showComplianceModal && (
        <PolicyModal 
          appTheme={appTheme} 
          initialTab="agreement" 
          showAcceptButton={true}
          onAccept={() => {
            setPrivacyConsent(true);
            setShowComplianceModal(false);
          }}
          onClose={() => setShowComplianceModal(false)} 
        />
      )}
    </div>
  );
};
