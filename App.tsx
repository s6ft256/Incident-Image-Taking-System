
import React, { useState, useEffect } from 'react';
import { AIRTABLE_CONFIG, SAFETY_QUOTES } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { syncOfflineReports } from './services/syncService';
import { UserProfile as UserProfileType } from './types';
import { HSEAssistant } from './components/HSEAssistant';

type ViewState = 'dashboard' | 'create' | 'recent' | 'profile';

const PROFILE_KEY = 'hse_guardian_profile';
const THEME_KEY = 'hse_guardian_theme';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
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
      case 'profile':
        return <UserProfile onBack={() => setView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard baseId={baseId} onNavigate={(target) => setView(target)} />;
    }
  };

  return (
    <div 
      className={`min-h-screen pb-12 transition-colors duration-300 main-app-container relative selection:bg-blue-500/30 ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-slate-100'}`}
    >
      {appTheme === 'dark' && <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/70 z-0 pointer-events-none"></div>}

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className={`sticky top-0 z-20 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.8)]' : 'bg-white/80 border-slate-200 shadow-lg'}`}>
          <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-between">
             <div className="flex-1 flex justify-start">
               <div className="flex flex-col items-center">
                 <img 
                   src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
                   alt="TGC Logo" 
                   className="h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 transition-all cursor-pointer"
                   onClick={() => setView('dashboard')}
                 />
                 <span className={`text-[8px] font-black uppercase tracking-widest mt-1 opacity-80 ${appTheme === 'dark' ? 'text-amber-500' : 'text-slate-600'}`}>General Contracting</span>
               </div>
             </div>

             <div className="flex-[2] flex flex-col items-center">
               <div className="w-32 h-[3px] bg-gradient-to-r from-transparent via-blue-500 to-transparent mb-4 shadow-[0_0_12px_rgba(59,130,246,0.6)] rounded-full"></div>
               
               <div className="flex flex-col items-center text-center">
                 <h1 
                   className="text-5xl font-black tracking-tight drop-shadow-2xl cursor-pointer transition-transform active:scale-95" 
                   onClick={() => setView('dashboard')}
                 >
                   <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span> <span className="text-blue-500">Guardian</span>
                 </h1>
                 <p className={`text-[10px] font-bold uppercase tracking-[0.5em] mt-3 drop-shadow-md ${appTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                   Safety Acquisition System
                 </p>
               </div>

               <div className="w-32 h-[3px] bg-gradient-to-r from-transparent via-blue-500 to-transparent mt-4 shadow-[0_0_12px_rgba(59,130,246,0.6)] rounded-full"></div>
             </div>
             
             <div className="flex-1 flex justify-end items-center gap-4">
               {view !== 'dashboard' && (
                  <button 
                    onClick={() => setView('dashboard')}
                    className={`group text-[10px] font-black uppercase tracking-widest backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-2 transition-all border shadow-lg active:scale-95 hidden sm:flex ${appTheme === 'dark' ? 'text-white bg-blue-600/10 border-blue-500/30 hover:bg-blue-600 hover:border-blue-400' : 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    DASHBOARD
                  </button>
               )}
               <button 
                onClick={() => setView('profile')}
                className={`w-12 h-12 rounded-full border-2 transition-all duration-300 overflow-hidden flex items-center justify-center ${view === 'profile' ? 'border-blue-400 ring-4 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                title="Profile Settings"
               >
                  {userProfile?.profileImageUrl ? (
                    <img src={userProfile.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
               </button>
             </div>
          </div>
          
          {!isOnline && (
            <div className="bg-amber-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 border-t border-white/5">
                Offline Mode Active • Saved to local outbox
            </div>
          )}
          {syncCount > 0 && isOnline && (
            <div className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest text-center py-1.5 animate-in slide-in-from-top-0 border-t border-white/5">
                Connection Restored • Synced {syncCount} reports
            </div>
          )}
        </header>

        <main className="max-w-4xl mx-auto px-4 pt-10 flex-grow w-full">
          {needsConfig && (
            <div className={`mb-10 backdrop-blur-2xl border p-8 rounded-3xl shadow-2xl ${appTheme === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
              <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em] mb-4">System Configuration</h3>
              <input 
                type="text" 
                value={baseId} 
                onChange={(e) => setBaseId(e.target.value)}
                placeholder="Airtable Base ID (appXXXXXXXXXX)"
                className={`w-full rounded-2xl border px-5 py-4 outline-none transition-all font-mono ${appTheme === 'dark' ? 'border-white/10 bg-black/60 text-white focus:border-amber-500 placeholder-slate-700' : 'border-slate-200 bg-white text-slate-900 focus:border-amber-500 placeholder-slate-300'}`}
              />
              <p className="mt-4 text-[10px] text-amber-500/60 font-black uppercase tracking-wider">Airtable Base ID required for cloud sync.</p>
            </div>
          )}

          {renderContent()}
        </main>

        <footer className="py-12 px-4 max-w-4xl mx-auto w-full flex flex-col items-center gap-12">
           {quote && (
             <div className={`w-full max-w-2xl text-center px-8 py-6 rounded-3xl border backdrop-blur-2xl shadow-2xl relative overflow-hidden group ${appTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'}`}>
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/40"></div>
                <p className={`italic font-medium text-base leading-relaxed relative z-10 transition-colors ${appTheme === 'dark' ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>
                  {quote}
                </p>
             </div>
           )}
           <div className="w-full flex justify-center items-center border-t border-white/5 pt-10">
             <div className="text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] leading-none text-center">
                © 2025 ELIUS256 • ALL RIGHTS RESERVED
             </div>
           </div>
        </footer>
      </div>
      <HSEAssistant />
    </div>
  );
}

export default App;
