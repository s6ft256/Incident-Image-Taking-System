import React, { useState, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import { ROLES, SITES } from '../constants';
import { registerProfile, getProfileByName } from '../services/profileService';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { InputField } from './InputField';

interface AuthScreenProps {
  onAuthComplete: (profile: UserProfile) => void;
  appTheme: 'dark' | 'light';
}

const AuthCard: React.FC<{ children: React.ReactNode, isLight: boolean }> = ({ children, isLight }) => (
  <div className={`relative w-full max-w-md p-8 sm:p-10 rounded-[3rem] border backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-700 animate-in fade-in zoom-in-95 slide-in-from-bottom-10 z-20 overflow-hidden ${
    isLight ? 'bg-white/20 border-white/40 shadow-slate-200/50' : 'bg-slate-900/10 border-white/20 shadow-black/80'
  }`}>
    {/* Content Container */}
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

const VideoBackground: React.FC<{ isLight: boolean }> = ({ isLight }) => (
  <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 flex items-center justify-center">
    {/* Cinematic "Shortened" Video Container */}
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
      
      {/* Edge Feathering for the cinematic strip */}
      <div className={`absolute inset-0 bg-gradient-to-b ${
        isLight 
          ? 'from-white via-transparent to-white' 
          : 'from-slate-950 via-transparent to-slate-950'
      }`}></div>
    </div>

    {/* Global Color Grading Overlays */}
    <div className={`absolute inset-0 bg-gradient-to-br ${
      isLight 
        ? 'from-white/40 via-blue-50/10 to-white/60' 
        : 'from-slate-950 via-slate-900/20 to-slate-950'
    }`}></div>
  </div>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete, appTheme }) => {
  const [mode, setMode] = useState<'welcome' | 'signup' | 'login'>('welcome');
  const [profile, setProfile] = useState<UserProfile>({ name: '', role: '', site: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const isLight = appTheme === 'light';

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProfile(p => ({ ...p, [id]: value }));
    if (error) setError('');
  }, [error]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name || !profile.role) return setError('Mandatory: Name and Role credentials required.');
    
    setIsProcessing(true);
    setError('');
    
    try {
      let imageUrl = '';
      if (fileInputRef.current?.files?.[0]) {
        const compressed = await compressImage(fileInputRef.current.files[0]);
        imageUrl = await uploadImageToStorage(compressed, 'profiles');
      }

      const newProfile = await registerProfile({ ...profile, profileImageUrl: imageUrl });
      onAuthComplete(newProfile);
    } catch (err: any) {
      setError(err.message || 'System fault: Failed to synchronize new identity.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name) return setError('Identity verification requires a registered name.');

    setIsProcessing(true);
    setError('');

    try {
      const existing = await getProfileByName(profile.name);
      if (existing) {
        onAuthComplete(existing);
      } else {
        setError('Unauthorized: Profile not found in safety database.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification system timeout. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <div className="animate-in slide-in-from-top-2 fade-in duration-300 flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{error}</span>
      </div>
    );
  };

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
                 <div className="h-1 w-12 bg-blue-600 mt-2 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-4">
              <button 
                onClick={() => setMode('signup')}
                className="group w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs border border-blue-400/30 flex items-center justify-center gap-3"
              >
                Establish New Identity
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
              
              <button 
                onClick={() => setMode('login')}
                className={`w-full font-black py-5 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs border ${
                  isLight 
                    ? 'bg-white/10 border-white/20 text-slate-900 hover:bg-white/20' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                Access Verified Profile
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
                 {mode === 'signup' ? 'New Registration' : 'Restore Access'}
               </h3>
               <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest">Protocol {mode === 'signup' ? '01-A' : '01-B'}</span>
            </div>
          </div>

          <div className="relative z-10">
            {renderError()}
            
            <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-6">
              {mode === 'signup' && (
                <div className="flex flex-col items-center pb-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group shadow-2xl ${
                      isLight ? 'bg-white/10 border-white/40 hover:border-blue-400' : 'bg-black/20 border-white/10 hover:border-blue-500'
                    }`}
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={2} /></svg>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-slate-500 group-hover:text-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">Biometric Photo</span>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                </div>
              )}

              <div className="space-y-5">
                <InputField 
                  id="name" 
                  label="Personnel Name" 
                  value={profile.name} 
                  onChange={handleFieldChange} 
                  required 
                  placeholder="Full Identification Name" 
                  autoComplete="name"
                />

                {mode === 'signup' && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-5">
                    <InputField 
                      id="role" 
                      label="Designated Capacity" 
                      value={profile.role} 
                      onChange={handleFieldChange} 
                      required 
                      placeholder="Official Title" 
                      list={ROLES}
                      autoComplete="organization-title"
                    />
                    <InputField 
                      id="site" 
                      label="Operational Zone" 
                      value={profile.site} 
                      onChange={handleFieldChange} 
                      placeholder="Primary Location" 
                      list={SITES}
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-2xl transition-all disabled:opacity-50 active:scale-[0.98] uppercase tracking-widest text-xs border border-blue-400/30 flex items-center justify-center gap-3 mt-4"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Initializing Link...
                  </>
                ) : mode === 'signup' ? 'Finalize Credentialing' : 'Authenticate Identity'}
              </button>
            </form>
          </div>
        </AuthCard>
      )}
    </div>
  );
};