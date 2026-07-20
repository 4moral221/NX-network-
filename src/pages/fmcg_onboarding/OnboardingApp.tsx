import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Loader2, Copy, CheckCircle2, AlertCircle, RefreshCw, LogOut, Key, Shield, ShieldAlert, Zap } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import NXLogo from '@/src/components/NXLogo';
import { useNavigate } from 'react-router-dom';

const generateSecureApiKey = () => {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  const rawKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `nx_live_${rawKey}`;
};

const hashString = async (message: string) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function FmcgOnboarding() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  
  // Dashboard & API Key states
  const [partner, setPartner] = useState<any>(null);
  const [apiKeyData, setApiKeyData] = useState<any>(null);
  const [rawKeyToShow, setRawKeyToShow] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchPartnerInfo(session.user.email || '');
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchPartnerInfo(session.user.email || '');
      else {
        setPartner(null);
        setApiKeyData(null);
        setRawKeyToShow(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPartnerInfo = async (email: string) => {
    if (!email) return;
    setLoading(true);
    try {
      const { data: partnerData, error: partnerErr } = await supabase
        .from('fmcg_partners')
        .select('*')
        .ilike('contact', email)
        .maybeSingle();
            
      if (partnerData) {
        setPartner(partnerData);
        if (partnerData.active) {
          await fetchApiKey(partnerData.id);
        }
      } else {
         const { data: newPartner, error: createErr } = await supabase
            .from('fmcg_partners')
            .insert([{ contact: email, name: companyName || email.split('@')[0], active: false }])
            .select()
            .single();
         if (createErr) throw createErr;
         setPartner(newPartner);
      }
    } catch (err: any) {
      console.error('Error fetching partner:', err);
    }
    setLoading(false);
  };

  const fetchApiKey = async (partnerId: string) => {
    const { data, error } = await supabase
      .from('fmcg_partners')
      .select('api_key, created_at')
      .eq('id', partnerId)
      .single();
        
    if (data && data.api_key) {
       const rawKey = data.api_key;
       let prefix = 'nx_live_';
       let last4 = '****';
       if (rawKey.length > 4) {
           if (rawKey.startsWith('nx_live_')) {
               last4 = rawKey.slice(-4);
           } else {
               prefix = 'sys_';
               last4 = rawKey.slice(-4);
           }
       }
       setApiKeyData({ prefix, last4, created_at: data.created_at, revoked: false, id: partnerId });
    } else {
       setApiKeyData(null);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setMessage('');
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (!companyName) throw new Error('Company name is required for signup');
        
        // Use our server-side proxy to auto-confirm the email
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, companyName })
        });
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create account');
        }

        // Now that the account is created and auto-confirmed, sign in directly
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!partner) return;
    if (!window.confirm("Generating a new API key will invalidate any previously generated keys. Continue?")) return;
    setGenerating(true);
    try {
      const rawKey = generateSecureApiKey();
      const prefix = 'nx_live_';
      const last4 = rawKey.slice(-4);

      const { data, error } = await supabase.from('fmcg_partners').update({
        api_key: rawKey
      }).eq('id', partner.id).select().single();

      if (error) throw error;
      
      setApiKeyData({ prefix, last4, created_at: data.created_at, revoked: false, id: partner.id });
      setRawKeyToShow(rawKey);
      setCopied(false);
    } catch (err: any) {
      alert("Failed to generate key: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (rawKeyToShow) {
      navigator.clipboard.writeText(rawKeyToShow);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] font-sans text-white flex flex-col md:flex-row">
        {/* Left branding */}
        <div className="hidden md:flex flex-col justify-center p-12 lg:p-24 w-full md:w-1/2 border-r border-[#00d4ff]/20 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.05)_0%,transparent_100%)]">
           <NXLogo title="Onboarding" />
           <h1 className="text-4xl font-display uppercase tracking-widest mt-12 mb-6 text-[#00d4ff]">FMCG Partner Gateway</h1>
           <p className="text-nx-muted text-sm leading-relaxed max-w-md">Connect directly to the informal retail network. Generate live API keys securely and integrate with NX Core infrastructure.</p>
           
           <div className="mt-12 space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-[#00d4ff]/10 flex items-center justify-center border border-[#00d4ff]/20"><Shield className="w-4 h-4 text-[#00d4ff]" /></div>
                 <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest">Enterprise Security</h3>
                    <p className="text-[10px] text-nx-muted">End-to-end encrypted API credentials.</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-[#ffb547]/10 flex items-center justify-center border border-[#ffb547]/20"><Zap className="w-4 h-4 text-[#ffb547]" /></div>
                 <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest">Real-time Injection</h3>
                    <p className="text-[10px] text-nx-muted">Instant margin pool allocations.</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Auth form */}
        <div className="flex-1 flex flex-col justify-center p-6 sm:p-12">
          <div className="w-full max-w-md mx-auto relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
             <div className="md:hidden flex justify-center mb-8"><NXLogo title="Onboarding" /></div>
             
             <div className="bg-[#111111] border border-white/10 rounded-3xl p-8 relative z-10 shadow-2xl">
               <h2 className="text-2xl font-display uppercase tracking-widest mb-2">{authMode === 'login' ? 'Portal Access' : 'Initialize Partner'}</h2>
               <p className="text-xs text-nx-muted mb-8">{authMode === 'login' ? 'Authenticate to access your API keys.' : 'Secure FMCG partner onboarding.'}</p>
               
               <form onSubmit={handleAuth} className="space-y-4">
                 {authMode === 'signup' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#00d4ff] mb-2">Company Name</label>
                      <input 
                        required 
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00d4ff] outline-none transition-all" 
                        placeholder="e.g Unilever" 
                        value={companyName} onChange={e => setCompanyName(e.target.value)} 
                      />
                    </div>
                 )}
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-[#00d4ff] mb-2">Work Email</label>
                   <input 
                     required type="email" 
                     className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00d4ff] outline-none transition-all" 
                     placeholder="name@company.com" 
                     value={email} onChange={e => setEmail(e.target.value)} 
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold uppercase tracking-widest text-[#00d4ff] mb-2">Password</label>
                   <input 
                     required type="password" minLength={8}
                     className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#00d4ff] outline-none transition-all" 
                     placeholder="••••••••" 
                     value={password} onChange={e => setPassword(e.target.value)} 
                   />
                 </div>

                 {authError && <div className="text-[#ff4757] text-[10px] uppercase font-bold flex items-center gap-2 mt-4"><AlertCircle className="w-3 h-3" /> {authError}</div>}
                 {message && <div className="text-[#00d4ff] text-[10px] uppercase font-bold flex items-center gap-2 mt-4"><CheckCircle2 className="w-3 h-3" /> {message}</div>}

                 <button type="submit" disabled={loading} className="w-full bg-white text-black font-display font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest mt-6">
                   {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : authMode === 'login' ? 'Sign In' : 'Create Account'}
                 </button>
               </form>

               <div className="mt-6 text-center">
                 <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-[10px] text-nx-muted uppercase tracking-widest hover:text-[#00d4ff] transition-all">
                   {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
                 </button>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard & API Key generation view
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#00d4ff]/30">
      <nav className="h-16 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-50">
         <div className="flex items-center gap-4">
            <NXLogo title="Onboarding" />
            <div className="h-4 w-[1px] bg-white/20 mx-2" />
            <span className="font-display uppercase tracking-widest text-sm text-[#00d4ff]">Developer Portal</span>
         </div>
         <div className="flex items-center gap-6">
            <span className="text-[10px] uppercase font-bold tracking-widest text-nx-muted">{partner?.company_name}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-[10px] text-nx-muted hover:text-white uppercase tracking-widest flex items-center gap-2">
               <LogOut className="w-3 h-3" /> Sign Out
            </button>
         </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 py-12">
         <div className="mb-12 border-b border-white/5 pb-8">
            <h1 className="text-3xl font-display uppercase tracking-widest mb-2">API Authentication</h1>
            <p className="text-nx-muted text-sm max-w-2xl leading-relaxed">Generate and manage your API keys to authenticate requests to the NX Network. Keys carry full privileges for your partner account.</p>
         </div>

         <div className="bg-[#111111] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Key className="w-32 h-32 text-[#00d4ff]" />
            </div>
            
            <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-6">Live API Key</h2>

            {/* Scenario: Just Generated */}
            <AnimatePresence mode="popLayout">
               {partner && partner.status !== 'active' ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                     <div className="text-center py-8 border border-dashed border-[#ffb547]/30 rounded-2xl bg-[#0a0a0a] flex flex-col items-center px-6">
                        <ShieldAlert className="w-12 h-12 text-[#ffb547] mb-4 opacity-80 animate-pulse" />
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-2 text-[#ffb547]">Verification In Progress</h3>
                        <p className="text-[11px] text-nx-muted uppercase font-bold tracking-widest max-w-sm leading-relaxed mb-6 text-center">
                           Your registration for {partner?.company_name || "your brand"} is under manual review.
                        </p>
                        
                        <div className="bg-[#ffb547]/5 border border-[#ffb547]/20 rounded-xl p-4 text-left max-w-md mb-6 w-full">
                           <div className="text-[10px] uppercase font-bold text-[#ffb547] mb-1">Onboarding Policy Notice</div>
                           <p className="text-[10px] text-nx-muted leading-relaxed">
                              To safeguard the liquidity pools of the NX Live core network, brand connections require manual authorization unless registered via a pre-approved wholesale domain prefix.
                           </p>
                           <p className="text-[10px] text-nx-muted leading-relaxed mt-2 font-semibold">
                              Please contact brand-onboarding@nxnetwork.company for expedited review.
                           </p>
                        </div>

                        <button 
                           onClick={() => {
                              if (session?.user?.id) {
                                 fetchPartnerInfo(session.user.email || '');
                              }
                           }}
                           className="bg-[#111] border border-[#ffb547]/30 text-[#ffb547] hover:bg-[#ffb547]/10 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all inline-flex items-center gap-2 cursor-pointer"
                        >
                           <RefreshCw className="w-3.5 h-3.5" /> Check Approval Status
                        </button>
                     </div>
                  </motion.div>
               ) : rawKeyToShow ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                     <div className="bg-[#ffb547]/10 border border-[#ffb547]/30 text-[#ffb547] text-xs p-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                           <div className="font-bold uppercase tracking-widest mb-1">Save this key now</div>
                           <p className="opacity-80">This is the only time you will be able to see this API key in its entirety. If you lose it, you will need to generate a new one.</p>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 bg-[#0a0a0a] border border-[#00d4ff]/30 rounded-xl p-4 font-mono text-sm text-[#00d4ff] flex items-center justify-between select-all relative overflow-hidden group">
                           <div className="absolute inset-0 bg-[#00d4ff]/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none" />
                           <span className="truncate pr-4 z-10">{rawKeyToShow}</span>
                        </div>
                        <button 
                           onClick={copyToClipboard}
                           className="shrink-0 bg-white text-black px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                           {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Key</>}
                        </button>
                     </div>

                     <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
                        <button 
                           onClick={() => setRawKeyToShow(null)}
                           className="text-[10px] text-nx-muted uppercase tracking-widest hover:text-white transition-all underline underline-offset-4"
                        >
                           I have saved my key
                        </button>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                           <a href="/fmcgs" className="flex-1 bg-[#111] border border-[#00d4ff]/30 text-[#00d4ff] px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#00d4ff] hover:text-black transition-all text-center">Continue to FMCG Portal</a>
                           <a href="/partners" className="flex-1 bg-[#111] border border-white/20 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all text-center">Continue to Partners Portal</a>
                        </div>
                     </div>
                  </motion.div>
               ) : apiKeyData ? (
                  /* Scenario: Has existing key but hidden */
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                     <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 font-mono text-sm text-white/50 flex items-center gap-4">
                        <Key className="w-4 h-4" />
                        <span>{apiKeyData.prefix}••••••••••••••••••••{apiKeyData.last4}</span>
                     </div>
                     <p className="text-[10px] text-nx-muted uppercase tracking-widest">Created {new Date(apiKeyData.created_at).toLocaleDateString()}</p>
                     
                     <div className="pt-6 border-t border-white/5">
                        <p className="text-xs text-nx-muted mb-4">Need a new key? Regenerating will immediately revoke your current key and any active integrations using it will fail.</p>
                        <button 
                           onClick={handleGenerateKey} disabled={generating}
                           className="bg-[#111] border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-[#ff4757] hover:text-[#ff4757] transition-all flex items-center gap-2"
                        >
                           {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4" /> Regenerate Key</>}
                        </button>
                     </div>
                  </motion.div>
               ) : (
                  /* Scenario: No key ever generated */
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                     <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-[#0a0a0a] flex flex-col items-center">
                        <Shield className="w-12 h-12 text-[#00d4ff] mb-4 opacity-50" />
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-2 text-white">No active API keys</h3>
                        <p className="text-[10px] text-nx-muted uppercase tracking-widest mb-6 max-w-xs leading-relaxed">Generate a live key to authenticate your FMCG systems with NX Network.</p>
                        <button 
                           onClick={handleGenerateKey} disabled={generating}
                           className="bg-[#00d4ff] text-black px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#00d4ff]/90 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                        >
                           {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> Generate Live Key</>}
                        </button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>

         <div className="mt-12">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4">API Documentation</h3>
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
               <p className="text-xs text-nx-muted mb-4">To authenticate with the NX API, include your API key in the <code className="bg-[#0a0a0a] px-2 py-1 rounded text-[#00d4ff] font-mono border border-white/5">x-api-key</code> header.</p>
               <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-[11px] font-mono text-nx-muted leading-relaxed select-all">
<span className="text-[#00d4ff]">curl</span> -X POST https://api.nxnetwork.company/v1/fmcg/liquidate \
  -H <span className="text-[#ffb547]">"Content-Type: application/json"</span> \
  -H <span className="text-[#ffb547]">"x-api-key: nx_live_YOUR_API_KEY_HERE"</span> \
  -d '{`{
  "merchantCode": "M123456",
  "amount": 500
}`}'
                  </pre>
               </div>
            </div>
         </div>
      </main>
    </div>
  );
}
