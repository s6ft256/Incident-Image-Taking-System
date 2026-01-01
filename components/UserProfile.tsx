
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { updateProfile, deleteProfile } from '../services/profileService';
import { InputField } from './InputField';
import { ROLES, SITES, STORAGE_KEYS } from '../constants';
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
  
  const initialProfile = useRef<UserProfileType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';

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

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('light-mode', newTheme === 'light');
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(Notification.permission);
    if (granted) sendToast("Alerts Link Active", "success");
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaveStatus('saving');
    try {
      if (profile.id) {
        await updateProfile(profile.id, { 
          name: profile.name, role: profile.role, site: profile.site, email: profile.email
        });
      }
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      initialProfile.current = profile;
      setSaveStatus('saved');
      window.dispatchEvent(new Event('profileUpdated'));
      sendToast("Profile Updated", "success");
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setErrorMessage(err.message);
      setSaveStatus('error');
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
      sendToast("Photo Updated", "success");
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally { setIsUploading(false); }
  };

  const handleSignOut = () => {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    window.location.reload();
  };

  const handleDeleteIdentity = async () => {
    if (!profile.id) return;
    setIsDeleting(true);
    try {
      await deleteProfile(profile.id);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`backdrop-blur-3xl rounded-[2rem] border shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 max-h-[85vh] overflow-y-auto scrollbar-hide transition-all duration-300 ${
      isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a]/95 border-white/10'
    }`}>
      {/* Basic Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Profile Settings</h3>
        <button onClick={onBack} className="text-slate-500 hover:text-rose-500 p-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* User Header */}
      <div className="flex items-center gap-4 py-2">
        <div className="relative group shrink-0">
          <div className={`w-20 h-20 rounded-2xl border-2 overflow-hidden shadow-lg ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-white/10'}`}>
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-black text-blue-500">{profile.name?.charAt(0) || '?'}</div>
            )}
            {isUploading && <div className="absolute inset-0 bg-blue-600/20 animate-pulse" />}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-lg border-2 border-[#0f172a] text-white shadow-xl">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`text-xl font-black truncate tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{profile.name || 'User'}</h2>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest truncate">{profile.role || 'Personnel'}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Personal Details */}
        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] px-1">Account Info</p>
          <div className={`p-4 rounded-2xl space-y-4 ${isLight ? 'bg-slate-50 border border-slate-100' : 'bg-white/5 border border-white/5'}`}>
            <InputField id="name" label="Full Name" value={profile.name} onChange={handleFieldChange} />
            <InputField id="email" label="Work Email" value={profile.email || ''} onChange={handleFieldChange} />
            <div className="grid grid-cols-2 gap-3">
              <InputField id="role" label="Role" value={profile.role} onChange={handleFieldChange} list={ROLES} />
              <InputField id="site" label="Site" value={profile.site || ''} onChange={handleFieldChange} list={SITES} />
            </div>
          </div>
        </div>

        {/* System Preferences */}
        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] px-1">Preferences</p>
          <div className={`rounded-2xl divide-y ${isLight ? 'bg-slate-50 border border-slate-100 divide-slate-100' : 'bg-white/5 border border-white/5 divide-white/5'}`}>
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={handleToggleTheme}>
              <div>
                <p className={`text-[10px] font-black uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>Dark Mode</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase">Current: {theme}</p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-all ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${theme === 'dark' ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={handleEnableNotifications}>
              <div>
                <p className={`text-[10px] font-black uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>Notifications</p>
                <p className={`text-[8px] font-bold uppercase ${notificationPermission === 'granted' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {notificationPermission === 'granted' ? 'Active' : 'Disabled'}
                </p>
              </div>
              <div className={`w-10 h-6 rounded-full relative transition-all ${notificationPermission === 'granted' ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notificationPermission === 'granted' ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button 
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
              !hasChanges ? 'bg-slate-200 text-slate-400 opacity-50 cursor-not-allowed' : 'bg-blue-600 text-white shadow-lg'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Update Profile'}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleSignOut} className={`py-3 rounded-xl font-black uppercase text-[9px] border ${isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-400'}`}>Sign Out</button>
            <button onClick={() => setShowDeleteConfirm(true)} className={`py-3 rounded-xl font-black uppercase text-[9px] border ${isLight ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-900/10 border-rose-900/20 text-rose-500'}`}>Delete Identity</button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className={`w-full max-w-xs p-8 rounded-3xl border-2 text-center ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-rose-500/50'}`}>
            <h4 className="text-lg font-black uppercase text-rose-500 mb-2">Are you sure?</h4>
            <p className="text-[10px] font-bold text-slate-500 mb-8 uppercase leading-relaxed">This will permanently purge your identity from this terminal.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDeleteIdentity} disabled={isDeleting} className="w-full py-4 bg-rose-600 text-white font-black rounded-xl uppercase text-[10px]">{isDeleting ? 'Purging...' : 'Delete Permanently'}</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 font-black rounded-xl uppercase text-[10px] text-slate-500">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
