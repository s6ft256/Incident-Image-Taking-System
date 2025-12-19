
import React, { useState, useEffect } from 'react';
import { AIRTABLE_CONFIG, SAFETY_QUOTES } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { AuthScreen } from './components/AuthScreen';
import { TutorialModal } from './components/TutorialModal';
import { syncOfflineReports } from './services/syncService';
import { UserProfile as UserProfileType } from './types';

type ViewState = 'dashboard' | 'create' | 'recent' | 'auth';

const PROFILE_KEY = 'hse_guardian_profile';
const THEME_KEY = 'hse_guardian_theme';
const TUTORIAL_KEY = 'hse_guardian_tutorial_seen';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [baseId, setBaseId] = useState(AIRTABLE_CONFIG.BASE_ID);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  const [quote, setQuote] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const needsConfig = baseId.includes('YourBaseId') || !baseId;

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
      setView('dashboard');
      // Check if tutorial was already seen
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
      if (online) {
        attemptSync();
      }
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
    
    if (navigator.onLine) {
        attemptSync();
    }

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
    
    // Check if tutorial should be shown for this specific session login
    const tutorialSeen = localStorage.getItem(TUTORIAL_KEY);
    if (!tutorialSeen) {
      setShowTutorial(true);
    }
  };

  const handleCloseTutorial = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    setShowTutorial(false);
  };

  const renderContent = () => {
    if (view === 'auth') {
      return <AuthScreen onAuthComplete={handleAuthComplete} appTheme={appTheme} />;
    }

    switch (view) {
      case 'create':
        return <CreateReportForm baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'recent':
        return <RecentReports baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard baseId={baseId} appTheme={appTheme} onNavigate={(target) => setView(target)} />;
    }
  };

  if (!isInitialized) return null;

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 main-app-container relative selection:bg-blue-500/30 overflow-x-hidden ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-white'}`}
    >
      {appTheme === 'dark' && <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/70 z-0 pointer-events-none"></div>}

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-sm'} ${view === 'auth' ? 'hidden' : ''}`}>
          <div className="max-w-7xl mx-auto px-6 py-6 sm:py-10 flex items-center justify-between gap-2 sm:gap-6">
             <div className="flex-1 flex justify-start">
               <div className="flex flex-col items-center">
                 <img 
                   src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
                   alt="TGC Logo" 
                   className="h-12 w-auto sm:h-20 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:scale-110 transition-all cursor-pointer"
                   onClick={() => setView('dashboard')}
                 />
                 <span className={`hidden lg:block text-[8px] font-black uppercase tracking-widest mt-1 opacity-80 ${appTheme === 'dark' ? 'text-amber-500' : 'text-slate-600'}`}>General Contracting</span>
               </div>
             </div>

             <div className="flex-[3] sm:flex-[4] flex flex-col items-center">
               <div className="flex flex-col items-center text-center">
                 <h1 
                   className="text-2xl sm:text-5xl font-black tracking-tighter drop-shadow-2xl cursor-pointer transition-transform active:scale-95" 
                   onClick={() => setView('dashboard')}
                 >
                   <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span> <span className="text-blue-500">Guardian</span>
                 </h1>
                 <div className="flex flex-col items-center mt-2 group">
                   <p className={`text-[9px] sm:text-sm font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] drop-shadow-md ${appTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                     Safety Acquisition System
                   </p>
                   <div className="h-[2px] w-[80%] bg-red-600 mt-1.5 shadow-[0_0_10px_rgba(220,38,38,0.9)] rounded-full animate-pulse"></div>
                 </div>
               </div>
             </div>
             
             <div className="flex-1 flex justify-end items-center gap-3 sm:gap-6 relative">
               {view !== 'dashboard' && view !== 'auth' && (
                  <button 
                    onClick={() => setView('dashboard')}
                    className={`group text-[10px] font-black uppercase tracking-widest backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-2 transition-all border shadow-lg active:scale-95 hidden lg:flex ${appTheme === 'dark' ? 'text-white bg-blue-600/10 border-blue-500/30 hover:bg-blue-600 hover:border-blue-400' : 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
                  >
                    DASHBOARD
                  </button>
               )}
               <button 
                onClick={() => setShowProfileCard(!showProfileCard)}
                className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full border-2 transition-all duration-300 overflow-hidden flex items-center justify-center ${showProfileCard ? 'border-blue-400 ring-4 ring-blue-500/20 shadow-2xl' : 'border-white/10 hover:border-white/30 bg-white/5 shadow-lg'}`}
                title="Profile Settings"
               >
                  {userProfile?.profileImageUrl ? (
                    <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
               </button>

               {showProfileCard && (
                 <div className="absolute top-16 sm:top-24 right-0 w-72 sm:w-80 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <UserProfile onBack={() => setShowProfileCard(false)} />
                 </div>
               )}
             </div>
          </div>
          
          {!isOnline && (
            <div className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 shadow-inner">
                Offline Mode • Queued
            </div>
          )}
          {syncCount > 0 && isOnline && (
            <div className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 animate-pulse shadow-inner">
                Synced {syncCount} reports
            </div>
          )}
        </header>

        {showProfileCard && (
          <div 
            className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]" 
            onClick={() => setShowProfileCard(false)}
          />
        )}

        <main className="max-w-7xl mx-auto px-4 pt-6 sm:pt-10 flex-grow w-full overflow-y-auto">
          {needsConfig && view !== 'auth' && (
            <div className={`mb-10 backdrop-blur-2xl border p-6 sm:p-10 rounded-3xl shadow-2xl ${appTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4">Configuration Required</h3>
              <input 
                type="text" 
                value={baseId} 
                onChange={(e) => setBaseId(e.target.value)}
                placeholder="Airtable Base ID"
                className={`w-full rounded-2xl border px-6 py-4 outline-none transition-all font-mono text-sm ${appTheme === 'dark' ? 'border-white/10 bg-black/60 text-white focus:border-amber-500 shadow-inner' : 'border-slate-200 bg-white text-slate-900 focus:border-amber-500 shadow-md'}`}
              />
            </div>
          )}

          <div className="pb-24">
            {renderContent()}
          </div>
        </main>

        <footer className={`py-10 px-4 max-w-7xl mx-auto w-full flex flex-col items-center gap-8 mt-auto ${view === 'auth' ? 'hidden' : ''}`}>
           {quote && (
             <div className={`w-full max-w-2xl text-center px-10 py-6 rounded-[3rem] border-2 transition-all duration-700 ease-in-out backdrop-blur-xl relative overflow-hidden group animate-in fade-in zoom-in-95 ${appTheme === 'dark' ? 'bg-white/5 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] hover:border-red-500' : 'bg-white border-red-400/40 shadow-xl hover:border-red-500'}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <p className={`italic font-medium text-sm sm:text-base leading-relaxed transition-colors duration-500 ${appTheme === 'dark' ? 'text-slate-400 group-hover:text-red-200' : 'text-slate-700 group-hover:text-red-700'}`}>
                  {quote}
                </p>
             </div>
           )}
           <div className="w-full flex justify-center items-center border-t border-white/5 pt-6">
             <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] leading-none text-center">
                © 2025 ELIUS256 • SAFETY FIRST
             </div>
           </div>
        </footer>
      </div>

      {showTutorial && <TutorialModal onClose={handleCloseTutorial} appTheme={appTheme} />}
    </div>
  );
}

export default App;
