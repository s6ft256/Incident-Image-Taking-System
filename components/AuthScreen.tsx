
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

// Performance: Define sub-components outside the main component 
// to prevent unmounting/remounting on every state update (keystroke)
const AuthCard = ({ children, isLight }: { children: React.ReactNode, isLight: boolean }) => (
  <div className={`w-full max-w-md p-8 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl transition-all duration-500 animate-in fade-in zoom-in-95 ${
    isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900/60 border-white/10 shadow-black'
  }`}>
    {children}
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

  // Performance Optimization: Single memoized handler for all fields
  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProfile(p => ({ ...p, [id]: value }));
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name || !profile.role) return setError('Name and Role are required.');
    
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
      setError(err.message || 'Failed to register profile.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.name) return setError('Please enter your name.');

    setIsProcessing(true);
    setError('');

    try {
      const existing = await getProfileByName(profile.name);
      if (existing) {
        onAuthComplete(existing);
      } else {
        setError('Profile not found. Please register instead.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve profile.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (mode === 'welcome') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <AuthCard isLight={isLight}>
          <div className="flex flex-col items-center text-center space-y-6">
            <img src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" className="h-24 w-auto drop-shadow-2xl" alt="TGC" />
            <div className="space-y-2">
              <h2 className={`text-4xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>HSE <span className="text-blue-500">Guardian</span></h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Safety Acquisition Identity</p>
            </div>
            <div className="w-full flex flex-col gap-4 pt-4">
              <button 
                onClick={() => setMode('signup')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
              >
                Register New Identity
              </button>
              <button 
                onClick={() => setMode('login')}
                className={`w-full font-black py-4 rounded-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-xs border ${
                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                Access Existing Profile
              </button>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <AuthCard isLight={isLight}>
        <button onClick={() => setMode('welcome')} className={`mb-6 p-2 rounded-xl transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-white/5 text-slate-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        
        <form onSubmit={mode === 'signup' ? handleSignup : handleLogin} className="space-y-6">
          <div className="text-center mb-8">
            <h3 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{mode === 'signup' ? 'Create Identity' : 'Verify Identity'}</h3>
            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Database Synchronization</p>
          </div>

          {mode === 'signup' && (
            <div className="flex flex-col items-center pb-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${
                  isLight ? 'bg-slate-50 border-slate-300 hover:border-blue-400' : 'bg-black/20 border-white/10 hover:border-blue-500'
                }`}
              >
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center text-slate-500 group-hover:text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span className="text-[8px] font-black uppercase mt-1">Photo</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" capture="environment" />
            </div>
          )}

          <div className="space-y-4">
            <InputField 
              id="name" 
              label="Full Registered Name" 
              value={profile.name} 
              onChange={handleFieldChange} 
              required 
              placeholder="Ex: John Doe" 
              autoComplete="name"
            />

            {mode === 'signup' && (
              <>
                <InputField 
                  id="role" 
                  label="Organizational Role" 
                  value={profile.role} 
                  onChange={handleFieldChange} 
                  required 
                  placeholder="Ex: Safety Supervisor" 
                  list={ROLES}
                  autoComplete="organization-title"
                />
                <InputField 
                  id="site" 
                  label="Assigned Site" 
                  value={profile.site} 
                  onChange={handleFieldChange} 
                  placeholder="Ex: Warehouse A" 
                  list={SITES}
                />
              </>
            )}
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {isProcessing ? 'Synchronizing...' : mode === 'signup' ? 'Complete Registration' : 'Restore Identity'}
          </button>
        </form>
      </AuthCard>
    </div>
  );
};
