import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DeveloperAuthModal from './DeveloperAuthModal';
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import NXLogo from './NXLogo';

interface DeveloperGuardProps {
  children: React.ReactNode;
}

export function useDeveloperSession() {
  const [user, setUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('nx_dev_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('nx_dev_auth_token'));
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    async function checkSession() {
      const storedToken = localStorage.getItem('nx_dev_auth_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setChecking(false);
        return;
      }

      try {
        const res = await fetch('/api/dev/me', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          setUser(data.user);
          setToken(storedToken);
          localStorage.setItem('nx_dev_user', JSON.stringify(data.user));
        } else {
          localStorage.removeItem('nx_dev_auth_token');
          localStorage.removeItem('nx_dev_user');
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error("Dev session verify error:", err);
      } finally {
        setChecking(false);
      }
    }

    checkSession();
  }, []);

  const logout = () => {
    localStorage.removeItem('nx_dev_auth_token');
    localStorage.removeItem('nx_dev_user');
    setUser(null);
    setToken(null);
  };

  return { user, token, checking, setUser, setToken, logout };
}

export default function DeveloperGuard({ children }: DeveloperGuardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const devTokenParam = searchParams.get('dev_token');
  const navigate = useNavigate();

  const { user, token, checking, setUser, setToken, logout } = useDeveloperSession();
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Magic Link verification on route load
  useEffect(() => {
    if (devTokenParam) {
      async function verifyMagicToken() {
        setVerifyingToken(true);
        setVerificationError(null);
        try {
          const res = await fetch('/api/dev/verify-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: devTokenParam })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            localStorage.setItem('nx_dev_auth_token', data.sessionToken);
            localStorage.setItem('nx_dev_user', JSON.stringify(data.user));
            setUser(data.user);
            setToken(data.sessionToken);

            // Clean up query param
            searchParams.delete('dev_token');
            setSearchParams(searchParams, { replace: true });
          } else {
            setVerificationError(data.error || 'Invalid or expired magic link token.');
          }
        } catch (err: any) {
          setVerificationError(err.message || 'Failed to verify magic link token.');
        } finally {
          setVerifyingToken(false);
        }
      }

      verifyMagicToken();
    }
  }, [devTokenParam]);

  if (checking || verifyingToken) {
    return (
      <div className="min-h-screen bg-nx-ink flex flex-col items-center justify-center p-6 text-nx-paper font-sans">
        <div className="w-12 h-12 rounded-2xl bg-nx-amber/10 border border-nx-amber/20 flex items-center justify-center text-nx-amber mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="font-display uppercase tracking-tight text-sm text-nx-paper">Verifying Developer Credentials...</h3>
        <p className="text-xs text-nx-muted mt-1">Authenticating session token &amp; magic link verification</p>
      </div>
    );
  }

  // If user is authenticated & verified, render developer docs with developer header badge
  if (user && token) {
    return (
      <div className="relative">
        {/* Developer Session Verified Banner */}
        <div className="bg-nx-card border-b border-nx-border px-4 py-2 flex items-center justify-between text-xs text-nx-paper z-[60] relative">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-nx-amber shadow-[0_0_8px_#ffb547]" />
            <span className="font-mono text-[11px] text-nx-muted">Developer Account:</span>
            <span className="font-mono font-bold text-nx-paper">{user.email}</span>
            <span className="px-2 py-0.5 rounded bg-nx-amber/10 border border-nx-amber/20 text-nx-amber text-[10px] font-bold uppercase tracking-wider">
              Verified
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-nx-ink border border-nx-border text-nx-muted hover:text-nx-paper hover:bg-nx-card2 transition-colors text-[11px] font-mono cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
        {children}
      </div>
    );
  }

  // Unauthenticated view gate for /docs*
  return (
    <div className="min-h-screen bg-nx-ink font-sans text-nx-paper flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--nx-bg-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--nx-bg-grid)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-nx-amber/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full bg-nx-card border border-nx-border rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-nx-amber/10 border border-nx-amber/20 flex items-center justify-center text-nx-amber mx-auto mb-6">
          <KeyRound className="w-7 h-7" />
        </div>

        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-nx-amber mb-2">
          NX Developer Portal
        </div>

        <h2 className="font-display text-3xl uppercase tracking-tight text-nx-paper mb-3">
          Developer Account Required
        </h2>

        <p className="text-xs text-nx-muted leading-relaxed mb-6">
          To view NX Network API documentation, Logistics API endpoints, and Sales Analytics specs, you must create a developer account with email validation via Resend magic link.
        </p>

        {verificationError && (
          <div className="mb-6 p-3 rounded-xl bg-nx-ember/10 border border-nx-ember/30 text-xs text-nx-ember flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{verificationError}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3 px-6 rounded-xl bg-nx-amber text-nx-ink font-bold text-xs uppercase tracking-wider hover:bg-nx-amber/90 transition-all shadow-md cursor-pointer"
          >
            Create Developer Account or Sign In
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-nx-card2 border border-nx-border text-nx-muted hover:text-nx-paper hover:bg-nx-card2/80 transition-colors text-xs font-mono cursor-pointer"
          >
            &larr; Return to NX Network Home
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      <DeveloperAuthModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(usr, tkn) => {
          setUser(usr);
          setToken(tkn);
        }}
      />
    </div>
  );
}
