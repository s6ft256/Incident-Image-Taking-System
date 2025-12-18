import React, { useState, useEffect } from 'react';
import { AIRTABLE_CONFIG, SAFETY_QUOTES } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { HSEAssistant } from './components/HSEAssistant';
import { syncOfflineReports } from './services/syncService';
import { UserProfile as UserProfileType } from './types';

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

  const applyTheme = (t: 'dark' | 'light') => {
    if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  useEffect(() => {
    setQuote(SAFETY_QUOTES[Math.floor(Math.random() * SAFETY_QUOTES.length)]);
    
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (savedProfile) setUserProfile(JSON.parse(savedProfile));

    const savedTheme = localStorage.getItem(THEME_KEY) as 'dark' | 'light' || 'dark';
    setAppTheme(savedTheme);
    applyTheme(savedTheme);

    const handleStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) syncOfflineReports(baseId).then(count => {
        if (count > 0) { setSyncCount(count); setTimeout(() => setSyncCount(0), 5000); }
      });
    };

    const handleThemeChange = (e: any) => {
      setAppTheme(e.detail);
      applyTheme(e.detail);
    };

    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    window.addEventListener('themeChanged', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      window.removeEventListener('themeChanged', handleThemeChange as EventListener);
    };
  }, [baseId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-blue-500/30">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/90 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 flex justify-start items-center gap-2">
            <img 
              src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
              className="h-8 w-auto grayscale dark:grayscale-0 cursor-pointer" 
              onClick={() => setView('dashboard')} 
            />
            <div className="hidden sm:block">
               <h1 className="text-sm font-black tracking-tighter leading-none">HSE <span className="text-blue-600">Guardian</span></h1>
               <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">Security System</p>
            </div>
          </div>

          <div className="flex-[3] sm:flex-[2] flex justify-center">
            {view !== 'dashboard' && (
               <button onClick={() => setView('dashboard')} className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Dashboard</button>
            )}
          </div>
          
          <div className="flex-1 flex justify-end items-center relative">
            <button 
              onClick={() => setShowProfileCard(!showProfileCard)}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm"
            >
              {userProfile?.profileImageUrl ? (
                <img src={userProfile.profileImageUrl} className="w-full h-full object-cover" />
              ) : (
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
            </button>
            {showProfileCard && (
              <div className="absolute top-12 right-0 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <UserProfile onBack={() => setShowProfileCard(false)} />
              </div>
            )}
          </div>
        </div>
      </header>

      {showProfileCard && <div className="fixed inset-0 z-30 bg-black/5 backdrop-blur-sm" onClick={() => setShowProfileCard(false)} />}

      <main className="max-w-7xl mx-auto px-4 pt-4 sm:pt-6 pb-20">
        {needsConfig && (
          <div className="mb-6 p-6 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 shadow-sm">
            <h3 className="text-[10px] font-black text-amber-600 uppercase mb-3">Database Config</h3>
            <input value={baseId} onChange={(e) => setBaseId(e.target.value)} className="w-full bg-white dark:bg-black/60 rounded-xl px-4 py-3 border border-amber-200 dark:border-white/10 text-xs font-mono" />
          </div>
        )}
        {view === 'create' ? <CreateReportForm baseId={baseId} onBack={() => setView('dashboard')} /> : 
         view === 'recent' ? <RecentReports baseId={baseId} onBack={() => setView('dashboard')} /> : 
         <Dashboard baseId={baseId} onNavigate={setView} />}
      </main>

      <footer className="py-8 px-4 flex flex-col items-center gap-4">
        {quote && (
          <div className="max-w-xl text-center px-6 py-4 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 shadow-sm italic text-[11px] text-slate-500 dark:text-slate-400">
            {quote}
          </div>
        )}
        <div className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">© 2025 ELIUS256 • HSECES LEADERSHIP</div>
      </footer>
      
      <HSEAssistant />
    </div>
  );
}

export default App;