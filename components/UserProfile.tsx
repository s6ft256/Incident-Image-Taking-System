
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { updateProfile } from '../services/profileService';
import { isBiometricsAvailable, registerBiometrics } from '../services/biometricService';

interface UserProfileProps {
  onBack: () => void;
}

const PROFILE_KEY = 'hse_guardian_profile';
const THEME_KEY = 'hse_guardian_theme';

export const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const [profile, setProfile] = useState<UserProfileType>({ name: '', role: '', site: '', profileImageUrl: '' });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isUploading, setIsUploading] = useState(false);
  const [isBioRegistering, setIsBioRegistering] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    }

    const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }

    isBiometricsAvailable().then(setBioAvailable);
  }, []);

  const applyTheme = (t: 'dark' | 'light') => {
    if (t === 'light') {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
  };

  const handleToggleBiometrics = async () => {
    if (profile.webauthn_credential_id) {
        // Option to unlink if already set
        if (confirm("Deactivate biometric lock for this device?")) {
            setErrorMessage('');
            try {
                if (profile.id) {
                    await updateProfile(profile.id, { 
                        webauthn_credential_id: '', 
                        webauthn_public_key: '' 
                    });
                }
                const updatedProfile = { ...profile, webauthn_credential_id: '', webauthn_public_key: '' };
                setProfile(updatedProfile);
                localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
            } catch (err: any) {
                setErrorMessage(err.message || "Failed to remove biometric lock.");
            }
        }
        return;
    }

    setErrorMessage('');
    setIsBioRegistering(true);
    try {
      const { credentialId, publicKey } = await registerBiometrics(profile.name);
      const updatedProfile = { ...profile, webauthn_credential_id: credentialId, webauthn_public_key: publicKey };
      
      if (profile.id) {
        await updateProfile(profile.id, { 
          webauthn_credential_id: credentialId, 
          webauthn_public_key: publicKey 
        });
      }
      
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Biometric registration failed.");
    } finally {
      setIsBioRegistering(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage('');
    
    try {
      const compressed = await compressImage(file);
      const publicUrl = await uploadImageToStorage(compressed, 'profiles');
      
      const updatedProfile = { ...profile, profileImageUrl: publicUrl };
      if (profile.id) {
        await updateProfile(profile.id, { profileImageUrl: publicUrl });
      }
      
      setProfile(updatedProfile);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      console.error("Image upload failed", err);
      setErrorMessage(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    
    try {
      if (profile.id) {
        await updateProfile(profile.id, { name: profile.name, role: profile.role, site: profile.site });
      }
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(THEME_KEY, theme);
      setSaveStatus('saved');
      window.dispatchEvent(new Event('profileUpdated'));
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setErrorMessage(err.message);
      setSaveStatus('error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(PROFILE_KEY);
    window.location.reload();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  return (
    <div className={`backdrop-blur-2xl rounded-2xl border shadow-[0_10px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col p-4 space-y-4 ${
      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/95 border-white/10'
    }`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Profile Settings</h3>
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative group mb-3">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl border-2 overflow-hidden ring-2 ring-blue-500/10 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
          }`}>
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-blue-600 p-1 rounded-full border border-slate-900 shadow-lg text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" capture="environment" className="hidden" />
        </div>
        <p className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{profile.name || 'HSE Reporter'}</p>
        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{profile.role || 'Access Tier 1'}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <label className={`text-[8px] font-black uppercase tracking-widest px-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Identity</label>
            <input 
              type="text" 
              value={profile.name} 
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Full Name"
              className={`border rounded-lg px-3 py-1.5 text-xs focus:border-blue-500 outline-none w-full ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-black/40 border-white/5 text-white'
              }`}
            />
          </div>

          <div className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
            profile.webauthn_credential_id 
              ? (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]') 
              : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10')
          }`}>
             <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                        profile.webauthn_credential_id ? 'text-emerald-500' : (isLight ? 'text-slate-500' : 'text-slate-400')
                    }`}>Biometric Lock</span>
                    <span className={`text-[7px] font-bold uppercase tracking-tight ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        {profile.webauthn_credential_id ? 'Secure Link Active' : 'Native Scanner Disabled'}
                    </span>
                </div>
                {bioAvailable ? (
                    <button 
                        type="button" 
                        onClick={handleToggleBiometrics}
                        disabled={isBioRegistering}
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${
                            profile.webauthn_credential_id ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-600'
                        }`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm flex items-center justify-center ${
                            profile.webauthn_credential_id ? 'left-5.5' : 'left-0.5'
                        }`}>
                            {isBioRegistering && <div className="w-2 h-2 border-[1.5px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
                        </div>
                    </button>
                ) : (
                    <span className="text-[7px] font-black text-rose-500 uppercase">Not Supported</span>
                )}
             </div>
          </div>
        </div>

        <div className={`flex items-center justify-between px-2 py-2 rounded-lg ${isLight ? 'bg-slate-50 border border-slate-200' : 'bg-white/5 border border-white/5'}`}>
          <div className="flex flex-col">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>Interface Theme</span>
            <span className={`text-[7px] font-bold uppercase ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{theme} protocol</span>
          </div>
          <button 
            type="button" 
            onClick={toggleTheme}
            className={`w-10 h-5 rounded-full relative transition-all duration-300 ${theme === 'dark' ? 'bg-slate-700' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${theme === 'dark' ? 'left-0.5' : 'left-5.5'}`}></div>
          </button>
        </div>

        {errorMessage && <p className="text-[8px] text-rose-500 font-bold uppercase bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">{errorMessage}</p>}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className={`w-full text-[10px] font-black py-3 rounded-xl shadow-lg transition-all uppercase tracking-widest ${
              saveStatus === 'saved' ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500'
            } text-white border border-white/10`}
          >
            {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Identity Updated ✓' : 'Commit Changes'}
          </button>
          
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full text-[10px] font-black py-3 rounded-xl transition-all uppercase tracking-widest border ${
              isLight ? 'bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200' : 'bg-black/20 border-white/5 text-slate-500 hover:text-rose-400 hover:border-rose-500/30'
            }`}
          >
            Sign Out
          </button>
        </div>
      </form>
    </div>
  );
};
