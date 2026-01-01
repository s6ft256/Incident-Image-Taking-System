
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { updateProfile, deleteProfile } from '../services/profileService';
import { InputField } from './InputField';
import { ROLES, SITES, STORAGE_KEYS, AUTHORIZED_ADMIN_ROLES } from '../constants';
import { requestNotificationPermission, sendToast } from '../services/notificationService';

interface UserProfileProps {
  onBack: () => void;
  baseId: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onBack, baseId }) => {
  const [profile, setProfile] = useState<UserProfileType>({ name: '', role: '', site: '', email: '', profileImageUrl: '' });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(Notification.permission);
  
  // Hold-to-Purge State
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const initialProfile = useRef<UserProfileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

  const isSecureIdentity = useMemo(() => {
    if (!profile.role) return false;
    return AUTHORIZED_ADMIN_ROLES.includes(profile.role.toLowerCase());
  }, [profile.role]);

  const clearanceLevel = useMemo(() => {
    return isSecureIdentity ? 'Level 2' : 'Level 1';
  }, [isSecureIdentity]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        initialProfile.current = parsed;
      } catch (e) { console.error("Profile parse fail", e); }
    }

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light';
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
      profile.site !== initialProfile.current.site ||
      profile.email !== initialProfile.current.email
    );
  }, [profile]);

  const emailNeedsSync = useMemo(() => {
    if (!initialProfile.current) return false;
    return profile.email !== initialProfile.current.email && profile.email?.includes('@');
  }, [profile.email]);

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
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasChanges) return;
    
    setSaveStatus('saving');
    try {
      if (profile.id) {
        await updateProfile(profile.id, { 
          name: profile.name, 
          role: profile.role, 
          site: profile.site,
          email: profile.email
        });
      }
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      initialProfile.current = profile;
      setSaveStatus('saved');
      window.dispatchEvent(new Event('profileUpdated'));
      sendToast("Supabase Identity Synced", "success");
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setErrorMessage(err.message);
      setSaveStatus('error');
      sendToast("Sync Failed", "warning");
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
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event('profileUpdated'));
      sendToast("Photo Verified", "success");
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally { setIsUploading(false); }
  };

  const handleSignOut = () => {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    window.location.reload();
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(Notification.permission);
    if (!granted) {
      setErrorMessage("Please enable notifications in your browser settings.");
    }
  };

  // Hold-to-Purge Logic
  const startHold = () => {
    if (isDeleting) return;
    setHoldProgress(0);
    
    progressIntervalRef.current = window.setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current!);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    holdTimerRef.current = window.setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(200);
      setShowDeleteConfirm(true);
    }, 2000);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setHoldProgress(0);
  };

  const handleDeleteIdentity = async () => {
    if (!profile.id) return;
    setIsDeleting(true);
    try {
      await deleteProfile(profile.id);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.LAST_USER);
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to purge identity.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`backdrop-blur-3xl rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 max-h-[85vh] overflow-y-auto scrollbar-hide form-container-glow ${
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
        <div className="relative mb-6">
          <div className={`w-40 h-40 rounded-full flex items-center justify-center border-2 overflow-hidden shadow-2xl transition-all duration-500 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-white/10 ring-8 ring-white/5'
          } ${isSecureIdentity ? 'ring-emerald-500/20' : ''}`}>
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="absolute bottom-2 right-2 bg-blue-600 p-3 rounded-full border-2 border-[#0f172a] text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
        <div className="flex items-center gap-2">
            <h2 className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{profile.name || 'HSE Reporter'}</h2>
            {isSecureIdentity && (
                <div className="bg-emerald-500/20 text-emerald-500 p-1.5 rounded-md border border-emerald-500/30">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>
                </div>
            )}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-[0.4em] mt-1 ${isSecureIdentity ? 'text-emerald-500' : 'text-blue-500'}`}>Clearance {clearanceLevel}</span>
      </div>

      <div className="space-y-6">
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[8px] font-black uppercase tracking-widest animate-in shake">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
             <h4 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>Identity Protocol</h4>
             {saveStatus === 'saved' && (
                <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 animate-in fade-in">Sync Complete</span>
             )}
          </div>
          
          <div className="space-y-4">
              <InputField id="name" label="Full Name" value={profile.name} onChange={handleFieldChange} placeholder="Name" />
              
              <div className="space-y-2">
                <InputField id="email" label="Company Email" value={profile.email || ''} onChange={handleFieldChange} placeholder="user@trojanholding.ae" autoComplete="email" />
                {emailNeedsSync && (
                  <button 
                    onClick={() => handleSave()}
                    className="w-full py-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2 animate-in slide-in-from-top-1"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>
                    Link Email to Supabase Profile
                  </button>
                )}
              </div>

              <InputField id="role" label="Designated Role" value={profile.role} onChange={handleFieldChange} list={ROLES} />
              <InputField id="site" label="Primary Site" value={profile.site || ''} onChange={handleFieldChange} list={SITES} />
          </div>
        </div>

        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border flex flex-col gap-3 transition-colors ${isLight ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/5 border-blue-500/20'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>Notification Protocol</p>
                <p className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${notificationPermission === 'granted' ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {notificationPermission === 'granted' ? 'Alerts Optimized' : 'Alerts Restricted'}
                </p>
              </div>
              {notificationPermission !== 'granted' && (
                <button 
                  type="button"
                  onClick={handleEnableNotifications}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-500 active:scale-95 transition-all shadow-md"
                >
                  Enable
                </button>
              )}
              {notificationPermission === 'granted' && (
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="text-[8px] font-black uppercase tracking-widest">Active</span>
                </div>
              )}
            </div>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>Interface Theme</p>
              <p className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                {theme === 'dark' ? 'Dark Protocol' : 'Standard Protocol'}
              </p>
            </div>
            <button 
              type="button" 
              onClick={handleToggleTheme}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            type="button" 
            onClick={() => handleSave()}
            disabled={!hasChanges || isUploading || saveStatus === 'saving'}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 shadow-2xl ${
              !hasChanges 
                ? `${isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-600'} cursor-not-allowed opacity-50`
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98] border border-blue-400/20'
            }`}
          >
            <span className="text-[11px]">{saveStatus === 'saving' ? 'Syncing...' : 'Save All Changes'}</span>
          </button>

          <button 
            type="button" 
            onClick={handleSignOut}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 border ${
              isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="text-[10px]">Sign Out</span>
          </button>

          <div className="pt-4 border-t border-white/5 mt-4">
             <div className="relative group">
                <button 
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  className={`relative w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] transition-all overflow-hidden border-2 ${
                    isLight ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-950/20 border-rose-500/30 text-rose-500'
                  }`}
                >
                  <div 
                    className="absolute inset-y-0 left-0 bg-rose-500 opacity-20 transition-all duration-100 ease-linear"
                    style={{ width: `${holdProgress}%` }}
                  ></div>
                  <span className="relative z-10">
                    {holdProgress > 0 ? `Authorizing: ${holdProgress}%` : 'Hold to Purge Identity'}
                  </span>
                </button>
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest text-center mt-3">
                  Safety Protocol: Long-press 2s to initiate permanent record destruction
                </p>
             </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
           <div className={`w-full max-w-xs p-10 rounded-[3rem] border-2 text-center shadow-[0_0_50px_rgba(225,29,72,0.4)] ${isLight ? 'bg-white border-rose-200' : 'bg-slate-900 border-rose-500/50'}`}>
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center mx-auto mb-8 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.2)]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-500"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </div>
              <h4 className={`text-xl font-black uppercase tracking-tighter mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>Purge Protocol</h4>
              <p className="text-[10px] text-rose-400 mb-10 uppercase font-black leading-relaxed tracking-widest">
                Identity destruction initiated. This action will permanently disconnect this terminal from the HSE grid.
              </p>
              <div className="flex flex-col gap-4">
                 <button onClick={handleDeleteIdentity} disabled={isDeleting} className="w-full py-5 bg-rose-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.3em] hover:bg-rose-500 transition-all shadow-xl active:scale-95">
                   {isDeleting ? 'PURGING...' : 'CONFIRM PURGE'}
                 </button>
                 <button onClick={() => { setShowDeleteConfirm(false); setHoldProgress(0); }} className={`w-full py-5 font-black rounded-2xl uppercase text-[10px] tracking-widest transition-all ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                   ABORT TRANSMISSION
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
