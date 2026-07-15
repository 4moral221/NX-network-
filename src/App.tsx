import { useState, useEffect, Component, ReactNode, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Lazy loading to ensure the main chunk is small and app doesn't hang on 'INITIALIZING' screen for slow connections
import ThemeSwitcher from './components/ThemeSwitcher';
import NetworkStatus from './components/NetworkStatus';
import OnboardingScreen from './components/OnboardingScreen';

const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const MerchantPortal = lazy(() => import('./pages/merchant/MerchantPortal'));
const PartnersPortal = lazy(() => import('./pages/partners_portal/PartnersPortal'));
const FmcgsPortal = lazy(() => import('./pages/fmcgs_portal/FmcgsPortal'));
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal'));
const ControlCenter = lazy(() => import('./pages/control/ControlCenter'));
const UssdSimulator = lazy(() => import('./pages/simulator/UssdSimulator'));
const PwaApp = lazy(() => import('./pages/pwa/PwaApp'));
const FmcgOnboarding = lazy(() => import('./pages/fmcg_onboarding/OnboardingApp'));
const LogisticsApiDocs = lazy(() => import('./pages/docs/LogisticsApiDocs'));

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  public state: {hasError: boolean, error: Error | null} = { hasError: false, error: null };
  public props: {children: ReactNode};

  constructor(props: {children: ReactNode}) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const errorStr = this.state.error?.toString() || '';
      const isChunkLoadFailed = 
        errorStr.includes('Failed to fetch dynamically imported module') ||
        errorStr.includes('Loading chunk') ||
        errorStr.includes('ChunkLoadError') ||
        errorStr.includes('preload');

      return (
        <div className="min-h-[100dvh] bg-[#060810] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md bg-[#0a0d1a] border border-red-500/20 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(239,68,68,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(239,68,68,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 text-xl font-bold font-mono">
                !
              </div>
              
              <div className="space-y-2">
                <h2 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white/90">
                  {isChunkLoadFailed ? 'New Updates Available' : 'Something went wrong'}
                </h2>
                <p className="text-[11px] text-white/50 leading-relaxed uppercase tracking-wider">
                  {isChunkLoadFailed 
                    ? 'A newer version of NX Network is live. Let\'s pull the latest secure assets.' 
                    : 'An unexpected application error has been intercepted.'}
                </p>
              </div>

              <div className="bg-[#0e1227] border border-white/5 p-4 rounded-xl text-left overflow-auto max-h-48">
                <pre className="font-mono text-[10px] text-red-400 whitespace-pre-wrap">{errorStr}</pre>
                {this.state.error?.stack && (
                  <pre className="font-mono text-[9px] text-white/30 whitespace-pre-wrap mt-2 select-all leading-normal">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>

              <button
                id="error-reload-btn"
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-[#00ff88] text-black font-mono text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#00e67a] active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_20px_rgba(0,255,136,0.15)]"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}

function PageLoader() {
  return (
    <div className="min-h-[100dvh] bg-nx-ink flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-nx-amber animate-spin" />
      <div className="font-display text-sm tracking-[0.2em] text-nx-amber/50 animate-pulse">
        NX NETWORK LOADING...
      </div>
    </div>
  );
}

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Resolve target prioritizing the browser's hostname to bypass any environmental/cache propagation quirks on Vercel.
  // Falls back to build-time VITE_APP_TARGET when hostname is non-specific (like localhost or AI Studio Cloud Run preview).
  const getTarget = () => {
    const envTarget = import.meta.env.VITE_APP_TARGET;
    if (envTarget) {
      if (envTarget === 'landing' || envTarget === 'partners' || envTarget === 'fmcg' || envTarget === 'merchant') {
        return 'main';
      }
      return envTarget;
    }

    if (typeof window !== 'undefined' && window.location) {
      let hostname = window.location.hostname.toLowerCase();
      
      // If we are on local development or AI Studio preview environments (e.g. Cloud Run, localhost, WebContainers, etc.),
      // always default to the unified build so that all portal views are fully accessible.
      if (
        hostname.includes('localhost') || 
        hostname.includes('127.0.0.1') || 
        hostname.includes('.run.app') || 
        hostname.includes('aistudio') ||
        hostname.includes('webcontainer')
      ) {
        return undefined;
      }
      
      // Remove Vercel / APP domain suffixes to prevent '.vercel.app' from matching 'app' target
      if (hostname.endsWith('.vercel.app')) {
        hostname = hostname.slice(0, -11);
      } else if (hostname.endsWith('.app')) {
        hostname = hostname.slice(0, -4);
      }

      if (hostname.includes('admin')) {
        return 'admin';
      }
      if (hostname.includes('pwa') || hostname.includes('app')) {
        return 'pwa';
      }
      if (
        hostname.includes('landing') || 
        hostname.includes('main') || 
        hostname.includes('partners') || 
        hostname.includes('fmcg') || 
        hostname.includes('merchant') || 
        hostname.includes('hub')
      ) {
        return 'main';
      }
    }

    return undefined;
  };

  const target = getTarget();

  useEffect(() => {
    // Artificial delay to allow fonts and styles to settle
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) return <PageLoader />;

  // Portals filtering logic
  const getRoutes = () => {
    if (target === 'admin') {
      return (
        <>
          <Route path="/admin/*" element={<AdminPortal />} />
          <Route path="/control" element={<ControlCenter />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </>
      );
    }
    if (target === 'pwa') {
      return (
        <>
          <Route path="/hub/*" element={<MerchantPortal />} />
          <Route path="/app/*" element={<PwaApp />} />
          <Route path="/" element={<Navigate to="/app" replace />} />
        </>
      );
    }
    if (target === 'main') {
      return (
        <>
          <Route path="/" element={<LandingPage />} />
          <Route path="/fmcg-onboarding" element={<FmcgOnboarding />} />
          <Route path="/hub/*" element={<MerchantPortal />} />
          <Route path="/partners/*" element={<PartnersPortal />} />
          <Route path="/fmcgs/*" element={<FmcgsPortal />} />
          <Route path="/app/*" element={<PwaApp />} />
          <Route path="/sim" element={<UssdSimulator />} />
          <Route path="/docs/logistics-partners" element={<LogisticsApiDocs />} />
        </>
      );
    }

    // Default Unified Build (Development/Internal)
    return (
      <>
        <Route path="/" element={<LandingPage />} />
        <Route path="/fmcg-onboarding" element={<FmcgOnboarding />} />
        <Route path="/hub/*" element={<MerchantPortal />} />
        <Route path="/partners/*" element={<PartnersPortal />} />
        <Route path="/fmcgs/*" element={<FmcgsPortal />} />
        <Route path="/admin/*" element={<AdminPortal />} />
        <Route path="/app/*" element={<PwaApp />} />
        <Route path="/sim" element={<UssdSimulator />} />
        <Route path="/control" element={<ControlCenter />} />
        <Route path="/docs/logistics-partners" element={<LogisticsApiDocs />} />
      </>
    );
  };

  return (
    <ErrorBoundary>
      <Router>
        <NetworkStatus />
        <ThemeSwitcher />
        <OnboardingScreen>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {getRoutes()}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </OnboardingScreen>
      </Router>
    </ErrorBoundary>
  );
}

