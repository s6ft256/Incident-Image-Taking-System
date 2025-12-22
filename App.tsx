
import React, { useState, useEffect, useRef } from 'react';
import { AIRTABLE_CONFIG, SAFETY_QUOTES, STORAGE_KEYS, SYSTEM_LOGO_URL } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { AuthScreen } from './components/AuthScreen';
import { TutorialModal } from './components/TutorialModal';
import { FeedbackAssistant } from './components/FeedbackAssistant';
import { PolicyModal, PolicyTab } from './components/PolicyModal';
import { CookieBanner } from './components/CookieBanner';
import { syncOfflineReports } from './services/syncService';
import { UserProfile as UserProfileType, FetchedIncident } from './types';
import { requestNotificationPermission, sendNotification } from './services/notificationService';
import { getAssignedCriticalIncidents } from './services/airtableService';

type ViewState = 'dashboard' | 'create' | 'recent' | 'auth' | 'my-tasks';

export default function App() {
  const [view, setView] = useState<ViewState>('auth');
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [policyInitialTab, setPolicyInitialTab] = useState<PolicyTab>('environmental');
  const [showTutorial, setShowTutorial] = useState(false);
  const [baseId] = useState(AIRTABLE_CONFIG.BASE_ID);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  const [quote, setQuote] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');
  const [isInitialized, setIsInitialized] = useState(false);
  const [criticalTasks, setCriticalTasks] = useState<FetchedIncident[]>([]);
  const [isBellShaking, setIsBellShaking] = useState(false);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const lastKnownIncidentIds = useRef<Set<string>>(new Set());

  const loadProfile = () => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
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

  // Background Alert Monitor (Simulated Push)
  useEffect(() => {
    if (!userProfile?.name || !isOnline) return;

    const monitorCriticalTasks = async () => {
      try {
        const tasks = await getAssignedCriticalIncidents(userProfile.name, { baseId });
        setCriticalTasks(tasks);
        
        let newFoundCount = 0;
        tasks.forEach(task => {
          if (!lastKnownIncidentIds.current.has(task.id)) {
            newFoundCount++;
            lastKnownIncidentIds.current.add(task.id);
            sendNotification(
              "CRITICAL HAZARD ASSIGNED", 
              `Alert: ${task.fields["Incident Type"]} at ${task.fields["Site / Location"]} requires immediate action.`,
              true
            );
          }
        });

        if (newFoundCount > 0) {
          setIsBellShaking(true);
          setTimeout(() => setIsBellShaking(false), 2000);
        }

        // Cleanup set: remove IDs that are no longer in the critical list (e.g. they were closed)
        const currentIds = new Set(tasks.map(t => t.id));
        lastKnownIncidentIds.current.forEach(id => {
           if (!currentIds.has(id)) lastKnownIncidentIds.current.delete(id);
        });

      } catch (e) {
        console.error("Critical Monitor Link Error:", e);
      }
    };

    // Immediate check on login
    monitorCriticalTasks();

    // Poll every 2 minutes for updates
    const interval = setInterval(monitorCriticalTasks, 120000);
    return () => clearInterval(interval);
  }, [userProfile?.name, isOnline, baseId]);

  useEffect(() => {
    setQuote(SAFETY_QUOTES[Math.floor(Math.random() * SAFETY_QUOTES.length)]);
    const profile = loadProfile();
    
    if (!profile) {
      setView('auth');
    } else {
      setView('dashboard');

      const tutorialSeen = localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN);
      if (!tutorialSeen) {
        setShowTutorial(true);
      }
    }

    requestNotificationPermission();
    setIsInitialized(true);

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light';
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
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
      if (profileCardRef.current && !profileCardRef.current.contains(event.target as Node)) setShowProfileCard(false);
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setShowNotifications(false);
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
    } catch (e) { console.error("Auto-sync failed", e); }
  };

  const handleAuthComplete = (profile: UserProfileType) => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    setUserProfile(profile);
    setView('dashboard');
    if (!localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN)) setShowTutorial(true);
    requestNotificationPermission();
  };

  const handleOpenCookiePolicy = () => {
    setPolicyInitialTab('cookies');
    setShowPolicy(true);
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
    <div className={`min-h-screen transition-colors duration-300 relative selection:bg-blue-500/30 overflow-x-hidden flex flex-col ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-white'}`}>
      <style>{`
        @keyframes bell-shake {
          0% { transform: rotate(0); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(5deg); }
          85% { transform: rotate(-5deg); }
          100% { transform: rotate(0); }
        }
        .bell-shake-animate {
          animation: bell-shake 0.8s ease-in-out infinite;
        }
      `}</style>
      <div className="relative z-10 flex flex-col flex-grow">
        <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'} ${view === 'auth' ? 'hidden' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
             <div className="flex-1 flex justify-start">
               <div onClick={() => setView('dashboard')} className="group cursor-pointer">
                 <img 
                   src={SYSTEM_LOGO_URL} 
                   alt="Logo" 
                   className="h-16 sm:h-24 w-auto object-contain drop-shadow-2xl transition-all duration-500 group-hover:scale-110 origin-left" 
                 />
               </div>
             </div>
             <div className="flex flex-[2] flex-col items-center">
               <h1 className="text-2xl sm:text-4xl font-black tracking-tighter" onClick={() => setView('dashboard')}>
                 <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span> <span className="text-blue-500">Guardian</span>
               </h1>
             </div>
             <div className="flex-1 flex justify-end items-center gap-2 sm:gap-4 relative">
               {userProfile && (
                 <div ref={notificationsRef} className="relative">
                   <button 
                     onClick={() => setShowNotifications(!showNotifications)}
                     className={`relative p-2 rounded-xl transition-all ${isBellShaking ? 'bell-shake-animate' : ''} ${appTheme === 'dark' ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                     title="Critical Alerts"
                   >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      {criticalTasks.length > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-[#020617] animate-in zoom-in">
                          {criticalTasks.length}
                        </span>
                      )}
                   </button>
                   
                   {showNotifications && (
                     <div className={`absolute top-full right-0 mt-4 w-72 sm:w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${appTheme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className={`px-4 py-3 border-b flex items-center justify-between ${appTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                           <span className={`text-[10px] font-black uppercase tracking-widest ${appTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Critical Observations</span>
                           <span className="bg-rose-600 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase">Priority</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                           {criticalTasks.length === 0 ? (
                             <div className="p-8 text-center opacity-30">
                                <p className="text-[10px] font-black uppercase tracking-widest">No Critical Alerts</p>
                             </div>
                           ) : (
                             criticalTasks.map(task => (
                               <div 
                                 key={task.id} 
                                 onClick={() => { setView('my-tasks'); setShowNotifications(false); }}
                                 className={`p-4 border-b cursor-pointer transition-colors last:border-0 ${appTheme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}
                               >
                                 <div className="flex items-start gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <p className={`text-[11px] font-black truncate ${appTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{task.fields["Incident Type"]}</p>
                                      <p className="text-[9px] font-bold text-slate-500 truncate mt-0.5">{task.fields["Site / Location"]}</p>
                                      <p className="text-[7px] font-black text-blue-500 uppercase tracking-widest mt-1">Pending Action</p>
                                   </div>
                                 </div>
                               </div>
                             ))
                           )}
                        </div>
                        {criticalTasks.length > 0 && (
                          <div className={`p-3 text-center border-t ${appTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <button 
                              onClick={() => { setView('my-tasks'); setShowNotifications(false); }}
                              className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400"
                            >
                              Manage All Tasks
                            </button>
                          </div>
                        )}
                     </div>
                   )}
                 </div>
               )}
               <div ref={profileCardRef} className="relative">
                 <div onClick={() => setShowProfileCard(!showProfileCard)} className="cursor-pointer group">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 ${showProfileCard ? 'border-blue-500' : 'border-slate-700'}`}>
                      {userProfile?.profileImageUrl ? <img src={userProfile.profileImageUrl} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black">{userProfile?.name?.charAt(0)}</div>}
                    </div>
                 </div>
                 {showProfileCard && (
                   <div className="absolute top-full right-0 mt-4 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                     <UserProfile onBack={() => setShowProfileCard(false)} baseId={baseId} />
                   </div>
                 )}
               </div>
             </div>
          </div>
        </header>
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">{renderContent()}</main>
        <footer className={`py-6 px-4 border-t text-center ${appTheme === 'dark' ? 'bg-slate-950/30 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-2">
            <div className="px-4 py-2 rounded-full border border-red-600/40 text-[9px] font-black uppercase text-red-500 italic">"{quote}"</div>
            <p className="text-[8px] font-black text-slate-600 uppercase">© ELIUS 2025 • SAFETY FIRST</p>
          </div>
        </footer>
      </div>
      {view !== 'auth' && (
        <div ref={menuRef} className={`fixed bottom-6 right-6 z-50 flex flex-row-reverse items-center gap-3 transition-opacity ${isFabVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center border-2 transition-transform ${isMenuOpen ? 'bg-rose-600 border-rose-400 rotate-90' : 'bg-blue-600 border-blue-400'} text-white`}>
            {isMenuOpen ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg> : <div className="flex flex-col gap-0.5"><div className="w-1 h-1 bg-current rounded-full" /><div className="w-1 h-1 bg-current rounded-full" /><div className="w-1 h-1 bg-current rounded-full" /></div>}
          </button>
          <div className={`flex flex-row-reverse gap-3 transition-all ${isMenuOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'}`}>
            <FeedbackAssistant appTheme={appTheme} userName={userProfile?.name} />
            <button onClick={() => { setPolicyInitialTab('environmental'); setShowPolicy(true); setIsMenuOpen(false); }} className={`w-12 h-12 rounded-full border shadow-xl flex items-center justify-center ${appTheme === 'dark' ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
            </button>
          </div>
        </div>
      )}
      {showTutorial && <TutorialModal onClose={() => { localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true'); setShowTutorial(false); }} appTheme={appTheme} />}
      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} appTheme={appTheme} initialTab={policyInitialTab} />}
      <CookieBanner appTheme={appTheme} onViewDetails={handleOpenCookiePolicy} />
      {syncCount > 0 && <div className="fixed bottom-24 right-6 z-50 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-2xl text-[10px] font-black uppercase tracking-widest">{syncCount} Synced</div>}
    </div>
  );
}
