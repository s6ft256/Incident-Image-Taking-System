
import React, { useState, useEffect, useRef } from 'react';
import { AIRTABLE_CONFIG, SAFETY_QUOTES, STORAGE_KEYS, SYSTEM_LOGO_URL, AUTHORIZED_ADMIN_ROLES } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { AuthScreen } from './components/AuthScreen';
import { TutorialModal } from './components/TutorialModal';
import { FeedbackAssistant } from './components/FeedbackAssistant';
import { PolicyModal, PolicyTab } from './components/PolicyModal';
import { CookieBanner } from './components/CookieBanner';
import { NotificationSystem } from './components/NotificationSystem';
import { PersonnelGrid } from './components/PersonnelGrid';
import { Checklists } from './components/Checklists';
import { InspectionViewer } from './components/InspectionViewer';
import { RiskAssessmentModule } from './components/RiskAssessmentModule';
import { TrainingManagement } from './components/TrainingManagement';
import { AuditLogViewer } from './components/AuditLogViewer';
import { ComplianceTracker } from './components/ComplianceTracker';
import { syncOfflineReports } from './services/syncService';
import { UserProfile as UserProfileType, FetchedObservation } from './types';
import { requestNotificationPermission, sendNotification, sendToast } from './services/notificationService';
import { getAssignedCriticalObservations, getAllReports } from './services/airtableService';

type ViewState = 'dashboard' | 'create' | 'recent' | 'auth' | 'my-tasks' | 'personnel' | 'checklists' | 'inspection-viewer' | 'risk-assessment' | 'training-management' | 'audit-trail' | 'compliance-tracker';

