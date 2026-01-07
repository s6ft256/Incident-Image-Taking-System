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
import { CraneChecklistForm } from './components/CraneChecklistForm';
import { EquipmentChecklistForm } from './components/EquipmentChecklistForm';
import { IncidentReportForm } from './components/IncidentReportForm';
import { PrintableIncidentReport } from './components/PrintableIncidentReport';
import { runOfflineSync } from './services/syncService';
import { UserProfile as UserProfileType, FetchedObservation, FetchedIncident } from './types';
import { requestNotificationPermission, sendNotification, sendToast } from './services/notificationService';
import { getAssignedCriticalObservations, getAllReports } from './services/airtableService';

type ViewState = 'auth' | 'dashboard' | 'create' | 'recent' | 'my-tasks' | 'personnel' | 'checklists' | 'inspection-viewer' | 'risk-assessment' | 'training-management' | 'audit-trail' | 'compliance-tracker' | 'crane-checklist' | 'equipment-checklist' | 'incident-report';

interface SystemAlert {
  id: string;
  type: 'critical-task' | 'escalated-overdue';
  title: string;
  description: string;
  site: string;
  timestamp: string;
  originalRecord: FetchedObservation;
}

export default function App() {
  const isNavigatingRef = useRef(false);

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
  const [activeAlerts, setActiveAlerts] = useState<SystemAlert[]>([]);
  const [isBellShaking, setIsBellShaking] = useState(false);
  const [isBadgePinging, setIsBadgePinging] = useState(false);
  const [activeInspectionUrl, setActiveInspectionUrl] = useState('');
  const [printingIncident, setPrintingIncident] = useState<FetchedIncident | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const lastKnownAlertIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        isNavigatingRef.current = true;
        setView(event.state.view);
        setTimeout(() => { isNavigatingRef.current = false; }, 50);
      }
    };

    window.addEventListener('popstate', handlePopState);
    if (view && (!window.history.state || window.history.state.view !== view)) {
      window.history.replaceState({ view }, '');
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

  useEffect(() => {
    if (!isInitialized || isNavigatingRef.current) return;
    const currentState = window.history.state;
    if (!currentState || currentState.view !== view) {
      window.history.pushState({ view }, '');
    }
  }, [view, isInitialized]);

  useEffect(() => {
    if (printingIncident) {
      const handleAfterPrint = () => {
        setPrintingIncident(null);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      const printTimeout = setTimeout(() => { window.print(); }, 500);
      return () => {
        clearTimeout(printTimeout);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [printingIncident]);

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
      // Skip if Airtable is not configured (prevents silent failures)
      if (!baseId || !AIRTABLE_CONFIG.API_KEY) {
        console.warn('Notification Monitor: Airtable credentials not configured. Skipping task sync.');
        return;
      }
      try {
        const tasks = await getAssignedCriticalObservations(userProfile.name, { baseId });
        const allReports = await getAllReports({ baseId });
        const isSafetyLead = AUTHORIZED_ADMIN_ROLES.includes(userProfile.role.toLowerCase()) || 
                             userProfile.role.toLowerCase().includes('safety');
        const now = Date.now();
        const ESCALATION_THRESHOLD = 48 * 60 * 60 * 1000;
        const alerts: SystemAlert[] = [];
        tasks.forEach(task => {
          alerts.push({
            id: `crit-${task.id}`, type: 'critical-task',
            title: task.fields["Observation Type"] || "Hazard Assignment",
            description: `Immediate corrective action required by you.`,
            site: task.fields["Site / Location"] || "Site Alpha",
            timestamp: task.createdTime, originalRecord: task
          });
        });
        if (isSafetyLead) {
          allReports.forEach(report => {
            const isUnresolved = !report.fields["Action taken"] || report.fields["Action taken"].trim().length === 0;
            const reportAge = now - new Date(report.createdTime).getTime();
            if (isUnresolved && reportAge > ESCALATION_THRESHOLD) {
              alerts.push({
                id: `esc-${report.id}`, type: 'escalated-overdue',
                title: `ESCALATION: ${report.fields["Observation Type"]}`,
                description: `Remains unresolved after 48 hours. Review required.`,
                site: report.fields["Site / Location"] || "Site Alpha",
                timestamp: report.createdTime, originalRecord: report
              });
            }
          });
        }
        setActiveAlerts(alerts);
        alerts.forEach(alert => {
          if (!lastKnownAlertIds.current.has(alert.id)) {
            lastKnownAlertIds.current.add(alert.id);
            sendNotification(alert.type === 'escalated-overdue' ? "SYSTEM ESCALATION" : "CRITICAL HAZARD ASSIGNED", alert.title, true);
            if (alert.type === 'escalated-overdue') sendToast(alert.title, "critical", alert.id);
            setIsBellShaking(true);
            setIsBadgePinging(true);
            setTimeout(() => { setIsBellShaking(false); setIsBadgePinging(false); }, 6000);
          }
        });
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
    if (userProfile && !localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN)) setShowTutorial(true);
    requestNotificationPermission();
    setIsInitialized(true);
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light';
    if (savedTheme) { setAppTheme(savedTheme); applyTheme(savedTheme); }
    const handleStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) attemptSync();
    };
    const handleProfileUpdate = () => {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) { try { setUserProfile(JSON.parse(saved)); } catch (e) {} }
    };
    const handleThemeChange = (e: any) => {
      const newTheme = e.detail;
      setAppTheme(newTheme);
      applyTheme(newTheme);
    };
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsFabVisible(false); setIsMenuOpen(false); 
      } else { setIsFabVisible(true); }
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
  }, [baseId, userProfile]);

  const attemptSync = async () => {
    try {
        const count = await runOfflineSync(baseId);
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

  const renderContent = () => {
    if (view === 'auth') return <AuthScreen onAuthComplete={handleAuthComplete} appTheme={appTheme} />;
    switch (view) {
      case 'create': return <CreateReportForm baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'recent': return <RecentReports baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} onPrint={setPrintingIncident} />;
      case 'my-tasks': return <RecentReports baseId={baseId} appTheme={appTheme} onBack={() => setView('dashboard')} filterAssignee={userProfile?.name} onPrint={setPrintingIncident} />;
      case 'personnel': return <PersonnelGrid appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'checklists': return <Checklists appTheme={appTheme} onBack={() => setView('dashboard')} onOpenInspection={(url) => {setActiveInspectionUrl(url); setView('inspection-viewer');}} onOpenCrane={() => setView('crane-checklist')} onOpenEquipment={() => setView('equipment-checklist')} />;
      case 'inspection-viewer': return <InspectionViewer url={activeInspectionUrl} appTheme={appTheme} onBack={() => setView('checklists')} />;
      case 'risk-assessment': return <RiskAssessmentModule appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'training-management': return <TrainingManagement appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'compliance-tracker': return <ComplianceTracker appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'audit-trail': return <AuditLogViewer appTheme={appTheme} onBack={() => setView('dashboard')} />;
      case 'crane-checklist': return <CraneChecklistForm appTheme={appTheme} onBack={() => setView('checklists')} />;
      case 'equipment-checklist': return <EquipmentChecklistForm appTheme={appTheme} onBack={() => setView('checklists')} />;
      case 'incident-report': return <IncidentReportForm appTheme={appTheme} onBack={() => setView('dashboard')} />;
      default: return <Dashboard baseId={baseId} appTheme={appTheme} onNavigate={(target) => setView(target)} />;
    }
  };

  if (!isInitialized) return null;

  return (
    <>
      {printingIncident && <div className="printable-report-container"><PrintableIncidentReport incident={printingIncident} /></div>}
      <div className={`printable-hidden min-h-screen transition-colors duration-300 relative selection:bg-blue-500/30 overflow-x-hidden flex flex-col ${appTheme === 'dark' ? 'bg-[#020617]' : 'bg-white'}`}>
        <NotificationSystem appTheme={appTheme} onViewTask={(id) => { setView('recent'); window.location.hash = `view-report-${id}`; }} />
        <div className={`relative z-10 flex flex-col flex-grow ${view === 'inspection-viewer' ? 'h-auto overflow-visible' : ''}`}>
          <header className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all duration-300 ${appTheme === 'dark' ? 'bg-[#020617]/90 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'} ${(view === 'auth' || view === 'inspection-viewer') ? 'hidden' : ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
               <div className="flex-1 flex justify-start">
                 <div onClick={() => setView('dashboard')} className="group cursor-pointer">
                   <img src={SYSTEM_LOGO_URL} alt="Logo" className="h-20 sm:h-32 w-auto object-contain drop-shadow-2xl transition-all duration-500 group-hover:scale-110 origin-left" />
                 </div>
               </div>
               <div className="flex flex-[4] flex-col items-center group cursor-pointer" onClick={() => setView('dashboard')}>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-center">
                    <span className={appTheme === 'dark' ? 'text-white' : 'text-slate-900'}>HSE</span><span className="text-blue-500">GUARDIAN</span>
                  </h1>
                  <div className="h-1.5 w-24 sm:w-40 bg-red-600 mt-1 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)] transition-all duration-500 group-hover:w-32 sm:group-hover:w-48"></div>
               </div>
               <div className="flex-1 flex justify-end items-center gap-2 sm:gap-6 relative">
                 {userProfile && (
                   <div ref={notificationsRef} className="relative">
                     <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2.5 rounded-xl transition-all flex items-center justify-center ${isBellShaking ? 'bell-swing-animate' : (activeAlerts.length > 0 ? 'bell-tasks-active' : '')} ${appTheme === 'dark' ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-50 hover:text-slate-900'}`}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        {activeAlerts.length > 0 && <div className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-[11px] font-black text-white ring-2 ring-[#020617]"><span className="badge-ping-layer" />{activeAlerts.length}</div>}
                     </button>
                     {showNotifications && (
                       <div className={`absolute top-full right-0 mt-4 w-72 sm:w-80 rounded-[2rem] border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ${appTheme === 'dark' ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'}`}>
                          <div className={`px-6 py-4 border-b flex items-center justify-between ${appTheme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                             <span className={`text-[10px] font-black uppercase tracking-widest ${appTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Safety Alerts</span>
                             <span className="bg-rose-600/10 text-rose-500 border border-rose-500/20 text-[8px] font-black px-2.5 py-1 rounded-full uppercase">{activeAlerts.length} Active</span>
                          </div>
                          <div className="max-h-80 overflow-y-auto scrollbar-hide">
                             {activeAlerts.length === 0 ? <div className="p-12 text-center opacity-30 flex flex-col items-center gap-3"><p className="text-[10px] font-black uppercase">Zero Threats Detected</p></div> : 
                               activeAlerts.map(alert => (
                                 <div key={alert.id} onClick={() => { if (alert.type === 'critical-task') setView('my-tasks'); else { setView('recent'); window.location.hash = `view-report-${alert.originalRecord.id}`; } setShowNotifications(false); }} className={`p-5 border-b cursor-pointer transition-all last:border-0 group ${appTheme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>
                                   <div className="flex items-start gap-4">
                                     <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${alert.type === 'escalated-overdue' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                        {alert.type === 'escalated-overdue' ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <p className={`text-[11px] font-black truncate ${appTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{alert.title}</p>
                                        <span className="text-[8px] font-black text-slate-500">{getRelativeTime(alert.timestamp)}</span>
                                     </div>
                                   </div>
                                 </div>
                               ))}
                          </div>
                       </div>
                     )}
                   </div>
                 )}
                 <div ref={profileCardRef} className="relative">
                   <div onClick={() => setShowProfileCard(!showProfileCard)} className="cursor-pointer group">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 transition-all ${showProfileCard ? 'border-blue-500 ring-4 ring-blue-500/20 scale-105' : 'border-slate-700'}`}>
                        {userProfile?.profileImageUrl ? <img src={userProfile.profileImageUrl} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-xl">{userProfile?.name?.charAt(0)}</div>}
                      </div>
                   </div>
                   {showProfileCard && <div className="absolute top-full right-0 mt-4 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-300"><UserProfile onBack={() => setShowProfileCard(false)} baseId={baseId} /></div>}
                 </div>
               </div>
            </div>
          </header>
          <main className={`flex-grow ${view === 'inspection-viewer' ? 'p-0 max-w-none' : 'max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full'}`}>{renderContent()}</main>
          <footer className={`py-6 px-4 border-t text-center ${appTheme === 'dark' ? 'bg-slate-950/30 border-white/5' : 'bg-slate-50 border-slate-100'} ${view === 'auth' ? 'hidden' : ''}`}>
            <div className="max-w-7xl mx-auto flex flex-col items-center gap-2">
              <div className="px-4 py-2 rounded-full border border-red-600/40 text-[9px] font-black uppercase text-red-500 italic">"{quote}"</div>
              <p className="text-[8px] font-black text-slate-600 uppercase">&copy; ELIUS 2025 \u2022 ACCURACY IN EVIDENCE</p>
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
        <CookieBanner appTheme={appTheme} onViewDetails={() => { setPolicyInitialTab('cookies'); setShowPolicy(true); }} />
      </div>
    </>
  );
}