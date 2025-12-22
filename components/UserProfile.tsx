
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { updateProfile, deleteProfile } from '../services/profileService';
import { registerBiometrics } from '../services/biometricService';
import { InputField } from './InputField';
import { ROLES, SITES } from '../constants';
import { sendNotification, requestNotificationPermission } from '../services/notificationService';

interface UserProfileProps {
  onBack: () => void;
  baseId: string;
}

const PROFILE_KEY = 'hse_guardian_profile';
const THEME_KEY = 'hse_guardian_theme';
const LAST_USER_KEY = 'hse_guardian_last_user';
// Updated RBAC roles (Case-insensitive matching)
const AUTHORIZED_ADMIN_ROLES = ['technician', 'engineer'];

export const UserProfile: React.FC<UserProfileProps> = ({ onBack, baseId }) => {
  const [profile, setProfile] = useState<UserProfileType>({ name: '', role: '', site: '', profileImageUrl: '' });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(Notification.permission);
  
  const initialProfile = useRef<UserProfileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

  // Case-Insensitive Authorization Logic
  const isSecureIdentity = useMemo(() => {
    if (!profile.role) return false;
    return AUTHORIZED_ADMIN_ROLES.includes(profile.role.toLowerCase());
  }, [profile.role]);

  const clearanceLevel = useMemo(() => {
    return isSecureIdentity ? 'Level 2' : 'Level 1';
  }, [isSecureIdentity]);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        initialProfile.current = parsed;
      } catch (e) { console.error("Profile parse fail", e); }
    }

    const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light';
    if (savedTheme) { 
      setTheme(savedTheme); 
      applyTheme(savedTheme); 
    }

    setNotificationPermission(Notification.permission);
  }, []);

  const hasChanges = useMemo(() => {
    if (!initialProfile.current) return false;
    return (
      profile.name !== initialProfile.current.name ||
      profile.role !== initialProfile.current.role ||
      profile.site !== initialProfile.current.site
    );
  }, [profile]);

  const applyTheme = (t: 'dark' | 'light') => {
    if (t === 'light') { 
      document.documentElement.classList.add('light-mode'); 
      document.documentElement.classList.remove('dark'); 
    } else { 
      document.documentElement.classList.remove('light-mode'); 
      document.documentElement.classList.add('dark'); 
    }
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleToggleBiometrics = async () => {
    if (profile.webauthn_credential_id) {
      const updated = { ...profile, webauthn_credential_id: undefined, webauthn_public_key: undefined };
      setProfile(updated);
      if (profile.id) await updateProfile(profile.id, { webauthn_credential_id: '', webauthn_public_key: '' });
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    } else {
      try {
        const cred = await registerBiometrics(profile.name);
        const updated = { ...profile, webauthn_credential_id: cred.credentialId, webauthn_public_key: cred.publicKey };
        setProfile(updated);
        if (profile.id) await updateProfile(profile.id, { webauthn_credential_id: cred.credentialId, webauthn_public_key: cred.publicKey });
        localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      } catch (err: any) {
        setErrorMessage(err.message || "Biometric registration failed");
      }
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const publicUrl = await uploadImageToStorage(compressed, 'profiles');
      const updatedProfile = { ...profile, profileImageUrl: publicUrl };
      if (profile.id) await updateProfile(profile.id, { profileImageUrl: publicUrl });
      setProfile(updatedProfile);
      initialProfile.current = updatedProfile;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally { setIsUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    
    setSaveStatus('saving');
    try {
      if (profile.id) {
        await updateProfile(profile.id, { 
          name: profile.name, 
          role: profile.role, 
          site: profile.site 
        });
      }
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      initialProfile.current = profile;
      setSaveStatus('saved');
      window.dispatchEvent(new Event('profileUpdated'));
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setErrorMessage(err.message);
      setSaveStatus('error');
    }
  };

  const handleTestNotification = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(Notification.permission);
    if (granted) {
      sendNotification("HSE Guardian Check", "System alerts are functional and authorized.");
    } else {
      setErrorMessage("Please enable notifications in your browser settings.");
    }
  };

  const handleDeleteIdentity = async () => {
    if (!profile.id) return;
    setIsDeleting(true);
    try {
      await deleteProfile(profile.id);
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(LAST_USER_KEY);
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to purge identity.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`backdrop-blur-3xl rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 max-h-[85vh] overflow-y-auto scrollbar-hide ${
      isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a]/95 border-white/10'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Security Configuration</h3>
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col items-center pt-2">
        <div className="relative mb-4">
          <div className={`w-28 h-28 rounded-full flex items-center justify-center border-2 overflow-hidden shadow-2xl transition-all duration-500 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-white/10 ring-8 ring-white/5'
          } ${isSecureIdentity ? 'ring-emerald-500/20' : ''}`}>
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full border-2 border-[#0f172a] text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
        <div className="flex items-center gap-2">
            <h2 className={`text-xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{profile.name || 'HSE Reporter'}</h2>
            {isSecureIdentity && (
                <div className="bg-emerald-500/20 text-emerald-500 p-1 rounded-md border border-emerald-500/30">
                    <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>
                </div>
            )}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-[0.4em] mt-1 ${isSecureIdentity ? 'text-emerald-500' : 'text-blue-500'}`}>Clearance {clearanceLevel}</span>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
             <h4 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>Identity Protocol</h4>
             {saveStatus === 'saved' && (
                <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 animate-in fade-in">Sync Complete</span>
             )}
          </div>
          
          <div className="space-y-4">
              <InputField 
                id="name" 
                label="Full Name" 
                value={profile.name} 
                onChange={handleFieldChange}
                placeholder="Name"
              />
              <InputField 
                id="role" 
                label="Designated Role" 
                value={profile.role} 
                onChange={handleFieldChange} 
                list={ROLES}
              />
              <InputField 
                id="site" 
                label="Primary Site" 
                value={profile.site || ''} 
                onChange={handleFieldChange} 
                list={SITES}
              />
          </div>
        </div>

        {/* System Controls */}
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>Biometric Lock</p>
              <p className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                {profile.webauthn_credential_id ? 'Native Scanner Enabled' : 'Native Scanner Disabled'}
              </p>
            </div>
            <button 
              type="button"
              onClick={handleToggleBiometrics}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                profile.webauthn_credential_id ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                profile.webauthn_credential_id ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>Interface Theme</p>
              <p className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                {theme === 'dark' ? 'Dark Protocol' : 'Standard Protocol'}
              </p>
            </div>
            <button 
              type="button"
              onClick={handleToggleTheme}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
            <div className="flex-1">
              <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>System Notifications</p>
              <p className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${
                notificationPermission === 'granted' ? 'text-emerald-500' : 'text-rose-400'
              }`}>
                {notificationPermission === 'granted' ? 'Alerts Optimized' : 'Alerts Restricted'}
              </p>
            </div>
            <button 
              type="button"
              onClick={handleTestNotification}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 active:scale-95 transition-all"
            >
              Allow notification
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={!hasChanges || isUploading || saveStatus === 'saving'}
          className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-2xl ${
            !hasChanges 
              ? `${isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-600'} cursor-not-allowed opacity-50`
              : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98] border border-blue-400/20'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            {saveStatus === 'saving' && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            <span className="text-[11px]">
              {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Identity Secured' : 'Save Changes'}
            </span>
          </div>
        </button>
      </form>

      <div className="pt-2 flex flex-col gap-3">
        <button 
          onClick={() => { localStorage.removeItem(PROFILE_KEY); window.location.reload(); }} 
          className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
            isLight ? 'text-slate-600 border-slate-200 hover:bg-slate-50' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
          }`}
        >
          Sign Out
        </button>

        {!showDeleteConfirm ? (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
              isLight ? 'text-rose-500 border-rose-200 hover:bg-rose-50' : 'text-rose-500/70 border-rose-500/20 hover:bg-rose-500/10'
            }`}
          >
            Purge Identity
          </button>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">
                  CRITICAL: All personal credentials and biometric locks will be erased permanently.
                </p>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                    isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteIdentity}
                  disabled={isDeleting}
                  className="flex-1 py-4 rounded-2xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 active:scale-95"
                >
                  {isDeleting ? 'Purging...' : 'Confirm Purge'}
                </button>
             </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
           <p className="text-rose-500 text-[8px] font-black uppercase text-center">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};
