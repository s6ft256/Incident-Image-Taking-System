import React, { useState } from 'react';
import { AIRTABLE_CONFIG } from './constants';
import { CreateReportForm } from './components/CreateReportForm';
import { RecentReports } from './components/RecentReports';
import { HSEAssistant } from './components/HSEAssistant';
import { Dashboard } from './components/Dashboard';

type ViewState = 'dashboard' | 'create' | 'recent';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [baseId, setBaseId] = useState(AIRTABLE_CONFIG.BASE_ID);
  
  // Check if configuration is needed
  const needsConfig = baseId.includes('YourBaseId') || !baseId;

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
        <header className="sticky top-0 z-20 bg-blue-950/90 backdrop-blur border-b border-blue-800 shadow-md">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
               {/* Icon removed */}
               <h1 className="text-3xl font-extrabold text-white tracking-wide" onClick={() => setView('dashboard')} style={{cursor: 'pointer'}}>
                 Incident Reporter
               </h1>
             </div>
             
             {view !== 'dashboard' && (
                <button 
                  onClick={() => setView('dashboard')}
                  className="text-xs font-semibold text-blue-200 hover:text-white uppercase tracking-wider border border-blue-800 rounded px-2 py-1 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Dashboard
                </button>
             )}
          </div>
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
           <p>Secure • Mobile-First • Cloud-Synced</p>
           <p>© 2025 Elius</p>
        </footer>
        
        {/* Floating HSE Assistant - Always available */}
        <HSEAssistant />
      </div>
    </div>
  );
}

export default App;