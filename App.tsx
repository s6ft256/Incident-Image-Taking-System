import React, { useState, useEffect } from 'react';
import { AIRTABLE_CONFIG } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { HSEAssistant } from './components/HSEAssistant';
import { Dashboard } from './components/Dashboard';
import { syncOfflineReports } from './services/syncService';

type ViewState = 'dashboard' | 'create' | 'recent';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [baseId, setBaseId] = useState(AIRTABLE_CONFIG.BASE_ID);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCount, setSyncCount] = useState(0);
  
  // Check if configuration is needed
  const needsConfig = baseId.includes('YourBaseId') || !baseId;

  useEffect(() => {
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
      {/* Background Overlay - Reduced opacity for better visibility */}
      <div className="absolute inset-0 bg-slate-950/80 z-0"></div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-[#172554] border-b border-blue-700/50 shadow-xl transition-colors duration-300">
          <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <h1 className="text-3xl font-extrabold text-white tracking-wide drop-shadow-md" onClick={() => setView('dashboard')} style={{cursor: 'pointer'}}>
                 Incident Reporter
               </h1>
             </div>
             
             {view !== 'dashboard' && (
                <button 
                  onClick={() => setView('dashboard')}
                  className="text-xs font-semibold text-blue-100 hover:text-white uppercase tracking-wider border border-blue-600 hover:bg-blue-800 rounded px-3 py-1.5 flex items-center gap-1 transition-all shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Dashboard
                </button>
             )}
          </div>
          
          {/* Offline / Sync Status Banner */}
          {!isOnline && (
            <div className="bg-amber-600 text-white text-xs font-bold text-center py-1">
                You are currently offline. Application is running in limited mode.
            </div>
          )}
          
          {/* Sync Success Notification */}
          {syncCount > 0 && isOnline && (
            <div className="bg-green-600 text-white text-xs font-bold text-center py-1 animate-in slide-in-from-top-0 duration-500">
                Connection Restored: Successfully synced {syncCount} offline report{syncCount > 1 ? 's' : ''}.
            </div>
          )}
        </header>

        <main className="max-w-3xl mx-auto px-4 pt-8 flex-grow w-full">
          {needsConfig && (
            <div className="mb-8 bg-amber-900/50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
              <div className="flex items-start">
                <div className="w-full">
                  <h3 className="text-sm font-medium text-amber-100">Configuration Needed</h3>
                  <div className="mt-2 text-sm text-amber-200">
                    <p className="mb-2">The App needs your Airtable Base ID to function.</p>
                    <input 
                      type="text" 
                      value={baseId} 
                      onChange={(e) => setBaseId(e.target.value)}
                      placeholder="appXXXXXXXXXXXXXX"
                      className="w-full rounded-md border border-amber-700 bg-amber-950/50 px-3 py-2 text-sm text-amber-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-amber-500/50"
                    />
                    <p className="mt-1 text-xs text-amber-400">Find this in your Airtable API documentation.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {renderContent()}
        </main>

        <footer className="py-6 px-4 max-w-3xl mx-auto w-full flex justify-between items-center text-slate-500 text-xs">
           <p>Secure • Mobile-First • {isOnline ? 'Cloud-Synced' : 'Offline Mode'}</p>
           <p>© 2025 Elius</p>
        </footer>
        
        {/* Floating HSE Assistant - Always available */}
        <HSEAssistant />
      </div>
    </div>
  );
}

export default App;