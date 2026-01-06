import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UserProfile } from '../types';
import { ROLES, SITES, SYSTEM_LOGO_URL } from '../constants';
import { registerProfile, getProfileByName } from '../services/profileService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { InputField } from './InputField';
import { PolicyModal } from './PolicyModal';

interface AuthScreenProps {
  onAuthComplete: (profile: UserProfile) => void;
  appTheme: 'dark' | 'light';
}

const LAST_USER_KEY = 'hse_guardian_last_user';

const AuthCard: React.FC<{ children: React.ReactNode, isLight: boolean }> = ({ children, isLight }) => (
  <div className={`relative w-full max-w-xs p-6 sm:p-8 rounded-[3rem] border backdrop-blur-md transition-all duration-300 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 z-20 overflow-hidden form-container-glow ${
    isLight 
      ? 'bg-white/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]' 
      : 'bg-slate-900/60 border-blue-600/30 shadow-[0_0_40px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/10'
  }`}>
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5 pointer-events-none"></div>
    <div className="relative z-10">{children}</div>
  </div>
);

const CardBackgroundGlow: React.FC = () => (
  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
  </div>
);

const AuthBackground: React.FC<{ isLight: boolean }> = ({ isLight }) => (
  <div className={`fixed inset-0 z-[-1] transition-colors duration-1000 ${
    isLight ? 'bg-slate-50' : 'bg-[#020617]'
  }`}>
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat"></div>
    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(59,130,246,0.1)_100%)] ${isLight ? 'opacity-40' : 'opacity-100'}`}></div>
    <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
  </div>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete, appTheme }) => {
  const [mode, setMode] = useState<'welcome' | 'signup' | 'login'>('welcome');
  const [profile, setProfile] = useState<UserProfile>({ name: '', role: '', site: '', email: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [imageConsent, setImageConsent] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const isLight = appTheme === 'light';

  useEffect(() => {
    const lastName = localStorage.getItem(LAST_USER_KEY);
    if (lastName) {
      getProfileByName(lastName).then(p => {
        if (p) setProfile(prev => ({ ...prev, name: p.name }));
      });
    }
  }, []);

  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    if (id === 'confirmPassword') setConfirmPassword(value);
    else setProfile(p => ({ ...p, [id]: value }));
    if (error) setError('');
  }, [error]);

  const validateSignup = () => {
    if (!profile.name || !profile.role || !profile.password) {
      setError('Identification details required.');
      return false;
    }
    if (profile.email && !profile.email.includes('@')) {
      setError('Invalid email format.');
      return false;
    }
    if (profile.password.length < 6) {
      setError('Key must be at least 6 characters.');
      return false;
    }
    if (profile.password !== confirmPassword) {
      setError('Access keys do not match.');
      return false;
    }
    if (!privacyConsent) {
      setError('Please accept the User Agreement.');
      setShowComplianceModal(true);
      return false;
    }
    if (!cookieConsent) {
      setError('Please acknowledge the Cookie Handshake.');
      return false;
    }
    if (!imageConsent) {
      setError('Please confirm Image Authorization.');
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
    } catch (err: any) { 
      setError(err.message || 'Onboarding flow interrupted.'); 
      setIsProcessing(false);
    }
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
      } else setError('Personnel identity not found.');
    } catch (err: any) { 
      setError(err.message || 'Authentication timeout.'); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <div className="relative min-h-[95vh] flex items-center justify-center p-6 overflow-hidden">
      <AuthBackground isLight={isLight} />
      
      {mode === 'welcome' ? (
        <AuthCard isLight={isLight}>
          <div className="flex flex-col items-center text-center relative z-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-125"></div>
              <img src={SYSTEM_LOGO_URL} className="h-40 w-40 relative z-10 drop-shadow-2xl animate-pulse object-contain" alt="System Logo" />
            </div>
            <div className="space-y-1 mb-10">
              <h2 className={`text-4xl font-black tracking-tighter leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
                HSE<span className="text-blue-500">GUARDIAN</span>
              </h2>
              <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>High-Integrity Safety Protocol</p>
              <div className="flex flex-col items-center pt-2"><div className="h-1.5 w-14 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)]"></div></div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button onClick={() => setMode('login')} className={`w-full font-black py-5 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-[11px] border ${isLight ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20 shadow-md' : 'bg-blue-600/20 border-blue-500/30 text-white hover:bg-blue-600/30'}`}>Access Protocol</button>
              <button onClick={() => setMode('signup')} className={`w-full font-black py-5 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-[11px] border ${isLight ? 'bg-white border-blue-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}>New Identity</button>
            </div>
            <p className={`mt-10 text-[9px] font-bold uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>High-Integrity Evidence Gateway</p>
          </div>
          <CardBackgroundGlow />
        </AuthCard>
      ) : (
        <AuthCard isLight={isLight}>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <button onClick={() => { setMode('welcome'); setError(''); }} className={`p-2 rounded-xl transition-all flex items-center gap-1 border ${isLight ? 'hover:bg-slate-100 border-slate-200 text-slate-900' : 'hover:bg-white/5 border-white/10 text-slate-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg> <span className="text-[8px] font-black uppercase tracking-widest pr-1">Back</span>
            </button>
            <div className="text-right"><h3 className={`text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{mode === 'signup' ? 'Profile' : 'Access'}</h3><span className="text-[8px] font-black uppercase text-blue-500 tracking-widest">Protocol</span></div>
          </div>
          <div className="relative z-10">
            {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl mb-4 text-[8px] font-black uppercase tracking-widest flex items-center gap-2 animate-in shake"><svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{error}</div>}
            
            <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-4">
              {mode === 'signup' && (
                <div className="flex flex-col items-center pb-2" onClick={() => fileInputRef.current?.click()}>
                  <div className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative shadow-lg ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/10'}`}>
                    {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" /> : <div className="flex flex-col items-center text-slate-500"><svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={2.5} /></svg><span className="text-[6px] font-black uppercase">Photo</span></div>}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && setPreviewUrl(URL.createObjectURL(e.target.files[0]))} className="hidden" accept="image/*" />
                </div>
              )}
              <div className="space-y-4">
                <div className="relative">
                  <InputField id="name" label="Personnel Name" value={profile.name} onChange={handleFieldChange} required placeholder="Full Name" autoComplete="name" />
                </div>
                {mode === 'signup' && (
                  <>
                    <InputField id="email" label="Company Email" value={profile.email || ''} onChange={handleFieldChange} placeholder="user@trojanholding.ae" autoComplete="email" />
                    <InputField id="role" label="Role" value={profile.role} onChange={handleFieldChange} required list={ROLES} />
                    <InputField id="site" label="Zone" value={profile.site} onChange={handleFieldChange} list={SITES} />
                  </>
                )}
                <InputField id="password" label="Access Key" type="password" value={profile.password || ''} onChange={handleFieldChange} required placeholder="••••••••" />
                {mode === 'signup' && <InputField id="confirmPassword" label="Confirm Key" type="password" value={confirmPassword} onChange={handleFieldChange} required placeholder="••••••••" />}
              </div>

              {mode === 'signup' && (
                <div className="space-y-3 pt-2">
                   <div className="flex items-start gap-3 px-1">
                      <input type="checkbox" id="privacyConsent" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
                      <label htmlFor="privacyConsent" className={`text-[7px] font-black uppercase tracking-widest leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        I agree to the <button type="button" onClick={() => setShowComplianceModal(true)} className="text-blue-500 underline">User Agreement</button>.
                      </label>
                   </div>
                   <div className="flex items-start gap-3 px-1">
                      <input type="checkbox" id="imageConsent" checked={imageConsent} onChange={(e) => setImageConsent(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500" />
                      <label htmlFor="imageConsent" className={`text-[7px] font-black uppercase tracking-widest leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        I authorize evidence image collection.
                      </label>
                   </div>
                </div>
              )}

              <button type="submit" disabled={isProcessing} className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest text-[10px] border flex items-center justify-center gap-3 ${isLight ? 'bg-blue-600 text-white border-blue-400' : 'bg-blue-600/30 border-blue-500/40 text-white hover:bg-blue-600/30'}`}>
                {isProcessing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (mode === 'signup' ? 'Complete Onboarding' : 'Establish Access')}
              </button>
            </form>
          </div>
          <CardBackgroundGlow />
        </AuthCard>
      )}

      {showComplianceModal && <PolicyModal onClose={() => setShowComplianceModal(false)} initialTab="privacy" showAcceptButton onAccept={() => { setPrivacyConsent(true); setShowComplianceModal(false); }} appTheme={appTheme} />}
    </div>
  );
};