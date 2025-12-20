
import React, { useState, useEffect, useRef } from 'react';
import { AIRTABLE_CONFIG, SAFETY_QUOTES } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { AuthScreen } from './components/AuthScreen';
import { TutorialModal } from './components/TutorialModal';
import { BiometricLockModal } from './components/BiometricLockModal';
import { HSEAssistant } from './components/HSEAssistant';
import { FeedbackAssistant } from './components/FeedbackAssistant';
import { PolicyModal } from './components/PolicyModal';
import { syncOfflineReports } from './services/syncService';
import { UserProfile as UserProfileType } from './types';

type ViewState = 'dashboard' | 'create' | 'recent' | 'auth' | 'my-tasks';

const PROFILE_KEY = 'hse_guardian_profile';
const THEME_KEY = 'hse_guardian_theme';
const TUTORIAL_KEY = 'hse_guardian_tutorial_seen';

export default function App() {
  const [view, setView] = useState<ViewState>('auth'); // Default to auth to ensure login prompt
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [baseId, setBaseId] = useState(AIRTABLE_CONFIG.BASE_ID);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  const [quote, setQuote] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);

  const loadProfile = () => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUserProfile(parsed);
        return parsed;
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    }
    return null;
  };

  const applyTheme = (t: 'dark' | 'light') => {
    if (t === 'light') {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
  };

  useEffect(() => {
    setQuote(SAFETY_QUOTES[Math.floor(Math.random() * SAFETY_QUOTES.length)]);
    const profile = loadProfile();
    
    if (!profile) {
      setView('auth');
    } else {
      // Even if profile exists, we stay on 'auth' view or force 'isLocked'
      // If biometrics are enabled, force the lock modal.
      if (profile.webauthn_credential_id) {
        setIsLocked(true);
        setView('dashboard'); // Content is blurred behind modal
      } else {
        // If no biometrics but profile exists, we still prompt login for security
        setView('auth');
      }

      const tutorialSeen = localStorage.getItem(TUTORIAL_KEY);
      if (!tutorialSeen) {
        setShowTutorial(true);
      }
    }
    setIsInitialized(true);

    const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light';
    if (savedTheme) {
      setAppTheme(savedTheme);
      applyTheme(savedTheme);
    }

    const handleStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) attemptSync();
    };

    const handleProfileUpdate = () => loadProfile();
    const handleThemeChange = (e: any) => {
      const newTheme = e.detail;
      setAppTheme(newTheme);
      applyTheme(newTheme);
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsFabVisible(false);
        setIsMenuOpen(false); 
      } else {
        setIsFabVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (profileCardRef.current && !profileCardRef.current.contains(event.target as Node)) {
        setShowProfileCard(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('themeChanged', handleThemeChange as EventListener);
    document.addEventListener('mousedown', handleClickOutside);
    
    if (navigator.onLine) attemptSync();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('themeChanged', handleThemeChange as EventListener);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [baseId]);

  const attemptSync = async () => {
    try {
        const count = await syncOfflineReports(baseId);
        if (count > 0) {
            setSyncCount(count);
            setTimeout(() => setSyncCount(0), 5000);
        }
    } catch (e) {
        console.error("Auto-sync failed", e);
    }
  };

  const handleAuthComplete = (profile: UserProfileType) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setUserProfile(profile);
    setView('dashboard');
    setIsLocked(false);
    const tutorialSeen = localStorage.getItem(TUTORIAL_KEY);
    if (!tutorialSeen) setShowTutorial(true);
  };

  const renderContent = () => {
    if (view === 'auth') return <AuthScreen onAuthComplete={handleAuthComplete} appTheme={appTheme} />;
    switch (view) {
      case 'create': return <CreateReportForm baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'recent': return <RecentReports baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'my-tasks': return <RecentReports baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} filterAssignee={userProfile?.name} />;
      default: return <Dashboard baseId={baseId} appTheme={appTheme} onNavigate={(target) => setView(target)} />;
    }
  };

  if (!isInitialized) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 main-app-container relative selection:bg-blue-500/30 overflow-x-hidden flex flex-col ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-white'}`}>
      {appTheme === 'dark' && <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/70 z-0 pointer-events-none"></div>}

      <div className="relative z-10 flex flex-col flex-grow">
        <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-sm'} ${view === 'auth' ? 'hidden' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between gap-2 sm:gap-4">
             <div className="flex-1 flex justify-start">
               <div 
                 onClick={() => setView('dashboard')}
                 className="group flex flex-col items-center transition-all cursor-pointer"
               >
                 <img 
                   src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
                   alt="TGC Logo" 
                   className="h-16 w-auto sm:h-28 object-contain transition-transform group-hover:scale-105"
                 />
                 <span className={`text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] mt-2 ${appTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>TGC Group</span>
               </div>
             </div>

             <div className="flex flex-[2] flex-col items-center text-center">
               <div className="flex flex-col items-center">
                 <h1 className="text-3xl sm:text-7xl font-black tracking-tighter cursor-pointer" onClick={() => setView('dashboard')}>
                   <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span> <span className="text-blue-500">Guardian</span>
                 </h1>
                 <div className="h-1.5 w-full bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,1)] mt-2 sm:mt-3"></div>
               </div>
             </div>
             
             <div className="flex-1 flex justify-end items-center relative" ref={profileCardRef}>
               <div 
                onClick={() => setShowProfileCard(!showProfileCard)}
                className={`group flex flex-col items-center transition-all cursor-pointer ${showProfileCard ? 'scale-105' : ''}`}
               >
                  <div className={`w-16 h-16 sm:w-28 sm:h-28 rounded-full transition-all overflow-hidden flex items-center justify-center ${showProfileCard ? 'ring-4 ring-blue-500/50' : ''}`}>
                    {userProfile?.profileImageUrl ? (
                      <img src={userProfile.profileImageUrl} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-xl uppercase">
                        {userProfile?.name?.charAt(0) || 'H'}
                      </div>
                    )}
                  </div>
                  <span className={`text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] mt-2 ${appTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {userProfile?.name?.split(' ')[0] || 'Profile'}
                  </span>
               </div>
               
               {showProfileCard && (
                 <div className="absolute top-full right-0 mt-4 w-80 z-50 animate-in fade-in slide-in-from-top-2">
                   <UserProfile onBack={() => setShowProfileCard(false)} baseId={baseId} />
                 </div>
               )}
             </div>
          </div>
        </header>

        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
          {renderContent()}
        </main>

        <footer className={`py-8 px-4 border-t text-center ${appTheme === 'dark' ? 'bg-slate-950/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
            <div className={`px-6 py-3 rounded-full border-2 border-red-600/60 bg-red-600/5 text-[10px] font-black uppercase tracking-[0.3em] text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]`}>
              "{quote}"
            </div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">@ ELIUS 2025 . SAFETY FIRST</p>
          </div>
        </footer>
      </div>

      {view !== 'auth' && (
        <div 
          ref={menuRef}
          className={`fixed bottom-6 right-6 z-50 flex flex-row-reverse items-center gap-3 transition-transform duration-500 ${isFabVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}
        >
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-2xl transition-all duration-150 flex items-center justify-center group pointer-events-auto border-2 shrink-0 active:scale-90 ${
              isMenuOpen 
                ? 'bg-rose-600 border-rose-400 rotate-90 text-white' 
                : `${appTheme === 'dark' ? 'bg-blue-600/90 border-blue-400 backdrop-blur-md' : 'bg-blue-600 border-blue-400 shadow-blue-500/40'} text-white`
            }`}
          >
            {isMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <div className="flex flex-col gap-0.5 items-center">
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
              </div>
            )}
            
            {!isMenuOpen && syncCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] font-bold text-white items-center justify-center border border-white">
                  !
                </span>
              </span>
            )}
          </button>

          <div className={`flex flex-row-reverse items-center gap-3 transition-all duration-200 origin-right ${isMenuOpen ? 'scale-100 opacity-100 translate-x-0' : 'scale-75 opacity-0 pointer-events-none translate-x-8'}`}>
            <div className="flex flex-col items-center gap-1 group">
              <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border shadow-sm transition-all duration-300 ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${appTheme === 'dark' ? 'bg-slate-800 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>Feed</span>
              <div className="pointer-events-auto">
                <FeedbackAssistant appTheme={appTheme} userName={userProfile?.name} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 group">
              <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border shadow-sm transition-all duration-300 ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${appTheme === 'dark' ? 'bg-slate-800 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>Assistant</span>
              <div className="pointer-events-auto">
                <HSEAssistant appTheme={appTheme} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 group">
              <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border shadow-sm transition-all duration-300 ${isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} ${appTheme === 'dark' ? 'bg-slate-800 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>Policies</span>
              <button 
                onClick={() => { setShowPolicy(true); setIsMenuOpen(false); }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border shadow-2xl hover:scale-105 active:scale-90 transition-all flex items-center justify-center p-0 overflow-hidden ${
                  appTheme === 'dark' 
                    ? 'bg-gradient-to-tr from-slate-800 to-slate-700 border-white/10 text-white' 
                    : 'bg-white border-slate-200 text-slate-700 shadow-slate-200 shadow-lg'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                   <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {showTutorial && <TutorialModal onClose={() => {
        localStorage.setItem(TUTORIAL_KEY, 'true');
        setShowTutorial(false);
      }} appTheme={appTheme} />}
      
      {isLocked && userProfile && (
        <BiometricLockModal 
          profile={userProfile} 
          onUnlock={() => setIsLocked(false)} 
          onSwitchAccount={() => {
            localStorage.removeItem(PROFILE_KEY);
            window.location.reload();
          }} 
          appTheme={appTheme}
        />
      )}

      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} appTheme={appTheme} />}

      {syncCount > 0 && (
        <div className="fixed bottom-32 right-6 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">{syncCount} Reports Synced</span>
          </div>
        </div>
      )}
    </div>
  );
}
