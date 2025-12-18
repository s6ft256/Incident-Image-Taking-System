import React, { useState, useEffect, useRef } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';

interface UserProfileProps {
  onBack: () => void;
}

const PROFILE_KEY = 'hse_guardian_profile';
const THEME_KEY = 'hse_guardian_theme';

export const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const [profile, setProfile] = useState<UserProfileType>({ name: '', role: '', profileImageUrl: '' });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) try { setProfile(JSON.parse(saved)); } catch (e) {}
    const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const publicUrl = await uploadImageToStorage(compressed, 'profiles');
      setProfile(prev => ({ ...prev, profileImageUrl: publicUrl }));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed.");
    } finally { setIsUploading(false); }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setTimeout(() => {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(THEME_KEY, theme);
      setSaveStatus('saved');
      window.dispatchEvent(new Event('profileUpdated'));
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 400);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <div className="bg-white dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Settings</h3>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative mb-3">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full border border-white dark:border-slate-900 shadow-md">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <input type="text" value={profile.name} onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))} placeholder="Name" className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white w-full outline-none focus:border-blue-500" />
          <input type="text" value={profile.role} onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))} placeholder="Safety Role" className="bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white w-full outline-none focus:border-blue-500" />
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-lg">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dark Mode</span>
          <button type="button" onClick={toggleTheme} className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-4.5' : 'left-0.5'}`}></div></button>
        </div>
        <button type="submit" className="w-full text-[10px] font-black py-2.5 rounded-lg shadow-lg bg-blue-600 text-white uppercase tracking-widest active:scale-95 transition-all">{saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}</button>
      </form>
    </div>
  );
};