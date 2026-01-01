
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

  const serviceId = useMemo(() => {
    if (!profile.name) return 'UNASSIGNED';
    const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const hash = profile.name.length + (profile.role?.length || 0);
    return `HSE-${initials}-${hash}0X`;
  }, [profile.name, profile.role]);

  const isSecureIdentity = useMemo(() => {
    if (!profile.role) return false;
    return AUTHORIZED_ADMIN_ROLES.includes(profile.role.toLowerCase());
  }, [profile.role]);

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

  /**
   * Fix: Added missing handleEnableNotifications function to request
   * browser notification permissions and update visual state.
   */
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(Notification.permission);
    if (granted) {
      sendToast("Alert Broadcast Link Established", "success");
    } else {
      sendToast("Broadcast Restricted by Browser", "warning");
    }
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
      sendToast("Service Identity Updated", "success");
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setErrorMessage(err.message);
      setSaveStatus('error');
      sendToast("Database Commit Failed", "warning");
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
      sendToast("Bio-Visual Match Verified", "success");
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed.");
    } finally { setIsUploading(false); }
  };

  const handleSignOut = () => {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    window.location.reload();
  };

  const startHold = () => {
    if (isDeleting) return;
    setHoldProgress(0);
    progressIntervalRef.current = window.setInterval(() => {
      setHoldProgress(prev => Math.min(prev + 5, 100));
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
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={`backdrop-blur-3xl rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col p-6 space-y-8 max-h-[85vh] overflow-y-auto scrollbar-hide form-container-glow transition-all duration-500 ${
      isLight ? 'bg-white/95 border-slate-200' : 'bg-[#0f172a]/95 border-white/10'
    }`}>
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .signature-font { font-family: 'Dancing Script', cursive, serif; }
        .service-scan {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.4), transparent);
          height: 20%;
          width: 100%;
          animation: scanline 3s linear infinite;
          pointer-events: none;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex flex-col">
          <h3 className={`text-[11px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Identity Management</h3>
          <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Secure Personnel Node</span>
        </div>
        <button onClick={onBack} className="text-slate-500 hover:text-white transition-colors p-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* TACTICAL SERVICE ID CARD */}
      <div className={`relative p-6 rounded-3xl border-2 overflow-hidden transition-all duration-500 group ${
        isSecureIdentity 
          ? 'border-emerald-500/30 bg-emerald-500/5' 
          : 'border-blue-500/20 bg-blue-500/5'
      }`}>
         <div className="absolute top-0 right-0 p-4">
            <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor] ${isSecureIdentity ? 'text-emerald-500 bg-emerald-500' : 'text-blue-500 bg-blue-500'}`}></div>
         </div>

         <div className="flex items-center gap-6 relative z-10">
            <div className="relative group/avatar">
              <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center border-2 overflow-hidden shadow-2xl transition-all duration-700 ${
                isLight ? 'bg-slate-100 border-white shadow-slate-200' : 'bg-slate-900 border-white/10 ring-4 ring-white/5'
              }`}>
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl font-black text-blue-500 opacity-40">{profile.name?.charAt(0) || '?'}</span>
                  </div>
                )}
                {isUploading && <div className="service-scan"></div>}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="absolute -bottom-2 -right-2 bg-blue-600 p-2.5 rounded-xl border-2 border-[#0f172a] text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            </div>

            <div className="flex-1 min-w-0">
               <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Service Number</span>
               <h4 className="text-xs font-mono font-black text-blue-500 mb-2">{serviceId}</h4>
               <h2 className={`text-xl font-black truncate leading-tight tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                 {profile.name || 'Anonymous Operator'}
               </h2>
               <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${isSecureIdentity ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                    {profile.role || 'Unspecified'}
                  </span>
                  <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                    {profile.site || 'Global Dispatch'}
                  </span>
               </div>
            </div>
         </div>
      </div>

      <div className="space-y-6">
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[8px] font-black uppercase tracking-widest animate-in shake">
            System Alert: {errorMessage}
          </div>
        )}

        {/* BLOCK 1: CORE DOSSIER */}
        <div className="space-y-4">
           <div className="flex items-center gap-3 px-1">
              <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Core Dossier</h4>
           </div>
           <div className={`p-6 rounded-[2rem] border space-y-5 ${isLight ? 'bg-slate-50/50' : 'bg-black/20 border-white/5'}`}>
              <InputField id="name" label="Personnel Identity" value={profile.name} onChange={handleFieldChange} placeholder="Full Name" />
              <InputField id="email" label="Communications Link" value={profile.email || ''} onChange={handleFieldChange} placeholder="user@trojanholding.ae" />
              <div className="grid grid-cols-2 gap-4">
                <InputField id="role" label="Service Rank" value={profile.role} onChange={handleFieldChange} list={ROLES} />
                <InputField id="site" label="Grid Location" value={profile.site || ''} onChange={handleFieldChange} list={SITES} />
              </div>
           </div>
        </div>

        {/* BLOCK 2: AUTHORIZED SIGNATURE */}
        <div className="space-y-4">
           <div className="flex items-center gap-3 px-1">
              <div className="h-4 w-1 bg-emerald-600 rounded-full"></div>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Authorized Signature</h4>
           </div>
           <div className={`p-6 rounded-[2rem] border transition-all ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10 shadow-inner'}`}>
              <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">E-Signature Preview</span>
                 <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                    <div className="w-1 h-1 rounded-full bg-emerald-500/40"></div>
                 </div>
              </div>
              <div className="h-16 flex items-center justify-center border border-dashed border-emerald-500/20 rounded-xl bg-emerald-500/[0.02]">
                 <span className="signature-font text-2xl text-emerald-500 opacity-80 pointer-events-none">
                    {profile.name || 'Your Signature'}
                 </span>
              </div>
              <p className="text-[6px] font-black text-slate-600 uppercase tracking-widest text-center mt-3">Used for automated report validation and RA authorization</p>
           </div>
        </div>

        {/* BLOCK 3: SYSTEM PROTOCOLS */}
        <div className="space-y-4">
           <div className="flex items-center gap-3 px-1">
              <div className="h-4 w-1 bg-amber-600 rounded-full"></div>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>System Protocols</h4>
           </div>
           <div className={`p-4 rounded-[2rem] border space-y-2 ${isLight ? 'bg-slate-50/50' : 'bg-black/20 border-white/5'}`}>
              <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer" onClick={handleEnableNotifications}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>Alerts Broadcast</p>
                  <p className={`text-[8px] font-bold uppercase mt-1 ${notificationPermission === 'granted' ? 'text-emerald-500' : 'text-rose-400'}`}>
                    {notificationPermission === 'granted' ? 'Real-time Link Active' : 'Broadcast Restricted'}
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-all ${notificationPermission === 'granted' ? 'bg-emerald-600 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notificationPermission === 'granted' ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer" onClick={handleToggleTheme}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>Interface Protocol</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Current: {theme === 'dark' ? 'Dark Matrix' : 'Standard Flux'}</p>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-all bg-blue-600 shadow-[0_0_8px_#3b82f6]`}>
                   <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${theme === 'dark' ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>
           </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
          <button 
            type="button" 
            onClick={() => handleSave()}
            disabled={!hasChanges || isUploading || saveStatus === 'saving'}
            className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.3em] transition-all duration-300 shadow-2xl relative overflow-hidden ${
              !hasChanges 
                ? `${isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-slate-600'} opacity-50`
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98] border border-blue-400/20'
            }`}
          >
            {saveStatus === 'saving' && <div className="service-scan"></div>}
            <span className="text-[11px] relative z-10">{saveStatus === 'saving' ? 'Committing Data...' : 'Confirm Global Sync'}</span>
          </button>

          <button 
            type="button" 
            onClick={handleSignOut}
            className={`w-full py-4 rounded-[1.5rem] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 border ${
              isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span className="text-[10px]">Disconnect Session</span>
          </button>

          <div className="pt-6 mt-4">
             <div className="relative group">
                <button 
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  className={`relative w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[10px] transition-all overflow-hidden border-2 ${
                    isLight ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-950/20 border-rose-500/30 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                  }`}
                >
                  <div 
                    className="absolute inset-y-0 left-0 bg-rose-500 opacity-20 transition-all duration-100 ease-linear"
                    style={{ width: `${holdProgress}%` }}
                  ></div>
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    {holdProgress > 0 ? `Authorizing Purge: ${holdProgress}%` : 'Initiate Identity Purge'}
                  </span>
                </button>
             </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl animate-in fade-in duration-300">
           <div className={`w-full max-w-xs p-10 rounded-[3rem] border-2 text-center shadow-[0_0_80px_rgba(225,29,72,0.4)] ${isLight ? 'bg-white border-rose-200' : 'bg-slate-900 border-rose-500/50'}`}>
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center mx-auto mb-8 animate-pulse shadow-[0_0_30px_rgba(225,29,72,0.3)]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-500"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h4 className={`text-xl font-black uppercase tracking-tighter mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>DESTRUCTION PROTOCOL</h4>
              <p className="text-[10px] text-rose-400 mb-10 uppercase font-black leading-relaxed tracking-widest">
                Identity destruction authorized. All local caching and terminal links will be permanently severed.
              </p>
              <div className="flex flex-col gap-4">
                 <button onClick={handleDeleteIdentity} disabled={isDeleting} className="w-full py-5 bg-rose-600 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.3em] hover:bg-rose-500 transition-all shadow-xl active:scale-95">
                   {isDeleting ? 'PURGING NODE...' : 'EXECUTE PURGE'}
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
