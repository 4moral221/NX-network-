import { useState, useEffect, useRef, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Hexagon, ArrowRight, AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import NXLogo from '../../components/NXLogo';
import { toast } from 'react-hot-toast';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot PIN States
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus phone input on initial mount
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, []);

  const handlePhoneChange = (val: string) => {
    // Simple filter to digits plus optional plus prefix
    let cleanVal = val.replace(/[^\d+]/g, '');
    
    // Auto format 07... to 2547...
    if (cleanVal.startsWith('07') && cleanVal.length >= 10) {
      cleanVal = '2547' + cleanVal.substring(2);
    } else if (cleanVal.startsWith('01') && cleanVal.length >= 10) {
      cleanVal = '2541' + cleanVal.substring(2);
    }
    
    setPhone(cleanVal);
  };

  const handleForgotPin = () => {
    setForgotPhone(phone || '');
    setForgotStep('request');
    setForgotOtp('');
    setForgotNewPin('');
    setForgotConfirmPin('');
    setForgotError('');
    setIsForgotOpen(true);
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotPhone) {
      setForgotError('Please enter your phone number.');
      return;
    }
    
    setForgotLoading(true);
    setForgotError('');
    
    try {
      const res = await fetch('/api/auth/send-pwa-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: forgotPhone })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }
      
      if (data.simulated_otp) {
        toast.success(`[DEMO BYPASS OTP]: ${data.simulated_otp}`, { duration: 10000 });
      } else {
        toast.success('Verification SMS Code sent!');
      }
      
      setForgotStep('verify');
    } catch (err: any) {
      setForgotError(err.message || 'Error executing gateway request.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPin = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotOtp) {
      setForgotError('Please enter the 6-digit OTP code.');
      return;
    }
    if (forgotNewPin.length !== 4 || isNaN(Number(forgotNewPin))) {
      setForgotError('New PIN must be exactly 4 digits.');
      return;
    }
    if (forgotNewPin !== forgotConfirmPin) {
      setForgotError('PIN matching verification failed. PINs do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await fetch('/api/auth/reset-pwa-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: forgotPhone,
          otp: forgotOtp,
          newPin: forgotNewPin
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify and reset PIN.');
      }

      toast.success('PIN successfully reset! Login with your new PIN instantly.');
      setPhone(forgotPhone);
      setPin(forgotNewPin);
      setIsForgotOpen(false);
    } catch (err: any) {
      setForgotError(err.message || 'Error during PIN resetting.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const trimmedPin = pin.trim();
    if (trimmedPin.length !== 4) {
      setError('PIN must be 4 digits.');
      setLoading(false);
      return;
    }

    // Normalize phone number: remove +, remove spaces, convert 07... to 2547...
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '254' + normalizedPhone.substring(1);
    } else if (normalizedPhone.startsWith('254')) {
      // already in 254 format
    } else if (normalizedPhone.length === 9) {
      // assume it's 7XXXXXXXX
      normalizedPhone = '254' + normalizedPhone;
    }

    // Check if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      setError('Database configuration missing. Please ensure VITE_SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY is set in your environment variables.');
      setLoading(false);
      return;
    }

    try {
      toast.loading('Authenticating security token...', { id: 'pwa-login' });
      
      const { data: users, error: dbError } = await supabase
        .from('users')
        .select('id, phone, name, role, status, recovery_pin')
        .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
        .limit(1);

      if (dbError) {
        throw new Error(`[Network/Database Error]: ${dbError.message}`);
      }
      
      const user = users?.[0];

      if (!user) {
        setError('Phone number not registered. Register using *384*6180#.');
        toast.error('Authentication Rejected', { id: 'pwa-login' });
      } else {
        // Verify PIN hashing
        const encoder = new TextEncoder();
        const dataToHash = encoder.encode(trimmedPin + user.phone);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataToHash);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        let matched = (computedHash === user.recovery_pin);
        
        // Also support straight js-sha256 if created via our ops tools
        if (!matched) {
            const dataToHashPlain = encoder.encode(trimmedPin);
            const plainHashBuffer = await crypto.subtle.digest('SHA-256', dataToHashPlain);
            const plainHashArray = Array.from(new Uint8Array(plainHashBuffer));
            const computedPlainHash = plainHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            if (computedPlainHash === user.recovery_pin) {
                matched = true;
            }
        }

        if (!matched) {
          setError('Incorrect critical credentials. Invalid PIN entered.');
          toast.error('Invalid PIN', { id: 'pwa-login' });
          return;
        }
        
        // Exclude recovery_pin from user object passed to state
        const safeUser = { ...user };
        delete safeUser.recovery_pin;
        
        if (rememberMe) {
          localStorage.setItem('nx_pwa_phone', safeUser.phone);
          // Set timestamp for 14 Days extended validity
          localStorage.setItem('nx_pwa_session_expiry', String(Date.now() + 14 * 24 * 60 * 60 * 1000));
        } else {
          localStorage.setItem('nx_pwa_phone', safeUser.phone);
          localStorage.setItem('nx_pwa_session_expiry', String(Date.now() + 1 * 24 * 60 * 60 * 1000)); // 1 day
        }
        
        toast.success(`Welcome back, ${safeUser.name || 'Merchant'}!`, { id: 'pwa-login' });
        onLogin(safeUser);
      }
    } catch (err: any) {
      setError(`[Network connection error or timed out]: ${err.message || 'Failed to authenticate'}`);
      toast.error('Network Connection Error', { id: 'pwa-login' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 justify-center relative overflow-y-auto">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(232,160,32,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(232,160,32,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-sm mx-auto">
        <div className="flex justify-center mb-8">
          <NXLogo />
        </div>

        <div className="text-center mb-10">
          <h1 className="font-display text-4xl tracking-wider text-nx-paper mb-2">NX NETWORK</h1>
          <p className="text-nx-muted text-sm uppercase tracking-widest">Mobile Live Access Link</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-nx-ember/10 border border-nx-ember/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-nx-ember shrink-0 mt-0.5" />
            <p className="text-xs text-nx-ember leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-nx-muted mb-2">Phone Number</label>
            <input 
              ref={phoneInputRef}
              type="tel" 
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="e.g. 2547XXXXXXXX or 07XXXXXXXX"
              className="w-full bg-nx-ink border border-nx-border rounded-lg px-4 py-4 text-nx-paper focus:outline-none focus:ring-2 focus:ring-nx-amber/50 focus:border-nx-amber transition-all font-mono text-sm placeholder-white/20"
              required
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] uppercase tracking-widest text-nx-muted">4-Digit PIN</label>
              <button 
                type="button" 
                onClick={handleForgotPin}
                className="text-[9px] uppercase tracking-widest text-nx-amber hover:underline"
              >
                Forgot PIN?
              </button>
            </div>
            <div className="relative">
              <input 
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                placeholder="••••"
                maxLength={4}
                className="w-full bg-nx-ink border border-nx-border rounded-lg px-4 py-4 text-nx-paper focus:outline-none focus:ring-2 focus:ring-nx-amber/50 focus:border-nx-amber transition-all font-mono text-center tracking-[1em] text-lg placeholder-white/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nx-muted hover:text-white"
                tabIndex={-1}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-nx-border bg-nx-ink text-nx-amber focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-[10px] uppercase tracking-widest text-nx-muted">Remember Me</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 nx-btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Secure Live Login'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-[10px] text-nx-muted uppercase tracking-widest">
            Not registered yet? Dial <span className="text-nx-amber font-mono font-bold">*384*6180#</span>
          </p>
        </div>
      </div>

      {/* Forgot PIN Interactive Drawer/Modal Overlay */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nx-bg/90 backdrop-blur-sm transition-all duration-300">
          <div className="bg-nx-ink border border-nx-border/50 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl space-y-5">
            <button
              onClick={() => setIsForgotOpen(false)}
              className="absolute top-4 right-4 text-nx-muted hover:text-white transition-colors"
              aria-label="Close recovery panel"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pt-2">
              <Hexagon className="w-8 h-8 text-nx-amber mx-auto mb-2 animate-pulse" />
              <h3 className="font-display text-lg tracking-wider text-nx-paper uppercase">NX Secure PIN Recovery</h3>
              <p className="text-[9px] text-nx-muted uppercase tracking-widest mt-1">
                {forgotStep === 'request' ? 'Request Security Token via SMS' : 'Enter OTP Verification Code'}
              </p>
            </div>

            {forgotError && (
              <div className="p-3 bg-nx-ember/10 border border-nx-ember/30 rounded-lg flex items-start gap-2 text-xs text-nx-ember">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-nx-muted mb-2">Registered Mobile Phone</label>
                  <input
                    type="tel"
                    value={forgotPhone}
                    onChange={(e) => {
                      let cleanVal = e.target.value.replace(/[^\d+]/g, '');
                      if (cleanVal.startsWith('0')) cleanVal = '254' + cleanVal.substring(1);
                      setForgotPhone(cleanVal);
                    }}
                    placeholder="e.g. 2547XXXXXXXX"
                    className="w-full bg-nx-bg border border-nx-border rounded-lg px-4 py-3 text-nx-paper text-sm focus:outline-none focus:ring-1 focus:ring-nx-amber/50 font-mono"
                    required
                  />
                  <p className="text-[8px] text-nx-muted uppercase tracking-wider mt-1.5 leading-relaxed">
                    A secure authentication payload containing a verification code will be dispatched to this line.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full nx-btn-primary py-3.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2"
                >
                  {forgotLoading ? 'Verifying Phone Registry...' : 'Send Verification Code'}
                  {!forgotLoading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPin} className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-nx-muted mb-2">6-Digit Verification Code</label>
                  <input
                    type="text"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    placeholder="e.g. 123456"
                    className="w-full bg-nx-bg border border-nx-border rounded-lg px-4 py-3 text-nx-paper text-sm tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-1 focus:ring-nx-amber/50"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-nx-muted mb-2">New 4-Digit PIN</label>
                    <input
                      type="password"
                      value={forgotNewPin}
                      onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      placeholder="••••"
                      className="w-full bg-nx-bg border border-nx-border rounded-lg px-4 py-3 text-nx-paper text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-nx-amber/50"
                      maxLength={4}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-nx-muted mb-2">Confirm PIN</label>
                    <input
                      type="password"
                      value={forgotConfirmPin}
                      onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      placeholder="••••"
                      className="w-full bg-nx-bg border border-nx-border rounded-lg px-4 py-3 text-nx-paper text-sm text-center font-mono focus:outline-none focus:ring-1 focus:ring-nx-amber/50"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="text-[8px] uppercase tracking-widest text-nx-muted hover:text-nx-amber underline"
                  >
                    Change Phone Number?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full nx-btn-primary py-3.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2"
                >
                  {forgotLoading ? 'Rewriting Secure Key...' : 'Verify & Set New PIN'}
                  {!forgotLoading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
