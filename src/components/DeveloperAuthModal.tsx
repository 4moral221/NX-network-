import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, Mail, Lock, ShieldCheck, ArrowRight, X, Loader2, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface DeveloperAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  initialTab?: 'signup' | 'login';
  redirectPath?: string;
}

export default function DeveloperAuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'signup',
  redirectPath = '/docs'
}: DeveloperAuthModalProps) {
  const [tab, setTab] = useState<'signup' | 'login'>(initialTab);
  
  // Sign Up form fields (Email, Password, Confirm Password)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<{
    sent: boolean;
    email: string;
    message: string;
    simulatedLink?: string;
  } | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setError(null);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/dev/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create developer account');
      }

      setSuccessState({
        sent: true,
        email: data.email || email,
        message: data.message,
        simulatedLink: data.simulated_magic_link
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.status === 403 && data.unverified) {
        setSuccessState({
          sent: true,
          email,
          message: data.error || 'Your developer account is not verified yet. A magic link has been sent to your email.',
          simulatedLink: data.simulated_magic_link
        });
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      // Store auth in localStorage
      localStorage.setItem('nx_dev_auth_token', data.sessionToken);
      localStorage.setItem('nx_dev_user', JSON.stringify(data.user));

      onSuccess(data.user, data.sessionToken);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendMagicLink = async () => {
    if (!successState?.email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev/resend-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: successState.email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend magic link');
      }
      setSuccessState(prev => prev ? ({
        ...prev,
        message: data.message,
        simulatedLink: data.simulated_magic_link || prev.simulatedLink
      }) : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedVerify = async () => {
    if (!successState?.simulatedLink) return;
    try {
      const url = new URL(successState.simulatedLink);
      const token = url.searchParams.get('dev_token');
      if (!token) return;

      setLoading(true);
      const res = await fetch('/api/dev/verify-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('nx_dev_auth_token', data.sessionToken);
        localStorage.setItem('nx_dev_user', JSON.stringify(data.user));
        onSuccess(data.user, data.sessionToken);
        onClose();
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-nx-ink/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-nx-card border border-nx-border rounded-2xl shadow-2xl overflow-hidden z-10 text-nx-paper"
        >
          {/* Top Bar Accent */}
          <div className="h-1 w-full bg-linear-to-r from-nx-amber via-nx-ember to-nx-amber" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-nx-ink border border-nx-border text-nx-muted hover:text-nx-paper hover:bg-nx-card2 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-nx-amber/10 border border-nx-amber/20 flex items-center justify-center text-nx-amber shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-xl uppercase tracking-tight text-nx-paper leading-tight">
                  Developer Account Access
                </h3>
                <p className="text-xs text-nx-muted mt-0.5">
                  Required to view NX Network APIs &amp; Developer Docs
                </p>
              </div>
            </div>

            {/* Email Magic Link Sent State */}
            {successState?.sent ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-nx-green/10 border border-nx-green/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-nx-green shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-nx-green">Magic Link Verification Sent</h4>
                    <p className="text-xs text-nx-paper mt-1 leading-relaxed">
                      We've sent an email verification link to <strong className="text-nx-amber font-mono">{successState.email}</strong> via Resend.
                    </p>
                    <p className="text-[11px] text-nx-muted mt-2">
                      Please check your inbox and click the magic link to complete your developer registration.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-nx-ember/10 border border-nx-ember/30 text-xs text-nx-ember flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  {/* Sandbox/Preview simulated magic link trigger */}
                  {successState.simulatedLink && (
                    <button
                      type="button"
                      onClick={handleSimulatedVerify}
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-nx-amber text-nx-ink font-bold text-xs uppercase tracking-wider hover:bg-nx-amber/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Verify &amp; Enter Docs (Click Magic Link)
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResendMagicLink}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-nx-card2 border border-nx-border text-nx-paper hover:bg-nx-card2/80 transition-colors text-xs font-mono font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Resend Magic Link Email
                  </button>

                  <button
                    type="button"
                    onClick={() => setSuccessState(null)}
                    className="w-full text-center text-xs text-nx-muted hover:text-nx-paper transition-colors py-1 cursor-pointer"
                  >
                    &larr; Back to Sign In / Sign Up
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Tabs */}
                <div className="grid grid-cols-2 p-1 bg-nx-ink border border-nx-border rounded-xl mb-6 text-xs font-mono font-bold">
                  <button
                    type="button"
                    onClick={() => { setTab('signup'); resetForm(); }}
                    className={`py-2 rounded-lg transition-all cursor-pointer ${
                      tab === 'signup'
                        ? 'bg-nx-amber text-nx-ink shadow-sm'
                        : 'text-nx-muted hover:text-nx-paper'
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('login'); resetForm(); }}
                    className={`py-2 rounded-lg transition-all cursor-pointer ${
                      tab === 'login'
                        ? 'bg-nx-amber text-nx-ink shadow-sm'
                        : 'text-nx-muted hover:text-nx-paper'
                    }`}
                  >
                    Sign In
                  </button>
                </div>

                {error && (
                  <div className="p-3 mb-6 rounded-xl bg-nx-ember/10 border border-nx-ember/30 text-xs text-nx-ember flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-tight">{error}</span>
                  </div>
                )}

                {/* Sign Up Form */}
                {tab === 'signup' ? (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-nx-muted tracking-wider mb-1.5">
                        Developer Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-nx-muted" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="developer@company.com"
                          className="w-full bg-nx-ink border border-nx-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-nx-paper placeholder:text-nx-muted/50 focus:outline-none focus:border-nx-amber focus:ring-1 focus:ring-nx-amber transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-nx-muted tracking-wider mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-nx-muted" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-nx-ink border border-nx-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-nx-paper placeholder:text-nx-muted/50 focus:outline-none focus:border-nx-amber focus:ring-1 focus:ring-nx-amber transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-nx-muted tracking-wider mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-nx-muted" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-nx-ink border border-nx-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-nx-paper placeholder:text-nx-muted/50 focus:outline-none focus:border-nx-amber focus:ring-1 focus:ring-nx-amber transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-nx-amber text-nx-ink font-bold text-xs uppercase tracking-wider hover:bg-nx-amber/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Magic Link...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account &amp; Send Magic Link</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-nx-muted text-center mt-3 leading-normal">
                      By registering, you'll receive a Resend magic link email to validate your email address and unlock developer documentation.
                    </p>
                  </form>
                ) : (
                  /* Sign In Form */
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-nx-muted tracking-wider mb-1.5">
                        Developer Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-nx-muted" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="developer@company.com"
                          className="w-full bg-nx-ink border border-nx-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-nx-paper placeholder:text-nx-muted/50 focus:outline-none focus:border-nx-amber focus:ring-1 focus:ring-nx-amber transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-nx-muted tracking-wider mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-nx-muted" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-nx-ink border border-nx-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-nx-paper placeholder:text-nx-muted/50 focus:outline-none focus:border-nx-amber focus:ring-1 focus:ring-nx-amber transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-nx-amber text-nx-ink font-bold text-xs uppercase tracking-wider hover:bg-nx-amber/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Developer Portal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
