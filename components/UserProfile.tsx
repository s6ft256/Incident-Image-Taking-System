
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';
import { updateProfile } from '../services/profileService';
import { InputField } from './InputField';
import { getAllReports } from '../services/airtableService';
import { syncToGitHub } from '../services/githubService';

interface UserProfileProps {
  onBack: () => void;
  baseId: string;
}

const PROFILE_KEY = 'hse_guardian_profile';
const THEME_KEY = 'hse_guardian_theme';
const BYPASS_KEY = 'hse_guardian_bypass_sw';
const GITHUB_CONFIG_KEY = 'hse_guardian_github_config';

export const UserProfile: React.FC<UserProfileProps> = ({ onBack, baseId }) => {
  const [profile, setProfile] = useState<UserProfileType>({ name: '', role: '', site: '', profileImageUrl: '' });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // GitHub Integration State
  const [githubToken, setGithubToken] = useState(localStorage.getItem('gh_pat') || '');
  const [githubRepo, setGithubRepo] = useState('HSE-Guardian-Backup');
  const [githubUser, setGithubUser] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMsg, setSyncMsg] = useState('');

  const [isResetting, setIsResetting] = useState(false);
  const [swStatus, setSwStatus] = useState<'Running' | 'Bypassed' | 'None'>('None');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = theme === 'light';
  const isBypassed = localStorage.getItem(BYPASS_KEY) === 'true';

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        // Try to guess github user from name if not set
        if (!githubUser) setGithubUser(parsed.name.toLowerCase().replace(/\s/g, '-'));
      } catch (e) { console.error("Profile parse fail", e); }
    }

    const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light';
    if (savedTheme) { setTheme(savedTheme); applyTheme(savedTheme); }

    const checkSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (isBypassed) setSwStatus('Bypassed');
          else setSwStatus(regs.length > 0 ? 'Running' : 'None');
        } catch (e) {
          setSwStatus(isBypassed ? 'Bypassed' : 'None');
        }
      }
    };
    checkSW();
  }, [isBypassed]);

  const applyTheme = (t: 'dark' | 'light') => {
    if (t === 'light') { document.documentElement.classList.add('light-mode'); document.documentElement.classList.remove('dark'); }
    else { document.documentElement.classList.remove('light-mode'); document.documentElement.classList.add('dark'); }
  };

  const handleGitHubSync = async () => {
    if (!githubToken || !githubRepo || !githubUser) {
      setSyncMsg("GitHub Config incomplete.");
      setSyncStatus('error');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncMsg("Acquiring records...");

    try {
      const reports = await getAllReports({ baseId });
      setSyncMsg("Syncing to GitHub...");
      const link = await syncToGitHub(githubToken, githubRepo, githubUser, reports);
      localStorage.setItem('gh_pat', githubToken);
      setSyncStatus('success');
      setSyncMsg("Commit Successful.");
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMsg(err.message || "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceReset = async () => {
    setIsResetting(true);
    try {
      localStorage.setItem(BYPASS_KEY, 'true');
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) await registration.unregister();
      }
      const cacheNames = await caches.keys();
      for (let name of cacheNames) await caches.delete(name);
    } catch (err) {
      console.warn("Storage cleanup incomplete", err);
    } finally {
      window.location.reload();
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
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally { setIsUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      if (profile.id) await updateProfile(profile.id, { name: profile.name, role: profile.role, site: profile.site });
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

  return (
    <div className={`backdrop-blur-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col p-5 space-y-4 max-h-[85vh] overflow-y-auto scrollbar-hide ${
      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/95 border-white/10'
    }`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Security Profile</h3>
        <button onClick={onBack} className="text-slate-500 hover:text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex flex-col items-center py-2">
        <div className="relative mb-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 overflow-hidden shadow-2xl ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'
          }`}>
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full border-2 border-slate-900 text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <InputField id="name" label="Full Identity" value={profile.name} onChange={(e) => setProfile(p => ({...p, name: e.target.value}))} />
        <button type="submit" className="w-full bg-blue-600 text-white text-[10px] font-black py-4 rounded-xl uppercase tracking-widest">
          {saveStatus === 'saving' ? 'Syncing...' : 'Update Profile'}
        </button>
      </form>

      <div className={`p-4 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
         <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">GitHub Integrity</h4>
         <div className="space-y-3 mb-4">
            <input type="password" placeholder="GitHub Access Token" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className={`w-full p-3 rounded-xl border text-[10px] font-mono ${isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/5 text-white'}`} />
            <input type="text" placeholder="GitHub Username" value={githubUser} onChange={(e) => setGithubUser(e.target.value)} className={`w-full p-3 rounded-xl border text-[10px] ${isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/5 text-white'}`} />
            <input type="text" placeholder="Repo Name" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} className={`w-full p-3 rounded-xl border text-[10px] ${isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/5 text-white'}`} />
         </div>
         <button onClick={handleGitHubSync} disabled={isSyncing} className={`w-full py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
           isSyncing ? 'bg-slate-700 text-slate-500' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg'
         }`}>
           {isSyncing ? 'Syncing...' : 'Commit Changes to Git'}
         </button>
         {syncMsg && <p className={`text-[8px] font-black uppercase text-center mt-2 ${syncStatus === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>{syncMsg}</p>}
      </div>

      <div className={`p-4 rounded-2xl border ${isLight ? 'bg-rose-50 border-rose-100' : 'bg-rose-500/5 border-rose-500/10'}`}>
         <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">IDE Fix</h4>
         <button onClick={handleForceReset} disabled={isResetting || isBypassed} className="w-full py-4 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest transition-all">
           {isResetting ? 'Processing...' : isBypassed ? 'Gateway Unblocked' : 'Apply Gateway Fix'}
         </button>
      </div>

      <button onClick={() => {localStorage.removeItem(PROFILE_KEY); window.location.reload();}} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase border ${isLight ? 'text-slate-400 border-slate-200' : 'text-slate-600 border-white/5'}`}>Sign Out</button>
    </div>
  );
};
