import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { SafeFallback } from '../../components/SafeFallback';
import { initDB } from '../../lib/db';

const Login = lazy(() => import('./Login'));
const CustomerDashboard = lazy(() => import('./CustomerDashboard'));
const MerchantDashboard = lazy(() => import('./MerchantDashboard'));

export default function PwaApp() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Base path for PWA (either /app or / depending on deployment)
  const isTargeted = !!import.meta.env.VITE_APP_TARGET || (typeof window !== 'undefined' && window.location && (window.location.hostname.includes('pwa') || window.location.hostname.includes('merchant') || window.location.hostname.includes('app')));
  const basePath = isTargeted ? '' : '/app';

  useEffect(() => {
    // Basic service worker registration stub
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
         console.warn('SW registration failed:', err);
      });
    }

    initDB().catch(console.error);

    const checkSession = async () => {
      try {
        // Safety timeout to ensure app never gets stuck in loading state
        const safetyTimeout = setTimeout(() => setLoading(false), 3000);

        const savedPhone = localStorage.getItem('nx_pwa_phone');
        if (savedPhone) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', savedPhone)
            .maybeSingle();
          
          if (data) {
            setUser(data);
          } else {
            localStorage.removeItem('nx_pwa_phone');
          }
        }
        clearTimeout(safetyTimeout);
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-updates-${user.phone}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `phone=eq.${user.phone}`
      }, (payload) => {
        console.log('User updated in real-time:', payload.new);
        setUser((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-nx-ink flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-nx-amber border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-nx-ink text-nx-paper font-sans selection:bg-nx-amber selection:text-nx-ink flex flex-col">
      <div className="w-full flex-1 bg-nx-ink relative flex flex-col">
        <SafeFallback>
          <Suspense fallback={
            <div className="min-h-[100dvh] bg-nx-ink flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-nx-amber border-t-transparent rounded-full animate-spin"></div>
              <div className="font-display text-sm tracking-[0.2em] text-nx-amber/50 animate-pulse uppercase">
                Loading secure view...
              </div>
            </div>
          }>
            <Routes>
              <Route index element={<Navigate to="login" replace />} />
              <Route 
                path="login" 
                element={!user ? <Login onLogin={setUser} /> : <Navigate to={user.role === 'customer' ? '../customer' : '../merchant'} replace />} 
              />
              <Route 
                path="customer" 
                element={user?.role === 'customer' ? <CustomerDashboard user={user} onLogout={() => { setUser(null); localStorage.removeItem('nx_pwa_phone'); }} /> : <Navigate to="../login" replace />} 
              />
              <Route 
                path="merchant" 
                element={user?.role !== 'customer' && user ? <MerchantDashboard user={user} onLogout={() => { setUser(null); localStorage.removeItem('nx_pwa_phone'); }} /> : <Navigate to="../login" replace />} 
              />
              <Route path="*" element={<Navigate to="login" replace />} />
            </Routes>
          </Suspense>
        </SafeFallback>
      </div>
    </div>
  );
}