export default function App() {
  // Fast Path: Load profile immediately to avoid auth screen flash and provide "automatic" entry
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const [view, setView] = useState<ViewState>(userProfile ? 'dashboard' : 'auth');
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [policyInitialTab, setPolicyInitialTab] = useState<PolicyTab>('environmental');
  const [showTutorial, setShowTutorial] = useState(false);
  const [baseId] = useState(AIRTABLE_CONFIG.BASE_ID);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  const [quote, setQuote] = useState('');
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');
  const [isInitialized, setIsInitialized] = useState(false);
  const [criticalTasks, setCriticalTasks] = useState<FetchedObservation[]>([]);
  const [isBellShaking, setIsBellShaking] = useState(false);
  const [isBadgePinging, setIsBadgePinging] = useState(false);
  const [activeInspectionUrl, setActiveInspectionUrl] = useState('');
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const lastKnownObservationIds = useRef<Set<string>>(new Set());
  const escalatedIds = useRef<Set<string>>(new Set());

  // Navigation History Sync: Handle Swipe Back and Browser Back Button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Set initial state
    if (view) {
      window.history.replaceState({ view }, '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update history when view changes via app logic
  useEffect(() => {
    if (!isInitialized) return;
    
    const currentState = window.history.state;
    if (!currentState || currentState.view !== view) {
      window.history.pushState({ view }, '');
    }
  }, [view, isInitialized]);

  const applyTheme = (t: 'dark' | 'light') => {
    if (t === 'light') {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const then = new Date(dateString);
    const diffInMs = now.getTime() - then.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return then.toLocaleDateString();
  };

  useEffect(() => {
    if (!userProfile?.name || !isOnline) return;

    const monitorSafetyStatus = async () => {
      if (!navigator.onLine) return;

      try {
        const tasks = await getAssignedCriticalObservations(userProfile.name, { baseId });
        setCriticalTasks(tasks);
        
        tasks.forEach(task => {
          if (!lastKnownObservationIds.current.has(task.id)) {
            lastKnownObservationIds.current.add(task.id);
            
            sendNotification(
              "CRITICAL HAZARD ASSIGNED", 
              `Alert: ${task.fields["Observation Type"]} at ${task.fields["Site / Location"]} requires immediate action.`,
              true
            );

            window.dispatchEvent(new CustomEvent('hse-guardian-alert', { detail: task }));

            setIsBellShaking(true);
            setIsBadgePinging(true);
            setTimeout(() => { setIsBellShaking(false); setIsBadgePinging(false); }, 6000);
          }
        });

        const isSafetyLead = AUTHORIZED_ADMIN_ROLES.includes(userProfile.role.toLowerCase()) || 
                             userProfile.role.toLowerCase().includes('safety');
        
        if (isSafetyLead) {
          const allReports = await getAllReports({ baseId });
          const now = Date.now();
          const ESCALATION_THRESHOLD = 48 * 60 * 60 * 1000; // 48 Hours

          allReports.forEach(report => {
            const isUnresolved = !report.fields["Action taken"] || report.fields["Action taken"].trim().length === 0;
            const reportAge = now - new Date(report.createdTime).getTime();
            
            if (isUnresolved && reportAge > ESCALATION_THRESHOLD && !escalatedIds.current.has(report.id)) {
              escalatedIds.current.add(report.id);
              
              sendNotification(
                "SYSTEM ESCALATION: OVERDUE HAZARD",
                `ID ${report.id.slice(-5)}: ${report.fields["Observation Type"]} remains unresolved after 48 hours.`,
                true
              );

              sendToast(
                `Escalated: ${report.fields["Observation Type"]}`,
                "critical",
                `esc-${report.id}`,
                undefined,
                {
                  label: "Inspect Report",
                  onClick: () => {
                    setView('recent');
                    window.location.hash = `view-report-${report.id}`;
                  }
                }
              );
            }
          });
        }

      } catch (e: any) {
        if (e.message?.includes('fetch') || e.name === 'TypeError') return;
        console.warn("Safety Monitor Sync Issue:", e.message);
      }
    };

    monitorSafetyStatus();
    const interval = setInterval(monitorSafetyStatus, 30000);
    return () => clearInterval(interval);
  }, [userProfile?.name, userProfile?.role, isOnline, baseId]);

  useEffect(() => {
    setQuote(SAFETY_QUOTES[Math.floor(Math.random() * SAFETY_QUOTES.length)]);
    
    // Auto-show tutorial for fresh profiles
    if (userProfile && !localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN)) {
      setShowTutorial(true);
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

    const handleProfileUpdate = () => {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) {
        try { setUserProfile(JSON.parse(saved)); } catch (e) {}
      }
    };

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
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `${count} Reports Synced`, type: 'success' } }));
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

  const handleOpenInspection = (url: string) => {
    setActiveInspectionUrl(url);
    setView('inspection-viewer');
  };

  const renderContent = () => {
    if (view === 'auth') return <AuthScreen onAuthComplete={handleAuthComplete} appTheme={appTheme} />;
    switch (view) {
      case 'create': return <CreateReportForm baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'recent': return <RecentReports baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'my-tasks': return <RecentReports baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} filterAssignee={userProfile?.name} />;
      case 'personnel': return <PersonnelGrid appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'checklists': return <Checklists appTheme={appTheme} onBack={() => setView('dashboard')} onOpenInspection={handleOpenInspection} />;
      case 'inspection-viewer': return <InspectionViewer url={activeInspectionUrl} appTheme={appTheme} onBack={() => setView('checklists')} />;
      case 'risk-assessment': return <RiskAssessmentModule appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'training-management': return <TrainingManagement appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'compliance-tracker': return <ComplianceTracker appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'audit-trail': return <AuditLogViewer appTheme={appTheme} onBack={() => setView('dashboard')} />;
      default: return <Dashboard baseId={baseId} appTheme={appTheme} onNavigate={(target) => setView(target as any)} />;
    }
  };

  if (!isInitialized) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 relative selection:bg-blue-500/30 overflow-x-hidden flex flex-col ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-white'}`}>
      <style>{`
        @keyframes bell-swing {
          0% { transform: rotate(0); }
          10% { transform: rotate(20deg); }
          20% { transform: rotate(-20deg); }
          30% { transform: rotate(15deg); }
          40% { transform: rotate(-15deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(-10deg); }
          70% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
          100% { transform: rotate(0); }
        }
        @keyframes bell-pulse-soft {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.1); filter: brightness(1.3); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes badge-ping {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .bell-swing-animate {
          animation: bell-swing 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
          color: #f43f5e !important;
        }
        .bell-tasks-active {
          animation: bell-pulse-soft 2s ease-in-out infinite;
        }
        .badge-ping-layer {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background-color: rgb(225, 29, 72);
          animation: badge-ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
          z-index: -1;
        }
        .main-system-title {
          transition: all 0.5s ease-in-out;
        }
      `}</style>
      <NotificationSystem appTheme={appTheme} onViewTask={(id) => { setView('recent'); window.location.hash = `view-report-${id}`; }} />
      <div className={`relative z-10 flex flex-col flex-grow ${view === 'inspection-viewer' ? 'h-auto overflow-visible' : ''}`}>
        <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'} ${(view === 'auth' || view === 'inspection-viewer') ? 'hidden' : ''}`}>
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
             <div className="flex flex-[2] flex-col items-center group cursor-pointer" onClick={() => setView('dashboard')}>
               <h1 className="text-2xl sm:text-4xl font-black tracking-tighter main-system-title">
                 <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span> <span className="text-blue-500">Guardian</span>
               </h1>
               <div className="h-1 w-12 sm:w-20 bg-red-600 mt-1 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)] transition-all duration-500 group-hover:w-24 sm:group-hover:w-32 system-title-line"></div>
             </div>
             <div className="flex-1 flex justify-end items-center gap-2 sm:gap-4 relative">
               {userProfile && (
                 <div ref={notificationsRef} className="relative">
                   <button 
                     onClick={() => setShowNotifications(!showNotifications)}
                     className={`relative p-2.5 rounded-xl transition-all flex items-center justify-center 
                       ${isBellShaking ? 'bell-swing-animate' : (criticalTasks.length > 0 ? 'bell-tasks-active' : '')} 
                       ${appTheme === 'dark' ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                     title="Critical Alerts"
                   >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      {criticalTasks.length > 0 && (
                        <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-[#020617] transition-all">
                          <span className="badge-ping-layer" />
                          {criticalTasks.length}
                        </div>
                      )}
                   </button>
                   
                   {showNotifications && (
                     <div className={`absolute top-full right-0 mt-4 w-72 sm:w-80 rounded-[2rem] border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ${appTheme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${appTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                           <div className="flex flex-col">
                             <span className={`text-[10px] font-black uppercase tracking-widest ${appTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Security Alerts</span>
                             <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Critical Queue</span>
                           </div>
                           <span className="bg-rose-600/10 text-rose-500 border border-rose-500/20 text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                             {criticalTasks.length} Active
                           </span>
                        </div>
                        
                        <div className={`px-5 py-3 border-b flex items-start gap-3 ${appTheme === 'dark' ? 'bg-blue-600/5 border-white/5' : 'bg-blue-50 border-blue-100'}`}>
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 2v10m0 4v4"/></svg>
                          </div>
                          <p className={`text-[9px] font-bold leading-relaxed ${appTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            Personnel Alerts: You have {criticalTasks.length} high-risk hazards pending your immediate review.
                          </p>
                        </div>

                        <div className="max-h-80 overflow-y-auto scrollbar-hide">
                           {criticalTasks.length === 0 ? (
                             <div className="p-12 text-center opacity-30 flex flex-col items-center gap-3">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
                                <p className="text-[10px] font-black uppercase tracking-widest">Zero Threats Detected</p>
                             </div>
                           ) : (
                             criticalTasks.map(task => (
                               <div 
                                 key={task.id} 
                                 onClick={() => { setView('my-tasks'); setShowNotifications(false); }}
                                 className={`p-5 border-b cursor-pointer transition-all last:border-0 relative overflow-hidden group ${appTheme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}
                               >
                                 <div className="flex items-start gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-110 transition-transform">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                        <p className={`text-[11px] font-black truncate pr-2 ${appTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{task.fields["Observation Type"]}</p>
                                        <span className="text-[8px] font-black text-slate-500 whitespace-nowrap">{getRelativeTime(task.createdTime)}</span>
                                      </div>
                                      <p className="text-[9px] font-bold text-slate-500 truncate mt-1 flex items-center gap-1">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                        {task.fields["Site / Location"]}
                                      </p>
                                      <div className="mt-2.5 flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest">Immediate Response Required</span>
                                      </div>
                                   </div>
                                 </div>
                               </div>
                             ))
                           )}
                        </div>
                        {criticalTasks.length > 0 && (
                          <div className={`p-4 text-center border-t ${appTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <button 
                              onClick={() => { setView('my-tasks'); setShowNotifications(false); }}
                              className="w-full py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg border border-blue-400/20"
                            >
                              Dispatch To All Tasks
                            </button>
                          </div>
                        )}
                     </div>
                   )}
                 </div>
               )}
               <div ref={profileCardRef} className="relative">
                 <div onClick={() => setShowProfileCard(!showProfileCard)} className="cursor-pointer group">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 transition-all ${showProfileCard ? 'border-blue-500 ring-4 ring-blue-500/20 scale-105' : 'border-slate-700'}`}>
                      {userProfile?.profileImageUrl ? <img src={userProfile.profileImageUrl} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black">{userProfile?.name?.charAt(0)}</div>}
                    </div>
                 </div>
                 {showProfileCard && (
                   <div className="absolute top-full right-0 mt-4 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                     <UserProfile onBack={() => setShowProfileCard(false)} baseId={baseId} />
                   </div>
                 )}
               </div>
             </div>
          </div>
        </header>
        <main className={`flex-grow ${view === 'inspection-viewer' ? 'p-0 max-w-none' : 'max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full'}`}>{renderContent()}</main>
        <footer className={`py-6 px-4 border-t text-center ${appTheme === 'dark' ? 'bg-slate-950/30 border-white/5' : 'bg-slate-50 border-slate-100'} ${view === 'auth' ? 'hidden' : ''}`}>
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-2">
            <div className="px-4 py-2 rounded-full border border-red-600/40 text-[9px] font-black uppercase text-red-500 italic">"{quote}"</div>
            <p className="text-[8px] font-black text-slate-600 uppercase">© ELIUS 2025 • SAFETY FIRST</p>
          </div>
        </footer>
      </div>
      {(view !== 'auth' && view !== 'inspection-viewer') && (
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
    </div>
  );
}
