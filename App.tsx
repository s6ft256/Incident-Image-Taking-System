
import React, { useState, useEffect } from 'react';
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
  const [view, setView] = useState<ViewState>('dashboard');
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
      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get('view') as ViewState;
      if (requestedView && ['create', 'recent', 'my-tasks', 'dashboard'].includes(requestedView)) {
        setView(requestedView);
      } else {
        setView('dashboard');
      }

      if (profile.webauthn_credential_id) {
        setIsLocked(true);
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

    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('themeChanged', handleThemeChange as EventListener);
    
    if (navigator.onLine) attemptSync();

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('themeChanged', handleThemeChange as EventListener);
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

  const isSpecialQuote = quote === "A safe workplace is everyone’s responsibility.";

  return (
    <div className={`min-h-screen transition-colors duration-300 main-app-container relative selection:bg-blue-500/30 overflow-x-hidden flex flex-col ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-white'}`}>
      {appTheme === 'dark' && <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/70 z-0 pointer-events-none"></div>}

      <div className="relative z-10 flex flex-col flex-grow">
        <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-sm'} ${view === 'auth' ? 'hidden' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between gap-2 sm:gap-4">
             {/* Company Info Card */}
             <div className="flex-1 flex justify-start">
               <div 
                 onClick={() => setView('dashboard')}
                 className={`group flex flex-col items-center p-2 sm:p-3 rounded-2xl border transition-all cursor-pointer ${appTheme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-sm'}`}
               >
                 <img 
                   src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
                   alt="TGC Logo" 
                   className="h-10 w-auto sm:h-16 object-contain transition-transform group-hover:scale-105"
                 />
                 <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest mt-1.5 ${appTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>TGC Group</span>
               </div>
             </div>

             {/* Main App Title */}
             <div className="flex flex-[2] flex-col items-center text-center">
               <h1 className="text-3xl sm:text-6xl font-black tracking-tighter cursor-pointer" onClick={() => setView('dashboard')}>
                 <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span> <span className="text-blue-500">Guardian</span>
               </h1>
             </div>
             
             {/* User Info Card */}
             <div className="flex-1 flex justify-end items-center relative">
               <div 
                onClick={() => setShowProfileCard(!showProfileCard)}
                className={`group flex flex-col items-center p-2 sm:p-3 rounded-2xl border transition-all cursor-pointer ${showProfileCard ? 'border-blue-400 ring-4 ring-blue-500/20 bg-blue-500/5' : (appTheme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-sm')}`}
               >
                  <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full border-2 transition-all overflow-hidden flex items-center justify-center ${showProfileCard ? 'border-blue-400' : 'border-slate-500'}`}>
                    {userProfile?.profileImageUrl ? (
                      <img src={userProfile.profileImageUrl} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-bold text-xs uppercase">
                        {userProfile?.name?.charAt(0) || 'H'}
                      </div>
                    )}
                  </div>
                  <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest mt-1.5 ${appTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {userProfile?.name?.split(' ')[0] || 'Profile'}
                  </span>
               </div>
               
               {showProfileCard && (
                 <div className="absolute top-full right-0 mt-4 w-80 z-50">
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
            <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] ${isSpecialQuote ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
              "{quote}"
            </div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">HSE Guardian © 2024</p>
          </div>
        </footer>
      </div>

      {view !== 'auth' && (
        <>
          {/* Grouped FAB Controls - Policies and AI Assistant */}
          <div className="fixed bottom-24 right-6 z-50 flex items-center gap-4 pointer-events-none">
            {/* Policies Trigger */}
            <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
              <button 
                onClick={() => setShowPolicy(true)}
                className={`w-14 h-14 rounded-full border shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center p-0 overflow-hidden ${
                  appTheme === 'dark' 
                    ? 'bg-slate-900 border-white/10 text-white' 
                    : 'bg-white border-slate-200 text-slate-700 shadow-slate-200 shadow-lg'
                }`}
              >
                <img 
                  src="data:image/png;base64,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" 
                  alt="Policies" 
                  className="w-full h-full object-cover"
                />
              </button>
              <span className={`text-[9px] font-black uppercase tracking-widest ${appTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Policies</span>
            </div>

            {/* AI Assistant FAB - Moved internal logic into horizontal group */}
            <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
              <HSEAssistant appTheme={appTheme} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${appTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>AI</span>
            </div>
          </div>

          <FeedbackAssistant appTheme={appTheme} userName={userProfile?.name} />
          
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
            <div className="fixed bottom-32 left-6 z-50 animate-in slide-in-from-bottom-10">
              <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">{syncCount} Reports Synced</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
