import React, { useState, useEffect } from 'react';
import { AIRTABLE_CONFIG, SAFETY_QUOTES } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { Dashboard } from './components/Dashboard';
import { syncOfflineReports } from './services/syncService';

type ViewState = 'dashboard' | 'create' | 'recent';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [baseId, setBaseId] = useState(AIRTABLE_CONFIG.BASE_ID);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  const [quote, setQuote] = useState('');
  
  // Check if configuration is needed
  const needsConfig = baseId.includes('YourBaseId') || !baseId;

  useEffect(() => {
    // Select a random safety quote
    setQuote(SAFETY_QUOTES[Math.floor(Math.random() * SAFETY_QUOTES.length)]);

    const handleStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        // Trigger sync when coming online
        attemptSync();
      }
    };

    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    // Attempt sync on initial load if online
    if (navigator.onLine) {
        attemptSync();
    }

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, [baseId]);

  const attemptSync = async () => {
    try {
        const count = await syncOfflineReports(baseId);
        if (count > 0) {
            setSyncCount(count);
            // Clear message after 5 seconds
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
      className="min-h-screen pb-12 bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: 'url("https://hsseworld.com/wp-content/uploads/2024/05/HSE-Working-conditions-at-workplace-3.png")' }}
    >
      {/* Dynamic Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/70 z-0"></div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all duration-300">
          <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-3 items-center">
             {/* Left Section: Logo */}
             <div className="flex justify-start">
               <img 
                 src="https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png" 
                 alt="TGC Logo" 
                 className="h-32 w-32 object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:scale-105 transition-all cursor-pointer filter brightness-110"
                 onClick={() => setView('dashboard')}
               />
             </div>

             {/* Center Section: Centered Title with Decorative Bars */}
             <div className="flex flex-col items-center">
               {/* Upper Bar */}
               <div className="w-32 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent mb-3 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
               
               <div className="flex flex-col items-center text-center">
                 <h1 
                   className="text-4xl font-black text-white tracking-tight drop-shadow-lg leading-none cursor-pointer hover:text-blue-100 transition-colors" 
                   onClick={() => setView('dashboard')}
                 >
                   HSE <span className="text-blue-400">Guardian</span>
                 </h1>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 opacity-70">
                   Safety Acquisition System
                 </p>
               </div>

               {/* Lower Bar */}
               <div className="w-32 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent mt-3 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
             </div>
             
             {/* Right Section: Navigation Button */}
             <div className="flex justify-end">
               {view !== 'dashboard' && (
                  <button 
                    onClick={() => setView('dashboard')}
                    className="text-xs font-bold text-white uppercase tracking-widest bg-blue-600/80 hover:bg-blue-600 backdrop-blur-md rounded-full px-6 py-3 flex items-center gap-2 transition-all shadow-lg border border-white/20 active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    Dashboard
                  </button>
               )}
             </div>
          </div>
          
          {/* Status Banners */}
          {!isOnline && (
            <div className="bg-amber-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-tighter text-center py-1 border-t border-white/5">
                Offline Mode Active • Saved to local outbox
            </div>
          )}
          {syncCount > 0 && isOnline && (
            <div className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-tighter text-center py-1 animate-in slide-in-from-top-0 border-t border-white/5">
                Connection Restored • Synced {syncCount} reports
            </div>
          )}
        </header>

        <main className="max-w-3xl mx-auto px-4 pt-8 flex-grow w-full">
          {needsConfig && (
            <div className="mb-8 bg-amber-500/10 backdrop-blur-lg border border-amber-500/30 p-6 rounded-2xl shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">System Configuration</h3>
              <input 
                type="text" 
                value={baseId} 
                onChange={(e) => setBaseId(e.target.value)}
                placeholder="Airtable Base ID (appXXXXXXXXXX)"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-amber-500 outline-none placeholder-slate-600 transition-all"
              />
              <p className="mt-3 text-[10px] text-amber-500/70 font-medium">Please provide your Airtable Base ID to enable database syncing.</p>
            </div>
          )}

          {renderContent()}
        </main>

        <footer className="py-10 px-4 max-w-3xl mx-auto w-full flex flex-col items-center gap-6">
           {quote && (
             <div className="w-full max-w-xl text-center px-6 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg">
                <p className="text-slate-300 italic font-medium text-sm leading-relaxed">
                  {quote}
                </p>
             </div>
           )}
           <div className="w-full flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-widest border-t border-white/5 pt-6">
             <p className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}></span>
                {isOnline ? 'Network Connected' : 'Local Storage Only'}
             </p>
             <p>© 2025 Incident Image Taking System</p>
           </div>
        </footer>
      </div>
    </div>
  );
}

export default App;