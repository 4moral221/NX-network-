import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { SafeFallback } from './components/SafeFallback';
import { initGlobalHaptics } from './lib/haptics';

// Initialize tactile haptic feedback for buttons, links and touch targets
initGlobalHaptics();

// Recover dynamically from Vite code-splitting chunk load failures caused by code redeployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload/chunk load error detected, reloading page for latest assets...', event);
  const lastReload = sessionStorage.getItem('nx-preload-retry');
  const now = Date.now();
  // Prevent infinite reload loops (retries once within a 15-second window)
  if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
    sessionStorage.setItem('nx-preload-retry', now.toString());
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SafeFallback>
      <App />
    </SafeFallback>
  </StrictMode>,
);
