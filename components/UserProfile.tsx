
import React, { useState, useEffect, useRef } from 'react';
import { InputField } from './InputField';
import { ROLES } from '../constants';
import { UserProfile as UserProfileType } from '../types';
import { uploadImageToStorage } from '../services/storageService';
import { compressImage } from '../utils/imageCompression';

interface UserProfileProps {
  onBack: () => void;
}

const PROFILE_KEY = 'hse_guardian_profile';

export const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const [profile, setProfile] = useState<UserProfileType>({ name: '', role: '', profileImageUrl: '' });
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
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage('');
    
    try {
      // Compress for faster profile loading
      const compressed = await compressImage(file);
      // Upload to Supabase storage in a dedicated 'profiles' folder
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
      setSaveStatus('saved');
      // Notify App to refresh its profile view
      window.dispatchEvent(new Event('profileUpdated'));
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 600);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear your local profile? This removes your saved credentials from this device.")) {
      localStorage.removeItem(PROFILE_KEY);
      setProfile({ name: '', role: '', profileImageUrl: '' });
      window.dispatchEvent(new Event('profileUpdated'));
    }
  };

  return (
    <div className="animate-in slide-in-from-right duration-500 pb-20">
      <div className="mb-8 relative h-64 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 bg-slate-800 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-emerald-600/20"></div>
        
        <button onClick={onBack} className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-xl border border-white/20 transition-all z-20">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div className="flex flex-col items-center relative z-10">
          <div className="relative group">
            <div className="w-28 h-28 bg-slate-700 rounded-full flex items-center justify-center mb-3 shadow-2xl border-4 border-slate-900 overflow-hidden ring-4 ring-blue-500/10">
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              
              {isUploading && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-2 right-0 bg-blue-500 hover:bg-blue-400 text-white p-2 rounded-full border-2 border-slate-900 shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
              title="Change Profile Picture"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{profile.name || 'HSE Reporter'}</h2>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">{profile.role || 'Unspecified Role'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 space-y-6 shadow-2xl">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Personal Details</h2>
          
          <InputField 
            id="name" 
            label="Default Full Name" 
            value={profile.name} 
            onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))} 
            required 
            placeholder="e.g. John Doe" 
          />
          
          <InputField 
            id="role" 
            label="Default Safety Role" 
            value={profile.role} 
            onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))} 
            type="select"
            options={ROLES}
            required 
          />

          <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
            * These details pre-fill reports to save you time in high-risk zones. Profile photos are stored on the secure HSE evidence cloud.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-200 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            type="submit"
            disabled={saveStatus === 'saving' || isUploading}
            className={`w-full font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-[0.98] uppercase tracking-widest text-lg flex items-center justify-center gap-3 ${
              saveStatus === 'saved' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Updating...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                Settings Saved
              </>
            ) : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="w-full bg-transparent hover:bg-red-500/10 text-red-400 font-bold py-4 rounded-2xl transition-all border border-red-500/20 uppercase text-xs tracking-widest"
          >
            Clear Local Data
          </button>
        </div>
      </form>
    </div>
  );
};
