import { useState, useEffect } from 'react';
import { sha256 } from 'js-sha256';
import { motion } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  History, 
  UserPlus, 
  Award, 
  LogOut, 
  Search, 
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Sparkles,
  Zap,
  Truck,
  FileText,
  RefreshCw,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import NXLogo from '../../components/NXLogo';
import NotificationIcon from '../../components/NotificationIcon';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import { getPortalLink } from '@/src/lib/constants';
import { toast } from 'react-hot-toast';

type Tab = 'overview' | 'subs' | 'commissions' | 'enroll' | 'tier' | 'invoices';

export default function MerchantPortal() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    subs: 0,
    monthNx: 0,
    totalNx: 0,
    txns: 0
  });
  const [subMerchants, setSubMerchants] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [fmcgContributions, setFmcgContributions] = useState<any[]>([]);
  const [batchAlerts, setBatchAlerts] = useState<any[]>([]);
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState({ text: '', type: 'info' });

  // Invoice & settlement states
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [poolBalance, setPoolBalance] = useState(0);
  const [settleLoading, setSettleLoading] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Auth State
  const [loginData, setLoginData] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn && user) {
      fetchHubData();

      // Real-time subscriptions
      const subsChannel = supabase
        .channel(`hub-subs-${user.merchant_code}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'users',
          filter: `hub_merchant_code=eq.${user.merchant_code}`
        }, () => {
          fetchHubData();
        })
        .subscribe();

      const commsChannel = supabase
        .channel(`hub-comms-${user.merchant_code}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'hub_commissions',
          filter: `hub_merchant_code=eq.${user.merchant_code}`
        }, () => {
          fetchHubData();
        })
        .subscribe();

      const fmcgChannel = supabase
        .channel(`hub-fmcg-${user.merchant_code}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'fmcg_margin_contributions',
          filter: `merchant_code=eq.${user.merchant_code}`
        }, () => {
          fetchHubData();
        })
        .subscribe();

      const batchesChannel = supabase
        .channel(`hub-batches-${user.merchant_code}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'restock_batches'
        }, () => {
          fetchHubData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subsChannel);
        supabase.removeChannel(commsChannel);
        supabase.removeChannel(fmcgChannel);
        supabase.removeChannel(batchesChannel);
      };
    }
  }, [isLoggedIn, user]);

  const fetchHubData = async () => {
    if (!user?.merchant_code) return;

    try {
      // 1. Fetch Sub-Merchants
      const { data: subs, error: subsErr } = await supabase
        .from('users')
        .select('*')
        .eq('hub_merchant_code', user.merchant_code)
        .eq('role', 'merchant');
      
      if (subs) setSubMerchants(subs);

      // 2. Fetch Commissions
      const { data: comms, error: commsErr } = await supabase
        .from('hub_commissions')
        .select('*')
        .eq('hub_merchant_code', user.merchant_code)
        .order('created_at', { ascending: false });
      
      if (comms) {
        setCommissions(comms);
        const total = comms.reduce((acc, curr) => acc + Number(curr.amount), 0);
        const unpaid = comms.filter(c => !c.paid_out).reduce((acc, curr) => acc + Number(curr.amount), 0);
        const txns = comms.length;
        
        setStats({
          subs: subs?.length || 0,
          monthNx: unpaid,
          totalNx: total,
          txns: txns
        });
      }

      // 3. Fetch FMCG Contributions
      const { data: contributions } = await supabase
        .from('fmcg_margin_contributions')
        .select('*')
        .eq('merchant_code', user.merchant_code)
        .order('created_at', { ascending: false })
        .limit(3);
      if (contributions) setFmcgContributions(contributions);

      // 4. Fetch Restock Batches related to this merchant
      const { data: myRequests } = await supabase
        .from('restock_requests')
        .select('batch_id')
        .eq('merchant_code', user.merchant_code)
        .not('batch_id', 'is', null);
      
      const bIds = [...new Set(myRequests?.map(r => r.batch_id).filter(Boolean))];
      if (bIds.length > 0) {
        const { data: bData } = await supabase
          .from('restock_batches')
          .select('*, fmcg_partners(name)')
          .in('id', bIds)
          .order('updated_at', { ascending: false })
          .limit(5);
        if (bData) setBatchAlerts(bData);
      }

      // 5. Fetch Pending and Unpaid Invoices for this Hub
      const { data: pending, error: pendErr } = await supabase
        .from('restock_invoices')
        .select('*')
        .eq('merchant_code', user.merchant_code)
        .is('delivered_at', null)
        .order('created_at', { ascending: false });
      if (!pendErr && pending) setPendingInvoices(pending);

      const { data: unpaid, error: unpErr } = await supabase
        .from('restock_invoices')
        .select('*')
        .eq('merchant_code', user.merchant_code)
        .not('status', 'eq', 'paid')
        .not('delivered_at', 'is', null)
        .order('created_at', { ascending: false });
      if (!unpErr && unpaid) setUnpaidInvoices(unpaid);

      // Check if they have an active pending or predicting restock request
      const { data: activeRequests } = await supabase
        .from('restock_requests')
        .select('id')
        .eq('merchant_code', user.merchant_code)
        .in('status', ['pending', 'approving_prediction'])
        .limit(1);

      setHasPendingRequest(!!activeRequests && activeRequests.length > 0);

      // 6. Fetch Ledger Balance (Source of truth)
      const { data: ledgerRes } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('account_phone', user.phone);
      const balance = ledgerRes?.reduce((s, x) => s + (x.amount || 0), 0) || (user.nx_balance || 0);
      setPoolBalance(balance);

    } catch (e) {
      console.error('Error fetching hub data:', e);
    }
  };

  const handleSettleInvoice = async (invoice: any) => {
    const nxPayable = Math.min(poolBalance, invoice.invoice_amount || 0);
    if (nxPayable <= 0) {
      toast.error("Insufficient NX balance to settle this invoice.");
      return;
    }

    if (!confirm(`Settle this invoice? Using ${nxPayable.toFixed(1)} NX from your balance.`)) return;

    setSettleLoading(invoice.id);
    try {
      // 1. Mark invoice as paid
      const { error: invErr } = await supabase
        .from('restock_invoices')
        .update({ status: 'paid', nx_paid: nxPayable, paid_at: new Date().toISOString() })
        .eq('id', invoice.id);
      
      if (invErr) throw invErr;

      // 2. Debit ledger
      const { error: ledErr } = await supabase
        .from('ledger_entries')
        .insert({
          account_phone: user.phone,
          entry_type: 'debit',
          amount: -nxPayable,
          reference: `SETTLE-INV-${invoice.id}`,
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString()
        });
      
      if (ledErr) throw ledErr;

      toast.success('Invoice Settled Successfully!');
      fetchHubData();
    } catch (err: any) {
      toast.error('Settlement failed: ' + err.message);
    } finally {
      setSettleLoading(null);
    }
  };

  const handleConfirmDelivery = async (invoice: any) => {
    if (!hasPendingRequest) {
      toast.error("You must have a pending restock request to confirm delivery!");
      return;
    }

    if (!confirm("Are you sure you want to confirm delivery of this restock invoice? This is a permanent handshake that confirms receipt of physical goods.")) return;

    setSettleLoading(invoice.id);
    try {
      const { error } = await supabase
        .from('restock_invoices')
        .update({ delivered_at: new Date().toISOString() })
        .eq('id', invoice.id);

      if (error) throw error;

      toast.success("Delivery Handshake Confirmed!");
      fetchHubData();
    } catch (err: any) {
      toast.error("Confirmation failed: " + err.message);
    } finally {
      setSettleLoading(null);
    }
  };

  const handleEnroll = async () => {
    if (!enrollPhone || !user?.merchant_code) return;
    
    // Support hub limits check
    const currentSubs = subMerchants.length;
    if (currentSubs >= 50 && user.franchise_tier === 'HUB') {
      // Check if they are eligible for 100 limit (this would normally be a field in DB like 'hub_limit_extended')
      // For now, we strict block at 50 explicitly unless they contact support
      setEnrollMessage({ 
        text: 'Hub enrollment limit (50) reached. Contact NX at 0781550151 to increase your limit to 100 (Note: NX takes 10% commission on hub earnings for extended networks).', 
        type: 'error' 
      });
      return;
    }

    setEnrollLoading(true);
    setEnrollMessage({ text: '', type: 'info' });

    try {
      const { error } = await supabase
        .from('merchant_whitelist')
        .insert([{ 
          phone: enrollPhone, 
          hub_merchant_code: user.merchant_code,
          added_by: user.phone
        }]);

      if (error) throw error;

      setEnrollMessage({ text: `Successfully enrolled ${enrollPhone}. They can now register via USSD.`, type: 'success' });
      setEnrollPhone('');
    } catch (e: any) {
      setEnrollMessage({ text: e.message || 'Enrollment failed.', type: 'error' });
    } finally {
      setEnrollLoading(false);
    }
  };

  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState({ phone: '', pin: '', newPassword: '', confirmPassword: '' });
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);

  const handleSetupPassword = async () => {
    setSetupError('');
    if (!setupData.phone || !setupData.pin || !setupData.newPassword || !setupData.confirmPassword) {
      setSetupError('All fields required.');
      return;
    }
    if (setupData.newPassword !== setupData.confirmPassword) {
      setSetupError('Passwords do not match.');
      return;
    }

    try {
      // 1. Verify user exists and role is merchant
      const { data: users, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('phone', setupData.phone)
        .limit(1);

      const user = users?.[0];
      if (userErr || !user) {
        setSetupError('User not found.');
        return;
      }

      // 2. Verify PIN (recovery_pin is a hash of pin + phone)
      const pinHash = sha256(setupData.pin + setupData.phone);
      if (user.recovery_pin !== pinHash) {
        setSetupError('Invalid PIN.');
        return;
      }

      // 3. Update password using secure hashing
      const hashedPwd = sha256(setupData.newPassword);
      const { error: updateErr } = await supabase
        .from('users')
        .update({ dashboard_password: hashedPwd })
        .eq('phone', setupData.phone);

      if (updateErr) throw updateErr;

      setSetupSuccess(true);
      setTimeout(() => {
        setShowSetup(false);
        setSetupSuccess(false);
      }, 3000);
    } catch (e: any) {
      setSetupError(e.message || 'Setup failed.');
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!loginData.phone || !loginData.password) {
      setError('All fields required.');
      return;
    }

    // Check if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      setError('Supabase configuration missing. Please ensure VITE_SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY is set in your environment variables.');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/merchant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginData.phone, password: loginData.password })
      });
      const authData = await response.json();

      if (!response.ok || !authData.success) {
        setError('Incorrect phone or password.');
        return;
      }

      // We need to pass the tier as well, or fetch the user after. Let's fetch the user after verification to ensure we have standard format.
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', authData.user_id).single();
      if (!dbUser) { setError('User not found.'); return; }
      
      const session = { is_valid: true, user_id: authData.user_id, tier: dbUser.franchise_tier || 'HUB', merchant_code: dbUser.merchant_code };

      if (session.tier !== 'HUB') {
        setError('Access Denied: Only HUB merchants can access this portal.');
        return;
      }

      // Safe user object for state
      const safeUser = { ...dbUser };
      delete safeUser.recovery_pin;
      delete safeUser.dashboard_password;

      setUser(safeUser);
      setIsLoggedIn(true);
    } catch (e) {
      setError('Connection failed.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#0e0e14] justify-center p-6 font-sans relative overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm mx-auto"
        >
          <div className="mb-4"><NXLogo title="Hub Portal" /></div>
          <div className="text-[#5a5a7a] text-sm mb-8">Merchant Portal</div>
          
          {!showSetup ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-2">Phone Number (254…)</label>
                <input 
                  type="text" 
                  value={loginData.phone}
                  onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                  placeholder="254712345678"
                  className="w-full bg-[#0e0e14] border border-[#2a2a3e] text-[#e2e2f0] px-4 py-3 rounded-lg focus:outline-none focus:border-[#ff6b35] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-2">Dashboard Password</label>
                <input 
                  type="password" 
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#0e0e14] border border-[#2a2a3e] text-[#e2e2f0] px-4 py-3 rounded-lg focus:outline-none focus:border-[#ff6b35] transition-colors"
                />
              </div>
              <button 
                onClick={handleLogin}
                className="w-full bg-[#ff6b35] text-white font-display font-bold py-3 rounded-lg hover:bg-[#ff9a6b] transition-colors mt-4"
              >
                Sign In
              </button>
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs mt-2">
                  <AlertCircle className="w-3 h-3" /> {error}
                </div>
              )}
              <div className="mt-8 text-center">
                <span className="text-[11px] text-[#5a5a7a]">First time? </span>
                <button 
                  onClick={() => setShowSetup(true)}
                  className="text-[11px] text-[#ff6b35] hover:underline"
                >
                  Set up your password →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4">
                <button onClick={() => setShowSetup(false)} className="text-[10px] text-[#5a5a7a] hover:text-white uppercase tracking-widest">← Back to Login</button>
                <h3 className="text-white font-bold mt-2">Set Dashboard Password</h3>
                <p className="text-[10px] text-[#5a5a7a]">Use your 4-digit USSD PIN to verify identity.</p>
              </div>
              
              {setupSuccess ? (
                <div className="bg-green-500/10 text-green-500 p-4 rounded-lg text-xs text-center">
                  Password set successfully! Redirecting to login...
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-2">Phone Number</label>
                    <input 
                      type="text" 
                      value={setupData.phone}
                      onChange={(e) => setSetupData({ ...setupData, phone: e.target.value })}
                      className="w-full bg-[#0e0e14] border border-[#2a2a3e] text-[#e2e2f0] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ff6b35]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-2">4-Digit USSD PIN</label>
                    <input 
                      type="password" 
                      maxLength={4}
                      value={setupData.pin}
                      onChange={(e) => setSetupData({ ...setupData, pin: e.target.value })}
                      className="w-full bg-[#0e0e14] border border-[#2a2a3e] text-[#e2e2f0] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ff6b35]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-2">New Password</label>
                    <input 
                      type="password" 
                      value={setupData.newPassword}
                      onChange={(e) => setSetupData({ ...setupData, newPassword: e.target.value })}
                      className="w-full bg-[#0e0e14] border border-[#2a2a3e] text-[#e2e2f0] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ff6b35]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-2">Confirm Password</label>
                    <input 
                      type="password" 
                      value={setupData.confirmPassword}
                      onChange={(e) => setSetupData({ ...setupData, confirmPassword: e.target.value })}
                      className="w-full bg-[#0e0e14] border border-[#2a2a3e] text-[#e2e2f0] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ff6b35]"
                    />
                  </div>
                  <button 
                    onClick={handleSetupPassword}
                    className="w-full bg-[#ff6b35] text-white font-display font-bold py-3 rounded-lg hover:bg-[#ff9a6b] transition-colors mt-2"
                  >
                    Save Password
                  </button>
                  {setupError && (
                    <div className="flex items-center gap-2 text-red-500 text-xs mt-2">
                      <AlertCircle className="w-3 h-3" /> {setupError}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e14] text-[#e2e2f0] font-sans">
      {/* Top Bar */}
      <header className="bg-[#13131c] border-b border-[#1f1f2e] h-16 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="text-[10px] uppercase tracking-widest text-[#5a5a7a]">
            NX_NETWORK // MERCHANT_NODE
          </div>
          <NXLogo title="Hub Portal" size="sm" />
          <div className="hidden md:flex items-center gap-2">
            <span className="bg-[#1a1020] text-[#ff6b35] px-3 py-1 rounded-full text-[11px] font-medium tracking-wider">{user?.merchant_code}</span>
            <span className="border border-[#ff6b35] text-[#ff6b35] px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">HUB TIER</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <NotificationIcon />
          <button 
            onClick={() => setIsLoggedIn(false)}
            className="flex items-center gap-2 text-[#5a5a7a] hover:text-[#e2e2f0] text-xs transition-colors border border-[#2a2a3e] px-4 py-2 rounded-lg"
          >
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </header>

      <main className="w-full mx-auto p-4 md:p-8">
        {/* Tabs */}
        <div className="flex border-b border-[#1f1f2e] mb-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'subs', label: 'Sub-Merchants', icon: <Users className="w-4 h-4" /> },
            { id: 'commissions', label: 'Commissions', icon: <History className="w-4 h-4" /> },
            { id: 'enroll', label: 'Enroll New', icon: <UserPlus className="w-4 h-4" /> },
            { id: 'tier', label: 'My Tier', icon: <Award className="w-4 h-4" /> },
            { id: 'invoices', label: 'Invoices & Settlement', icon: <FileText className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-display font-semibold border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "text-[#ff6b35] border-[#ff6b35]" 
                  : "text-[#5a5a7a] border-transparent hover:text-[#e2e2f0]"
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Panels */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Sub-Merchants', val: stats.subs, color: 'text-[#ff6b35]' },
                  { label: 'Unpaid Commissions', val: `${stats.monthNx.toFixed(1)} NX`, color: 'text-[#4ade80]', sub: 'Accrued, not yet paid' },
                  { label: 'All-Time NX', val: `${stats.totalNx.toFixed(1)} NX`, color: 'text-[#a78bfa]' },
                  { label: 'Sub-Merchant Txns', val: stats.txns, color: 'text-[#60a5fa]', sub: 'Total tracked' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#13131c] border border-[#1f1f2e] p-6 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#ff6b35]/5 rounded-bl-[60px] transition-transform group-hover:scale-110" />
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-3">{stat.label}</div>
                    <div className={cn("font-display text-3xl font-extrabold", stat.color)}>{stat.val}</div>
                    {stat.sub && <div className="text-[10px] text-[#5a5a7a] mt-2">{stat.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Marketplace Ads Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#ff6b35] font-bold">Marketplace Offers // Promoted</h3>
                  <span className="text-[10px] text-[#5a5a7a] italic">Ads powered by NX Data</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1a1010] border border-[#ff6b35]/20 rounded-xl p-5 relative overflow-hidden group cursor-pointer hover:border-[#ff6b35]/50 transition-all">
                     <div className="absolute top-2 right-3 text-[8px] bg-[#ff6b35] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Sponsored</div>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 group-hover:bg-[#ff6b35]/10 transition-colors">
                           <Zap className="w-6 h-6 text-[#ff6b35]" />
                        </div>
                        <div>
                           <div className="text-sm font-bold text-white mb-0.5">Coca-Cola Zero Sugar</div>
                           <p className="text-[10px] text-[#5a5a7a] leading-tight">Get +500 NX Pool Boost for every 10 crates ordered this week.</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#10151a] border border-[#00d4ff]/20 rounded-xl p-5 relative overflow-hidden group cursor-pointer hover:border-[#00d4ff]/50 transition-all">
                     <div className="absolute top-2 right-3 text-[8px] bg-[#00d4ff] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Sponsored</div>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 group-hover:bg-[#00d4ff]/10 transition-colors">
                           <Truck className="w-6 h-6 text-[#00d4ff]" />
                        </div>
                        <div>
                           <div className="text-sm font-bold text-white mb-0.5">Unilever Logistics</div>
                           <p className="text-[10px] text-[#5a5a7a] leading-tight">Priority delivery for HUB merchants in Mombasa East. Zero delivery fees.</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-[#13131c] border border-dashed border-[#1f1f2e] rounded-xl p-5 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white/5 transition-colors">
                     <Sparkles className="w-5 h-5 text-[#5a5a7a] mb-2 group-hover:text-[#ff6b35] transition-colors" />
                     <div className="text-[10px] font-bold text-[#5a5a7a] uppercase tracking-widest group-hover:text-white transition-colors">Rent This Space</div>
                     <p className="text-[8px] text-[#5a5a7a] mt-1 italic">Reach 5,000+ local merchants daily.</p>
                  </div>
                </div>
              </div>

              {/* FMCG Notifications Panel */}
              {(fmcgContributions.length > 0 || batchAlerts.length > 0) && (
                <div className="bg-[#13131c] border border-[#1f1f2e] rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#1f1f2e] flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
                       Network Activity
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fmcgContributions.map((c) => (
                      <div key={c.id} className={cn(
                        "p-4 rounded-lg border flex items-center justify-between",
                        c.status === 'active' ? "bg-green-500/5 border-green-500/20" : 
                        c.status === 'rejected' ? "bg-red-500/5 border-red-500/20" : "bg-[#0e0e14] border-[#1f1f2e]"
                      )}>
                        <div>
                          <div className="text-xs font-bold text-white mb-1">
                            {c.status === 'active' ? 'Pool Boost Confirmed' : c.status === 'rejected' ? 'Boost Request Rejected' : 'FMCG Contribution'}
                          </div>
                          <div className="text-[10px] text-[#5a5a7a] font-mono">
                            {c.fmcg_name} // {c.contribution_amount} NX
                          </div>
                        </div>
                        {c.status === 'active' && <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded font-bold">ACTIVE</span>}
                      </div>
                    ))}
                    {batchAlerts.map((b) => (
                      <div key={b.id} className={cn(
                        "p-4 rounded-lg border flex items-center justify-between",
                        b.status === 'deal_accepted' ? "bg-[#ff6b35]/5 border-[#ff6b35]/20" : "bg-[#0e0e14] border-[#1f1f2e]"
                      )}>
                        <div>
                          <div className="text-xs font-bold text-white mb-1">
                            {b.status === 'deal_accepted' ? 'Restock Bid Accepted' : 'Restock Batch Update'}
                          </div>
                          <div className="text-[10px] text-[#5a5a7a] font-mono">
                            {b.fmcg_partners?.name || 'Tendering'} // BATCH {b.id.substring(0, 8)}
                          </div>
                        </div>
                        {b.status === 'deal_accepted' && <span className="text-[10px] bg-[#ff6b35]/20 text-[#ff6b35] px-2 py-0.5 rounded font-bold">ACCEPTED</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#13131c] border border-[#1f1f2e] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f1f2e] flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">Your Sub-Merchants</h3>
                  <button onClick={() => setActiveTab('subs')} className="text-[11px] text-[#ff6b35] font-bold hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] border-b border-[#1f1f2e]">
                        <th className="px-6 py-4 font-semibold">Code</th>
                        <th className="px-6 py-4 font-semibold">Name</th>
                        <th className="px-6 py-4 font-semibold">Tier</th>
                        <th className="px-6 py-4 font-semibold">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f2e]">
                      {subMerchants.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-[#5a5a7a] text-xs">No sub-merchants enrolled yet.</td></tr>
                      ) : (
                        subMerchants.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-[#5a5a7a]">{row.merchant_code}</td>
                            <td className="px-6 py-4 text-sm font-medium">{row.name}</td>
                            <td className="px-6 py-4 text-xs">
                              <span className="px-2 py-0.5 border border-[#ff6b35]/30 text-[#ff6b35] rounded uppercase tracking-tighter">{row.franchise_tier}</span>
                            </td>
                            <td className="px-6 py-4 text-xs text-[#5a5a7a]">{new Date(row.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'subs' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#13131c] border border-[#1f1f2e] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1f1f2e]">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Sub-Merchant Network</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] border-b border-[#1f1f2e]">
                      <th className="px-6 py-4 font-semibold">Code</th>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">Phone</th>
                      <th className="px-6 py-4 font-semibold">Tier</th>
                      <th className="px-6 py-4 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f2e]">
                    {subMerchants.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-[#5a5a7a] text-xs">No sub-merchants found.</td></tr>
                    ) : (
                      subMerchants.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-[#5a5a7a]">{row.merchant_code}</td>
                          <td className="px-6 py-4 text-sm font-medium">{row.name}</td>
                          <td className="px-6 py-4 text-xs font-mono">{row.phone}</td>
                          <td className="px-6 py-4 text-xs">
                            <span className="px-2 py-0.5 border border-[#ff6b35]/30 text-[#ff6b35] rounded uppercase tracking-tighter">{row.franchise_tier}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-[#5a5a7a]">{new Date(row.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'commissions' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#13131c] border border-[#1f1f2e] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1f1f2e] flex justify-between items-center">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider">Commission History</h3>
                <div className="text-[10px] text-[#4ade80] font-bold uppercase tracking-widest">0.2 NX per transaction</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] border-b border-[#1f1f2e]">
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Sub-Merchant</th>
                      <th className="px-6 py-4 font-semibold">Txn Code</th>
                      <th className="px-6 py-4 font-semibold">Amount</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f2e]">
                    {commissions.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-[#5a5a7a] text-xs">No commissions recorded yet.</td></tr>
                    ) : (
                      commissions.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs text-[#5a5a7a]">{new Date(row.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 font-mono text-xs">{row.sub_merchant_code}</td>
                          <td className="px-6 py-4 font-mono text-xs">{row.transaction_code}</td>
                          <td className="px-6 py-4 text-sm text-[#4ade80] font-bold">+{row.amount} NX</td>
                          <td className="px-6 py-4 text-xs">
                            {row.paid_out ? (
                              <span className="text-[#4ade80] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                            ) : (
                              <span className="text-[#ff6b35] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Pending</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'enroll' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
              <div className="bg-[#13131c] border border-[#1f1f2e] rounded-xl p-8">
                <h3 className="font-display text-lg font-bold mb-4">Enroll a New Sub-Merchant</h3>
                <p className="text-[#5a5a7a] text-sm mb-4 leading-relaxed">
                  Add a phone number to the NX whitelist. Once enrolled, the merchant can dial <strong className="text-[#e2e2f0]">*384*6180#</strong> and register immediately without waiting for NX approval. You will earn <strong className="text-[#ff6b35]">0.2 NX</strong> per confirmed transaction from them.
                </p>
                <div className="bg-[#ff6b35]/10 border border-[#ff6b35]/20 rounded-lg p-4 mb-8 text-xs text-[#ff9a6b]">
                  <p className="font-bold flex items-center gap-2 mb-1">
                    <AlertCircle className="w-3 h-3" />
                    Network Limits & Commissions
                  </p>
                  <p>Hubs are limited to 50 sub-merchants. For expansion to 100, contact NX Support at 0781550151. Note: NX takes a 10% commission on hub earnings for networks &gt; 50.</p>
                </div>
                
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-2">Phone Number (254…)</label>
                    <input 
                      type="text" 
                      value={enrollPhone}
                      onChange={(e) => setEnrollPhone(e.target.value)}
                      placeholder="254712345678"
                      className="w-full bg-[#0e0e14] border border-[#2a2a3e] text-[#e2e2f0] px-4 py-3 rounded-lg focus:outline-none focus:border-[#ff6b35] transition-colors"
                    />
                  </div>
                  <button 
                    onClick={handleEnroll}
                    disabled={enrollLoading}
                    className="bg-[#ff6b35] text-white font-display font-bold px-8 py-3 rounded-lg hover:bg-[#ff9a6b] transition-colors disabled:opacity-50"
                  >
                    {enrollLoading ? 'Enrolling...' : 'Enroll'}
                  </button>
                </div>

                {enrollMessage.text && (
                  <div className={cn(
                    "mt-6 p-4 rounded-lg text-xs flex items-center gap-2",
                    enrollMessage.type === 'success' ? "bg-green-500/10 text-green-500" : 
                    enrollMessage.type === 'error' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {enrollMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {enrollMessage.text}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'tier' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="bg-linear-to-br from-[#1a1010] to-[#1a1420] border border-[#ff6b35]/30 rounded-xl p-10">
                <div className="text-[#ff6b35] font-display text-5xl font-extrabold mb-4">HUB</div>
                <p className="text-[#5a5a7a] text-sm max-w-md leading-relaxed">
                  Your tier gives you the highest pool rate, acceptance ceiling, and the ability to build a sub-merchant network.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                  {[
                    { label: 'Pool Rate', val: '70%' },
                    { label: 'Max NX per Txn', val: '40%' },
                    { label: 'Monthly Fee', val: 'KSH 1,000' },
                  ].map((item, i) => (
                    <div key={i} className="bg-black/30 p-6 rounded-lg border border-white/5">
                      <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] mb-2">{item.label}</div>
                      <div className="font-display text-2xl font-bold">{item.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'invoices' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Wallet Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#13131c] border border-[#1f1f2e] p-6 rounded-xl md:col-span-1">
                  <div className="text-[10px] uppercase tracking-widest text-[#5a5a7a] mb-1">Available NX Balance</div>
                  <div className="text-3xl font-extrabold text-[#00ff88] font-mono">{poolBalance.toFixed(1)} <span className="text-xs text-[#5a5a7a]">NX</span></div>
                  <p className="text-[11px] text-[#5a5a7a] mt-2 leading-relaxed">
                    Accumulated from retail sales and commissions. Use your balance to offset and settle restock invoices.
                  </p>
                </div>
                <div className="bg-[#13131c] border border-[#1f1f2e] p-6 rounded-xl md:col-span-2 flex flex-col justify-center">
                  <h4 className="font-display text-sm font-bold uppercase text-[#ff6b35] tracking-wider mb-2">Settlement Policy</h4>
                  <p className="text-[11px] text-[#5a5a7a] leading-relaxed">
                    NX delivers your restocks on credit. Deliveries create a dynamic settlement pool.
                    Unpaid invoices can be fully paid using your NX balance here. Settle early to keep your network pipelines running smoothly!
                  </p>
                </div>
              </div>

              {/* Unpaid Delivered Invoices */}
              <div className="bg-[#13131c] border border-[#1f1f2e] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f1f2e]">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">Unpaid Delivered Invoices (Awaiting Settlement)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] border-b border-[#1f1f2e]">
                        <th className="px-6 py-4 font-semibold">Invoice Code</th>
                        <th className="px-6 py-4 font-semibold">Delivered At</th>
                        <th className="px-6 py-4 font-semibold">Value</th>
                        <th className="px-6 py-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f2e]/60">
                      {unpaidInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-xs text-[#5a5a7a] font-mono">
                            No unpaid delivered invoices found.
                          </td>
                        </tr>
                      ) : (
                        unpaidInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs text-[#ff6b35] font-bold">{inv.id.slice(0, 8).toUpperCase()}</span>
                            </td>
                            <td className="px-6 py-4 text-xs text-[#5a5a7a]">
                              {new Date(inv.delivered_at).toLocaleDateString()} {new Date(inv.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[#e2e2f0]">
                              KES {inv.invoice_amount || 0}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleSettleInvoice(inv)}
                                disabled={settleLoading === inv.id}
                                className="bg-[#ff6b35]/10 border border-[#ff6b35]/20 text-[#ff6b35] hover:bg-[#ff6b35] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {settleLoading === inv.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto text-[#ff6b35]" />
                                ) : (
                                  `Settle with ${Math.min(poolBalance, inv.invoice_amount || 0).toFixed(0)} NX`
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Delivery Invoices */}
              <div className="bg-[#13131c] border border-[#1f1f2e] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1f1f2e]">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">Awaiting Agent Delivery (In-Transit)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.15em] text-[#5a5a7a] border-b border-[#1f1f2e]">
                        <th className="px-6 py-4 font-semibold">Invoice Code</th>
                        <th className="px-6 py-4 font-semibold">Created At</th>
                        <th className="px-6 py-4 font-semibold">Estimated Value</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Handshake</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f2e]/60">
                      {pendingInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-xs text-[#5a5a7a] font-mono">
                            No active deliveries in transit.
                          </td>
                        </tr>
                      ) : (
                        pendingInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs text-[#5a5a7a]">{inv.id.slice(0, 8).toUpperCase()}</span>
                            </td>
                            <td className="px-6 py-4 text-xs text-[#5a5a7a]">
                              {new Date(inv.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-[#5a5a7a]">
                              KES {inv.invoice_amount || 0}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 bg-[#ff6b35]/10 border border-[#ff6b35]/20 text-[#ff6b35] text-[10px] font-bold uppercase rounded-full">
                                Pending Delivery
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  id={`portal-confirm-delivery-${inv.id}`}
                                  onClick={() => handleConfirmDelivery(inv)}
                                  disabled={!hasPendingRequest}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    hasPendingRequest
                                      ? 'bg-[#ff6b35] text-white hover:bg-[#ff6b35]/90 active:scale-[0.98]'
                                      : 'bg-white/[0.05] text-[#5a5a7a] border border-[#1f1f2e] cursor-not-allowed opacity-[0.4]'
                                  }`}
                                >
                                  Confirm Handshake
                                </button>
                                {!hasPendingRequest && (
                                  <span className="text-[8px] text-[#ff6b35]/70 uppercase font-mono tracking-wide">
                                    ⚠️ Requires active restock request
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <footer className="w-full mx-auto px-4 md:px-8 py-12 border-t border-[#1f1f2e] text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#5a5a7a] mb-4">Support</div>
        <div className="flex flex-col items-center gap-2">
          <a href="tel:0781550151" className="text-lg text-[#ff6b35] font-display font-bold">0781550151</a>
          <p className="text-[11px] text-[#5a5a7a]">Contact NX Support for any portal issues or account queries.</p>
        </div>
      </footer>
    </div>
  );
}
