
import React, { useState, useEffect } from 'react';
import { AIRTABLE_CONFIG, SAFETY_QUOTES } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { syncOfflineReports } from './services/syncService';
import { UserProfile as UserProfileType } from './types';
import { HSEAssistant } from './components/HSEAssistant';

type ViewState = 'dashboard' | 'create' | 'recent';

const PROFILE_KEY = 'hse_guardian_profile';
const THEME_KEY = 'hse_guardian_theme';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [baseId, setBaseId] = useState(AIRTABLE_CONFIG.BASE_ID);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  const [quote, setQuote] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');
  
  const needsConfig = baseId.includes('YourBaseId') || !baseId;

  const loadProfile = () => {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      try {
        setUserProfile(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    } else {
      setUserProfile(null);
    }
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
    loadProfile();

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
      setAppTheme(e.detail);
      applyTheme(e.detail);
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

  const renderContent = () => {
    switch (view) {
      case 'create':
        return <CreateReportForm baseId={baseId} onBack={() => setView('dashboard')} />;
      case 'recent':
        return <RecentReports baseId={baseId} onBack={() => setView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard baseId={baseId} onNavigate={(target) => setView(target)} />;
    }
  };

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 main-app-container relative selection:bg-blue-500/30 overflow-x-hidden ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-slate-100'}`}
    >
      {appTheme === 'dark' && <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/70 z-0 pointer-events-none"></div>}

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-white/80 border-slate-200 shadow-md'}`}>
          <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
             <div className="flex-1 flex justify-start">
               <div className="flex flex-col items-center">
                 <img 
                   src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
                   alt="TGC Logo" 
                   className="h-10 w-auto sm:h-12 object-contain drop-shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:scale-105 transition-all cursor-pointer"
                   onClick={() => setView('dashboard')}
                 />
                 <span className={`hidden lg:block text-[6px] font-black uppercase tracking-widest mt-0.5 opacity-80 ${appTheme === 'dark' ? 'text-amber-500' : 'text-slate-600'}`}>General Contracting</span>
               </div>
             </div>

             <div className="flex-[3] sm:flex-[2] flex flex-col items-center">
               <div className="flex flex-col items-center text-center">
                 <h1 
                   className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-xl cursor-pointer transition-transform active:scale-95" 
                   onClick={() => setView('dashboard')}
                 >
                   <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span> <span className="text-blue-500">Guardian</span>
                 </h1>
                 <p className={`text-[7px] sm:text-[8px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 drop-shadow-md ${appTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                   Safety Acquisition System
                 </p>
               </div>
             </div>
             
             <div className="flex-1 flex justify-end items-center gap-2 sm:gap-3 relative">
               {view !== 'dashboard' && (
                  <button 
                    onClick={() => setView('dashboard')}
                    className={`group text-[8px] font-black uppercase tracking-widest backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 transition-all border shadow-lg active:scale-95 hidden md:flex ${appTheme === 'dark' ? 'text-white bg-blue-600/10 border-blue-500/30 hover:bg-blue-600 hover:border-blue-400' : 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
                  >
                    DASHBOARD
                  </button>
               )}
               <button 
                onClick={() => setShowProfileCard(!showProfileCard)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-300 overflow-hidden flex items-center justify-center ${showProfileCard ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-lg' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                title="Profile Settings"
               >
                  {userProfile?.profileImageUrl ? (
                    <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
               </button>

               {/* COMPACT PROFILE OVERLAY */}
               {showProfileCard && (
                 <div className="absolute top-12 right-0 w-72 sm:w-80 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <UserProfile onBack={() => setShowProfileCard(false)} />
                 </div>
               )}
             </div>
          </div>
          
          {!isOnline && (
            <div className="bg-amber-600 text-white text-[8px] font-black uppercase tracking-widest text-center py-1">
                Offline Mode • Queued
            </div>
          )}
          {syncCount > 0 && isOnline && (
            <div className="bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest text-center py-1 animate-pulse">
                Synced {syncCount} reports
            </div>
          )}
        </header>

        {/* CLICK OVERLAY TO CLOSE PROFILE CARD */}
        {showProfileCard && (
          <div 
            className="fixed inset-0 z-30 bg-transparent" 
            onClick={() => setShowProfileCard(false)}
          />
        )}

        <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 flex-grow w-full overflow-y-auto">
          {needsConfig && (
            <div className={`mb-6 backdrop-blur-2xl border p-4 sm:p-6 rounded-2xl shadow-xl ${appTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">Configuration Required</h3>
              <input 
                type="text" 
                value={baseId} 
                onChange={(e) => setBaseId(e.target.value)}
                placeholder="Airtable Base ID"
                className={`w-full rounded-xl border px-4 py-3 outline-none transition-all font-mono text-xs ${appTheme === 'dark' ? 'border-white/10 bg-black/60 text-white focus:border-amber-500' : 'border-slate-200 bg-white text-slate-900 focus:border-amber-500'}`}
              />
            </div>
          )}

          <div className="pb-20">
            {renderContent()}
          </div>
        </main>

        <footer className="py-6 px-4 max-w-6xl mx-auto w-full flex flex-col items-center gap-6 mt-auto">
           {quote && (
             <div className={`w-full max-w-xl text-center px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-lg relative overflow-hidden group ${appTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'}`}>
                <p className={`italic font-medium text-xs sm:text-sm leading-relaxed ${appTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {quote}
                </p>
             </div>
           )}
           <div className="w-full flex justify-center items-center border-t border-white/5 pt-4">
             <div className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] leading-none text-center">
                © 2025 ELIUS256 • SAFETY FIRST
             </div>
           </div>
        </footer>
      </div>
      <HSEAssistant />
    </div>
  );
}

export default App;
