
import React, { useState, useEffect, useRef } from 'react';
import { InputField } from './InputField';
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage('');
    
    try {
      const compressed = await compressImage(file);
      const publicUrl = await uploadImageToStorage(compressed, 'profiles');
      setProfile(prev => ({ ...prev, profileImageUrl: publicUrl }));
    } catch (err: any) {
      console.error("Image upload failed", err);
      setErrorMessage(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
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
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 600);
  };

  const handleClear = () => {
    if (window.confirm("Clear all local profile data?")) {
      localStorage.removeItem(PROFILE_KEY);
      setProfile({ name: '', role: '', profileImageUrl: '' });
      window.dispatchEvent(new Event('profileUpdated'));
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    // Persist immediately for responsiveness
    localStorage.setItem(THEME_KEY, newTheme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-10 max-w-lg mx-auto">
      {/* Smaller Compact Header */}
      <div className="mb-6 relative h-48 rounded-[2rem] overflow-hidden shadow-xl border border-white/10 bg-slate-800 flex items-center justify-center transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-emerald-600/10"></div>
        
        <button onClick={onBack} className="absolute top-4 left-4 bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl backdrop-blur-xl border border-white/10 transition-all z-20">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div className="flex flex-col items-center relative z-10 pt-2">
          <div className="relative group">
            <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-2 shadow-2xl border-4 border-slate-900 overflow-hidden ring-4 ring-blue-500/10 transition-all">
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-1 right-0 bg-blue-500 hover:bg-blue-400 text-white p-1.5 rounded-full border-2 border-slate-900 shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">{profile.name || 'HSE Reporter'}</h2>
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">{profile.role || 'Unspecified'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Identity Details Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-[1.5rem] border border-white/10 p-5 space-y-4 shadow-xl card-bg transition-colors duration-300">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">Identity Details</h2>
          
          <InputField 
            id="name" 
            label="Full Name" 
            value={profile.name} 
            onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))} 
            required 
            placeholder="e.g. John Doe" 
          />
          
          <InputField 
            id="role" 
            label="Safety Role" 
            value={profile.role} 
            onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))} 
            required 
            placeholder="e.g. Lead Safety Supervisor"
          />
        </div>

        {/* Preferences Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-[1.5rem] border border-white/10 p-5 space-y-4 shadow-xl card-bg transition-colors duration-300">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">App Preferences</h2>
          
          <div className="flex items-center justify-between py-1">
            <div 
              className="flex flex-col cursor-pointer select-none group/theme" 
              onClick={toggleTheme}
            >
              <span className="text-sm font-semibold text-slate-200 theme-text-primary group-hover/theme:text-blue-400 transition-colors">Interface Theme</span>
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{theme} Mode Active</span>
            </div>
            
            <button 
              type="button"
              onClick={toggleTheme}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 p-1 flex items-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-blue-600'}`}
            >
              <div className={`w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-0 bg-slate-700' : 'translate-x-6 bg-white'}`}>
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                )}
              </div>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-200 p-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={saveStatus === 'saving' || isUploading}
            className={`w-full font-black py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center gap-3 ${
              saveStatus === 'saved' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {saveStatus === 'saving' ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : saveStatus === 'saved' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
            {saveStatus === 'saving' ? 'Updating...' : saveStatus === 'saved' ? 'Settings Saved' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="w-full bg-transparent hover:bg-red-500/5 text-red-400 font-bold py-3 rounded-xl transition-all border border-red-500/10 uppercase text-[10px] tracking-widest"
          >
            Reset Local Profile
          </button>
        </div>
      </form>
    </div>
  );
};
