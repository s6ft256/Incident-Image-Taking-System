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

function App() {
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

  return (
    <div className={`min-h-screen transition-colors duration-300 main-app-container relative selection:bg-blue-500/30 overflow-x-hidden flex flex-col ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-white'}`}>
      {appTheme === 'dark' && <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/70 z-0 pointer-events-none"></div>}

      <div className="relative z-10 flex flex-col flex-grow">
        <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-sm'} ${view === 'auth' ? 'hidden' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-6 flex items-center justify-between gap-2 sm:gap-4">
             <div className="flex-1 flex justify-start">
               <img 
                 src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
                 alt="TGC Logo" 
                 className="h-8 w-auto sm:h-14 object-contain cursor-pointer"
                 onClick={() => setView('dashboard')}
               />
             </div>

             <div className="flex flex-[2] flex-col items-center text-center">
               <h1 className="text-3xl sm:text-6xl font-black tracking-tighter cursor-pointer" onClick={() => setView('dashboard')}>
                 <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span> <span className="text-blue-500">Guardian</span>
               </h1>
             </div>
             
             <div className="flex-1 flex justify-end items-center gap-2 sm:gap-3 relative">
               <button 
                onClick={() => setShowProfileCard(!showProfileCard)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-300 overflow-hidden flex items-center justify-center ${showProfileCard ? 'border-blue-400 ring-4 ring-blue-500/20' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
               >
                  {userProfile?.profileImageUrl ? <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="text-slate-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-6 sm:h-6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>}
               </button>

               {showProfileCard && (
                 <div className="absolute top-14 right-0 w-72 sm:w-80 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <UserProfile onBack={() => setShowProfileCard(false)} baseId={baseId} />
                 </div>
               )}
             </div>
          </div>
          
          {!isOnline && <div className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1">Offline Mode • Queued</div>}
        </header>

        <main className="max-w-7xl mx-auto px-4 pt-4 sm:pt-6 flex-grow w-full overflow-y-auto">
          {renderContent()}
        </main>

        <footer className={`py-6 px-4 flex flex-col items-center gap-4 mt-auto ${view === 'auth' ? 'hidden' : ''}`}>
           <div className="max-w-2xl text-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-1000">
              <p className={`text-xs sm:text-sm font-black italic leading-relaxed tracking-tight ${appTheme === 'dark' ? 'text-blue-400/80' : 'text-blue-600'}`}>
                {quote}
              </p>
              <div className="flex justify-center mt-2">
                 <div className="h-0.5 w-12 rounded-full bg-blue-500/30"></div>
              </div>
           </div>
           
           <div className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] opacity-60">© 2025 ELIUS256 • SAFETY FIRST</div>
        </footer>
      </div>

      {isLocked && userProfile && <BiometricLockModal profile={userProfile} appTheme={appTheme} onUnlock={() => setIsLocked(false)} onSwitchAccount={() => {localStorage.removeItem(PROFILE_KEY); window.location.reload();}} />}
      {showTutorial && !isLocked && <TutorialModal onClose={() => {localStorage.setItem(TUTORIAL_KEY, 'true'); setShowTutorial(false);}} appTheme={appTheme} />}
      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} appTheme={appTheme} />}
      
      {view !== 'auth' && (
        <>
          <button 
            onClick={() => setShowPolicy(true)}
            className={`fixed bottom-6 left-6 z-50 p-4 rounded-2xl border shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 ${
              appTheme === 'dark' 
                ? 'bg-slate-900/80 border-white/10 text-white backdrop-blur-md hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Policies</span>
          </button>

          <HSEAssistant appTheme={appTheme} />
          <FeedbackAssistant appTheme={appTheme} userName={userProfile?.name} />
        </>
      )}
    </div>
  );
}

export default App;