import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { handleError } from './utils/errorHandler';

// Global error handlers for uncaught errors
window.addEventListener('error', (event) => {
  handleError(event.error || event.message, {
    type: 'uncaught-error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  handleError(event.reason, {
    type: 'unhandled-promise-rejection'
  });
  // Prevent default console error
  event.preventDefault();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const BYPASS_KEY = 'hse_guardian_bypass_sw';

// Enhanced SW Handling for Git-Safe Environments
const initServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;

  const isBypassed = localStorage.getItem(BYPASS_KEY) === 'true';

  try {
    if (isBypassed) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('HSE Guardian: SW Deactivated for Git Stability');
    } else {
      // Uncomment to re-enable PWA features in stable production environments
      /*
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(() => {
          console.log('HSE Guardian: SW Active');
        });
      });
      */
    }
  } catch (err) {
    console.warn('HSE Guardian: SW Setup skipped:', err);
  }
};

initServiceWorker();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);