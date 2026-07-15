import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import NXLogo from '../../components/NXLogo';
import NotificationIcon from '../../components/NotificationIcon';
import { 
  LogOut, 
  QrCode, 
  History, 
  Wallet, 
  X, 
  CheckCircle2, 
  MapPin, 
  TrendingUp, 
  Award, 
  Share2,
  ChevronRight,
  Info,
  Star,
  Store,
  Navigation,
  ArrowRight,
  Clock,
  AlertCircle,
  Zap,
  Menu,
  Users,
  Lock,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { cn } from '../../lib/utils';
import { TIER_CONFIG } from '../../services/ussd/config';
import { initDB } from '../../lib/db';
import toast, { Toaster } from 'react-hot-toast';

const CORE_SKUS = []; // Empty since shop is removed

function floorToFive(n: number): number {
  return Math.floor(n / 5) * 5;
}

export default function CustomerDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<any[]>([]);
  const [weeklySavings, setWeeklySavings] = useState(0);
  const [nearbyMerchants, setNearbyMerchants] = useState<any[]>([]);
  const [loyaltyStats, setLoyaltyStats] = useState({ level: 'NX Pioneer', progress: 65, nextLevel: 'NX Elite' });
  const [activeTab, setActiveTab] = useState<'home' | 'merchants' | 'history' | 'family'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [familyAccount, setFamilyAccount] = useState<any>(null);
  const [familyTxns, setFamilyTxns] = useState<any[]>([]);
  const [familyCodeInput, setFamilyCodeInput] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isFamilyPaymentMode, setIsFamilyPaymentMode] = useState(false); // individual vs family payment tab
  const [familyCodePaymentInput, setFamilyCodePaymentInput] = useState('');
  
  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [merchantCode, setMerchantCode] = useState('');
  const [amount, setAmount] = useState('');
  const [payStatus, setPayStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [payError, setPayError] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);

  const fetchBalanceAndTxns = async () => {
    // Calculate balance dynamically from transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select('nx_earned, nx_redeemed, nx_fee')
      .eq('customer_phone', user.phone)
      .eq('status', 'completed');
      
    if (txns) {
      const earned = txns.reduce((sum, t) => sum + (Number(t.nx_earned) || 0), 0);
      const redeemed = txns.reduce((sum, t) => sum + (Number(t.nx_redeemed) || 0), 0);
      const fees = txns.reduce((sum, t) => sum + (Number(t.nx_fee) || 0), 0);
      setBalance(earned - redeemed - fees);
    }

    // Fetch recent txns
    const { data: recent } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_phone', user.phone)
      .order('created_at', { ascending: false });
    
    if (recent) {
      setTxns(recent);
      
      // Calculate weekly savings
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekly = recent
        .filter(t => new Date(t.created_at) > weekAgo)
        .reduce((sum, t) => sum + (t.nx_redeemed || 0), 0);
      setWeeklySavings(weekly);

      // We rely on the real-time listener in PwaApp to catch is_first_purchase_used updates
      // The manual query here has been removed to avoid RLS infinite recursion issues.

      // Creative: Loyalty Level based on total earned
      const totalEarned = recent.reduce((sum, t) => sum + (t.nx_earned || 0), 0);
      if (totalEarned > 500) setLoyaltyStats({ level: 'NX Legend', progress: 100, nextLevel: 'Max Level' });
      else if (totalEarned > 200) setLoyaltyStats({ level: 'NX Elite', progress: Math.min(100, ((totalEarned - 200) / 300) * 100), nextLevel: 'NX Legend' });
      else setLoyaltyStats({ level: 'NX Pioneer', progress: Math.min(100, (totalEarned / 200) * 100), nextLevel: 'NX Elite' });
    }

    // Fetch "Nearby" Merchants (Simulated by same location or just active ones)
    
    // Fetch "Nearby" Merchants
    const fetchMerchants = async () => {
      const { data: merchants } = await supabase
        .from('users')
        .select('name, merchant_code, location')
        .eq('role', 'merchant')
        .limit(10);
      
      if (merchants) {
        const withDistance = merchants.map(m => ({
          ...m,
          distance: Math.floor(Math.random() * 800 + 50) 
        })).sort((a, b) => a.distance - b.distance);
        setNearbyMerchants(withDistance);
      }
      setIsLoading(false);
    };
    fetchMerchants();
  };

  const fetchFamilyAccount = async () => {
    const { data: fam } = await supabase
      .from('family_accounts')
      .select('*')
      .eq('parent_phone', user.phone)
      .maybeSingle();

    if (fam) {
      setFamilyAccount(fam);
      const { data: fTxns } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_code', fam.family_code)
        .order('created_at', { ascending: false });
      if (fTxns) {
        setFamilyTxns(fTxns);
      }
    } else {
      setFamilyAccount(null);
      setFamilyTxns([]);
    }
  };

  useEffect(() => {
    fetchBalanceAndTxns();
    fetchFamilyAccount();
  }, [user.phone]);

  const handlePay = async (e: FormEvent) => {
    e.preventDefault();
    setPayStatus('loading');
    setPayError('');
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 ) {
      setPayError('Amount must be valid.');
      setPayStatus('error');
      return;
    }

    try {
      if (!navigator.onLine) {
        const db = await initDB();
        await db.add('offlineTasks', {
           type: 'PAYMENT',
           payload: { merchantCode: merchantCode.toUpperCase(), amount: numAmount, phone: user.phone },
           timestamp: Date.now()
         });
        toast.error("Offline: Payment saved locally. Will sync when online.");
        setPayStatus('idle');
        setIsPayModalOpen(false);
        return;
      }

      let targetBalance = balance;
      let parentPhone = '';

      if (isFamilyPaymentMode) {
        if (!familyCodePaymentInput) {
          setPayError('Family Code is required.');
          setPayStatus('error');
          return;
        }

        const { data: family, error: famErr } = await supabase
          .from('family_accounts')
          .select('*')
          .eq('family_code', familyCodePaymentInput.toUpperCase().trim())
          .maybeSingle();

        if (famErr || !family) {
          setPayError('Family account not found. Check the code.');
          setPayStatus('error');
          return;
        }

        if (!family.allow_spending || family.status !== 'active') {
          setPayError('Family spending is deactivated by the parent.');
          setPayStatus('error');
          return;
        }

        parentPhone = family.parent_phone;

        // Fetch parent's balance
        const { data: parentUser, error: parentErr } = await supabase
          .from('users')
          .select('nx_balance')
          .eq('phone', parentPhone)
          .maybeSingle();

        if (parentErr || !parentUser) {
          setPayError('Could not retrieve parent balance.');
          setPayStatus('error');
          return;
        }

        targetBalance = Number(parentUser.nx_balance || 0);
      }

      // 1. Find merchant
      const { data: merchant, error: merchantErr } = await supabase
        .from('users')
        .select('*')
        .eq('merchant_code', merchantCode.toUpperCase())
        .eq('role', 'merchant')
        .maybeSingle();

      if (merchantErr || !merchant) {
        setPayError('Merchant not found. Check the code.');
        setPayStatus('error');
        return;
      }

      // Check merchant pool/activation
      const [{ data: marginRes }, { data: fmcgRes }] = await Promise.all([
        supabase
          .from('merchant_margins')
          .select('gross_margin')
          .eq('merchant_code', merchant.merchant_code)
          .maybeSingle(),
        supabase
          .from('fmcg_margin_contributions')
          .select('contribution_amount')
          .eq('merchant_code', merchant.merchant_code)
          .eq('status', 'active')
      ]);
      
      const fmcgBoost = fmcgRes?.reduce((s, r) => s + Number(r.contribution_amount || 0), 0) || 0;
      const baseMargin = marginRes?.gross_margin || 0;
      const merchantCfg = TIER_CONFIG[merchant.franchise_tier || merchant.tier || 'BASIC'] || TIER_CONFIG.BASIC;
      const totalPool = (baseMargin * merchantCfg.poolRate) + fmcgBoost;
      
      if (totalPool <= 0) {
        setPayError(`Merchant ${merchant.merchant_code} is not yet active. (Pool: ${totalPool.toFixed(1)} NX). Must restock or receive a boost.`);
        setPayStatus('error');
        return;
      }

      // 2. Calculate transaction
      const isFirst = !user.is_first_purchase_used;
      const earnRate = isFirst ? 0.10 : 0.05;

      // Pool utilization math for dynamic capping
      const poolAmount = (baseMargin * merchantCfg.poolRate) + fmcgBoost;
      const { data: rdRes } = await supabase.from('transactions')
        .select('nx_redeemed, nx_earned')
        .eq('merchant_code', merchant.merchant_code)
        .in('status', ['completed', 'awaiting_merchant', 'pending_customer']);
      
      const totalLiability = rdRes?.reduce((s, x) => s + (x.nx_redeemed || 0) + (x.nx_earned || 0), 0) || 0;
      const remainingPool = Math.max(0, poolAmount - totalLiability); 
      const utilization = poolAmount > 0 ? (totalLiability / poolAmount) : 1;

      // Dynamic Acceptance Rate
      let dynamicCeiling = merchantCfg.acceptCeiling;
      if (utilization >= 0.90) dynamicCeiling = 0;
      else if (utilization >= 0.70) dynamicCeiling = Math.min(0.10, merchantCfg.acceptCeiling);
      else if (utilization >= 0.40) dynamicCeiling = Math.min(0.20, merchantCfg.acceptCeiling);

      // Earn Multiplier
      let earnMultiplier = 1;
      if (utilization >= 0.90) earnMultiplier = 0;
      else if (utilization >= 0.70) earnMultiplier = 0.25;
      else if (utilization >= 0.40) earnMultiplier = 0.50;

      const maxNxAllowed = Math.floor(numAmount * dynamicCeiling);
      const nxRedeemed = floorToFive(Math.min(targetBalance, maxNxAllowed, remainingPool));
      const cashPaid = numAmount - nxRedeemed;
      const nxEarned = isFamilyPaymentMode ? 0 : Math.floor(cashPaid * earnRate * earnMultiplier); // child earns 0 if parent pays to avoid double-dipping, or they can earn. Let's make child earn 0 passively on family pay.
      const nxFee = targetBalance > 0 ? 2 : 0; 
      
      const transactionCode = 'NX' + Math.random().toString(36).substring(2, 8).toUpperCase();

      // 3. Record Transaction (Awaiting Approval)
      try {
        const txnPayload: any = {
          transaction_code: transactionCode,
          customer_phone: user.phone,
          merchant_code: merchant.merchant_code,
          merchant_phone: merchant.phone,
          amount: numAmount,
          nx_redeemed: nxRedeemed,
          nx_earned: nxEarned,
          cash_paid: cashPaid,
          nx_fee: nxFee,
          status: 'awaiting_merchant'
        };

        if (isFamilyPaymentMode) {
          txnPayload.family_code = familyCodePaymentInput.toUpperCase().trim();
        }

        const { error: txnErr } = await supabase.from('transactions').insert([txnPayload]);

        if (txnErr) {
          if (txnErr.code === '23503') {
            console.error("FK Violation:", txnErr);
            throw new Error(`Merchant [${merchant.merchant_code}] is not fully active. Ask them to update their profile or restock to activate their Node.`);
          }
          throw txnErr;
        }
      } catch (err: any) {
        console.error("Transaction insert failed:", err);
        setPayError(err.message || "Failed to initiate payment. Please try again.");
        setPayStatus('idle');
        return;
      }

      // Success - Show waiting screen
      setReceipt({
        merchantName: merchant.name,
        amount: numAmount,
        cashPaid,
        nxRedeemed,
        nxEarned,
        nxFee,
        earnLabel: isFirst ? '10% (First Purchase)' : '5%',
        utilization,
        transactionCode
      });
      setPayStatus('success');

      // 4. Real-time listener for this transaction
      const channel = supabase
        .channel(`txn-${transactionCode}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `transaction_code=eq.${transactionCode}`
        }, (payload) => {
          if (payload.new.status === 'completed') {
            setPayStatus('completed');
            supabase.removeChannel(channel);
          } else if (payload.new.status === 'cancelled' || payload.new.status === 'rejected_by_merchant') {
            setPayStatus('error');
            setPayError('Transaction was rejected or cancelled');
            supabase.removeChannel(channel);
          }
        })
        .subscribe();
      fetchBalanceAndTxns();
      
    } catch (err: any) {
      console.error(err);
      setPayError(err.message || 'Transaction failed');
      setPayStatus('error');
    }
  };

  const closePayModal = () => {
    setIsPayModalOpen(false);
    setPayStatus('idle');
    setMerchantCode('');
    setAmount('');
    setReceipt(null);
  };

  // Live calculation for the UI
  const liveAmount = parseFloat(amount) || 0;
  const liveMaxNx = liveAmount * 0.3; 
  const liveNxRedeem = floorToFive(Math.min(balance || 0, liveMaxNx));
  const liveCash = liveAmount - liveNxRedeem;
  const liveNxFee = balance > 0 ? 2 : 0;
  const isInvalidAmount = false;

  return (
    <div className="flex-1 flex flex-col bg-nx-ink relative">
      {/* Header */}
      <header className="px-6 py-5 border-b border-nx-border flex items-center justify-between bg-nx-card relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-nx-muted hover:text-nx-paper transition-colors rounded-lg hover:bg-nx-border/20"
          >
            <Menu className="w-5 h-5" />
          </button>
          <NXLogo title={user.name} />
        </div>
        <div className="flex items-center gap-2">
          <NotificationIcon />
          <button onClick={onLogout} className="p-2 text-nx-muted hover:text-nx-ember transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />

            {/* Sidebar Box */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-nx-card border-r border-nx-border shadow-2xl z-50 flex flex-col p-6"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-nx-border">
                <NXLogo title="NX Network" />
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-nx-muted hover:text-nx-paper hover:bg-nx-border/20 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Info */}
              <div className="mb-8 p-4 bg-nx-ink/50 border border-nx-border rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-nx-amber/10 border border-nx-amber/20 flex items-center justify-center font-display text-nx-amber font-bold">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-nx-paper">{user.name}</div>
                  <div className="text-[10px] text-nx-muted font-mono">{user.phone}</div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    activeTab === 'home'
                      ? "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
                      : "text-nx-muted hover:text-nx-paper hover:bg-nx-border/10"
                  )}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Wallet</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('merchants');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    activeTab === 'merchants'
                      ? "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
                      : "text-nx-muted hover:text-nx-paper hover:bg-nx-border/10"
                  )}
                >
                  <Store className="w-4 h-4" />
                  <span>Dukas &amp; Shops</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('family');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    activeTab === 'family'
                      ? "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
                      : "text-nx-muted hover:text-nx-paper hover:bg-nx-border/10"
                  )}
                >
                  <Users className="w-4 h-4" />
                  <span>Family Account</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('history');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    activeTab === 'history'
                      ? "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
                      : "text-nx-muted hover:text-nx-paper hover:bg-nx-border/10"
                  )}
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </button>
              </div>

              {/* Bottom Version */}
              <div className="pt-4 border-t border-nx-border text-center">
                <span className="text-[10px] font-mono text-nx-muted uppercase tracking-widest">NX Loyalty v1.2</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12">
        {activeTab === 'home' && (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-nx-card to-nx-card2 border border-nx-border rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-nx-amber/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-nx-amber">
                  <Wallet className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Available NX</span>
                </div>
                <div className="px-2 py-1 bg-nx-amber/10 rounded text-[9px] text-nx-amber font-bold border border-nx-amber/20">
                  {loyaltyStats.level}
                </div>
              </div>
              <div className="font-display text-5xl text-nx-paper tracking-wider mb-1">
                <AnimatedNumber value={balance} decimals={2} />
              </div>
              <div className="flex items-center gap-2 text-xs text-nx-muted">
                <span>≈ KSH <AnimatedNumber value={balance} decimals={2} /> value</span>
                <span className="w-1 h-1 rounded-full bg-nx-border"></span>
                <span className="text-nx-green font-medium">+<AnimatedNumber value={weeklySavings} decimals={0} /> saved this week</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1">
              <button 
                onClick={() => setIsPayModalOpen(true)}
                className="bg-nx-card border border-nx-border rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:border-nx-amber transition-colors group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-nx-amber animate-pulse"></div>
                </div>
                <div className="w-12 h-12 rounded-full bg-nx-amber/10 flex items-center justify-center group-hover:bg-nx-amber/20 transition-colors">
                  <QrCode className="w-6 h-6 text-nx-amber" />
                </div>
                <span className="text-xs font-bold text-nx-paper uppercase tracking-widest">Pay Merchant</span>
              </button>
            </div>

            {/* Quick Nearby */}
            <div className="bg-nx-card border border-nx-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-nx-green" />
                  <span className="text-[10px] uppercase tracking-widest text-nx-paper font-bold">Closest Shop</span>
                </div>
                <button onClick={() => setActiveTab('merchants')} className="text-[9px] text-nx-amber uppercase font-bold">Switch</button>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-between animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-nx-border rounded"></div>
                    <div className="h-3 w-16 bg-nx-border rounded"></div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-4 w-12 bg-nx-border rounded ml-auto"></div>
                    <div className="h-3 w-10 bg-nx-border rounded ml-auto"></div>
                  </div>
                </div>
              ) : nearbyMerchants[0] ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-nx-paper">{nearbyMerchants[0].name}</div>
                    <div className="text-[10px] text-nx-muted font-mono">{nearbyMerchants[0].merchant_code}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-nx-green">{nearbyMerchants[0].distance}m away</div>
                      <div className="text-[9px] text-nx-muted">Open Now</div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearbyMerchants[0].location || nearbyMerchants[0].name)}`, '_blank');
                      }}
                      className="p-2 bg-nx-amber/10 rounded-lg text-nx-amber hover:bg-nx-amber/20 transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-nx-muted text-center py-2">No active merchants found nearby.</div>
              )}
            </div>

            {/* Loyalty Progress */}
            <div className="bg-nx-card border border-nx-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-nx-amber" />
                  <span className="text-[10px] uppercase tracking-widest text-nx-paper font-bold">Loyalty Level</span>
                </div>
                <span className="text-[10px] text-nx-muted uppercase tracking-widest">Next: {loyaltyStats.nextLevel}</span>
              </div>
              <div className="h-2 bg-nx-ink rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-nx-amber to-nx-ember transition-all duration-1000" 
                  style={{ width: `${loyaltyStats.progress}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-nx-muted leading-relaxed">
                You've supported <span className="text-nx-paper font-bold">{txns.length}</span> local businesses. Earn {Math.max(0, 100 - loyaltyStats.progress).toFixed(0)}% more to reach {loyaltyStats.nextLevel}.
              </p>
            </div>

            {/* Referral Section */}
            <div className="bg-nx-card border border-nx-border rounded-xl p-5 space-y-6">
              <div className="flex items-center justify-between group cursor-pointer hover:border-nx-amber transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-nx-ember/10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-nx-ember" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-nx-paper font-bold mb-0.5">Invite Friends</div>
                    <div className="text-[10px] text-nx-muted">Share the NX Network with your community</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-nx-muted group-hover:text-nx-amber transition-colors" />
              </div>

              <div className="pt-4 border-t border-nx-border flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-white p-1.5 rounded-lg shadow-inner">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/app/login')}`} 
                    alt="PWA QR Code" 
                    className="w-full h-full"
                  />
                </div>
                <p className="text-[9px] text-nx-muted uppercase tracking-widest font-bold">Scan to share app</p>
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] uppercase tracking-widest text-nx-muted font-bold">Recent Activity</h3>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="text-[10px] text-nx-amber uppercase tracking-widest hover:underline font-bold"
                >
                  View All
                </button>
              </div>
              
              <div className="space-y-3">
                {txns.length === 0 ? (
                  <div className="text-center py-8 text-nx-muted text-xs border border-dashed border-nx-border rounded-xl">
                    No transactions yet
                  </div>
                ) : (
                  txns.slice(0, 5).map((txn) => (
                    <div key={txn.id} className="bg-nx-card border border-nx-border rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-nx-ink flex items-center justify-center border border-nx-border">
                          <TrendingUp className="w-4 h-4 text-nx-green" />
                        </div>
                        <div>
                          <div className="text-xs text-nx-paper font-bold mb-0.5">Paid {txn.merchant_code}</div>
                          <div className="text-[10px] text-nx-muted">{new Date(txn.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-nx-ember font-bold">- {txn.nx_redeemed.toFixed(2)} NX</div>
                        <div className="text-[9px] text-nx-green font-medium">+ {txn.nx_earned.toFixed(2)} NX</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'merchants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest text-nx-paper font-bold">Nearby Merchants</h3>
              <div className="flex items-center gap-1 text-[10px] text-nx-muted">
                <Info className="w-3 h-3" />
                <span>Based on your location</span>
              </div>
            </div>

            <div className="space-y-3">
              {nearbyMerchants.map((m, i) => (
                <div 
                  key={i} 
                  className="bg-nx-card border border-nx-border rounded-xl p-4 flex items-center justify-between group hover:border-nx-amber transition-colors cursor-pointer"
                  onClick={() => {
                    setMerchantCode(m.merchant_code);
                    setIsPayModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-nx-ink flex items-center justify-center border border-nx-border group-hover:border-nx-amber/30 transition-colors">
                      <Store className="w-5 h-5 text-nx-amber" />
                    </div>
                    <div>
                      <div className="text-sm text-nx-paper font-bold mb-0.5">{m.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-nx-muted">
                        <span className="font-mono text-nx-amber">{m.merchant_code}</span>
                        <span className="w-1 h-1 rounded-full bg-nx-border"></span>
                        <span>{m.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-nx-paper mb-0.5">{m.distance}m</div>
                      <div className="flex items-center gap-0.5 text-nx-amber">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span className="text-[9px] font-bold">4.8</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location || m.name)}`, '_blank');
                      }}
                      className="p-2.5 bg-nx-amber/10 rounded-xl text-nx-amber hover:bg-nx-amber/20 transition-colors"
                    >
                      <Navigation className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'family' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest text-nx-paper font-bold">Family Account Management</h3>
              <span className="text-[10px] bg-nx-amber/10 border border-nx-amber/20 text-nx-amber px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Parent Center
              </span>
            </div>

            {familyAccount ? (
              <div className="space-y-6">
                {/* Active Family Card */}
                <div className="bg-gradient-to-br from-nx-card to-nx-card2 border border-nx-border rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-nx-amber/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase tracking-widest text-nx-amber font-bold flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> Family Sharing Active
                    </span>
                    <span className="px-2 py-1 bg-nx-amber/10 rounded text-[9px] text-nx-amber font-bold border border-nx-amber/20 uppercase">
                      Code Valid
                    </span>
                  </div>

                  <div className="font-mono text-4xl text-nx-paper tracking-widest text-center my-6 select-all font-bold">
                    {familyAccount.family_code}
                  </div>

                  <p className="text-[11px] text-nx-muted text-center mb-6">
                    Give this code to your children or family members. They can enter this code at any certified Duka to pay directly using your NX balance.
                  </p>

                  <div className="pt-4 border-t border-nx-border/50 flex justify-between items-center text-xs">
                    <span className="text-nx-muted">Shared Wallet Balance</span>
                    <span className="text-nx-amber font-bold font-mono text-sm">{balance.toFixed(2)} NX</span>
                  </div>
                </div>

                {/* Risk Toggle Section */}
                <div className="bg-nx-card border border-nx-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-nx-paper uppercase tracking-wider">Spending Access</h4>
                      <p className="text-[10px] text-nx-muted">Toggle between passive earning and shared redemptions</p>
                    </div>
                    <button
                      onClick={async () => {
                        const newAllow = !familyAccount.allow_spending;
                        const { error } = await supabase
                          .from('family_accounts')
                          .update({ allow_spending: newAllow })
                          .eq('id', familyAccount.id);
                        if (!error) {
                          setFamilyAccount({ ...familyAccount, allow_spending: newAllow });
                          toast.success(newAllow ? "Shared spending enabled!" : "Deactivated shared spending.");
                        } else {
                          toast.error("Failed to update family spending state.");
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all duration-300",
                        familyAccount.allow_spending
                          ? "bg-nx-ember/10 text-nx-ember border-nx-ember/20"
                          : "bg-nx-green/10 text-nx-green border-nx-green/20"
                      )}
                    >
                      {familyAccount.allow_spending ? "Earn & Spend" : "Earn Only"}
                    </button>
                  </div>

                  {familyAccount.allow_spending ? (
                    <div className="p-3 bg-nx-ember/10 border border-nx-ember/20 rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-nx-ember shrink-0 mt-0.5" />
                      <p className="text-[10px] text-nx-ember uppercase tracking-tight leading-normal">
                        <strong>Warning (Earn &amp; Spend Active)</strong>: Family members with your code can now redeem tokens directly from your personal wallet. You accept the financial risks.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-nx-green/10 border border-nx-green/20 rounded-xl flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-nx-green shrink-0 mt-0.5" />
                      <p className="text-[10px] text-nx-green uppercase tracking-tight leading-normal">
                        <strong>Earn Only Mode (De-risked)</strong>: Family members can only passively earn NX units for the family pool. They cannot spend or deplete your tokens.
                      </p>
                    </div>
                  )}
                </div>

                {/* Manage Code Section */}
                <div className="bg-nx-card border border-nx-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-nx-paper uppercase tracking-wider">Security & Access</h4>
                      <p className="text-[10px] text-nx-muted">Regenerate your code or revoke all family access</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setConfirmModal({
                          title: "Regenerate Family Code",
                          message: "Are you sure you want to regenerate the family code? The old code will stop working immediately.",
                          onConfirm: async () => {
                            const newCode = `FAM${Math.floor(10000 + Math.random() * 90000)}`;
                            const { error } = await supabase
                              .from('family_accounts')
                              .update({ family_code: newCode })
                              .eq('id', familyAccount.id);
                            if (!error) {
                              setFamilyAccount({ ...familyAccount, family_code: newCode });
                              toast.success("Family code regenerated successfully.");
                            } else {
                              toast.error("Failed to regenerate family code.");
                            }
                          }
                        });
                      }}
                      className="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-nx-amber/30 text-nx-amber hover:bg-nx-amber/10 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer bg-transparent"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate Code
                    </button>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          title: "Revoke Family Access",
                          message: "Are you sure you want to permanently revoke family access? This action cannot be undone.",
                          onConfirm: async () => {
                            const { error } = await supabase
                              .from('family_accounts')
                              .delete()
                              .eq('id', familyAccount.id);
                            if (!error) {
                              setFamilyAccount(null);
                              toast.success("Family access revoked.");
                            } else {
                              toast.error("Failed to revoke family access.");
                            }
                          }
                        });
                      }}
                      className="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-nx-ember/30 text-nx-ember hover:bg-nx-ember/10 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer bg-transparent"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Revoke Access
                    </button>
                  </div>
                </div>

                {/* Family Transactions Ledger */}
                <div className="bg-nx-card border border-nx-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-nx-border">
                    <span className="text-[10px] uppercase tracking-widest text-nx-paper font-bold">Family Activity Logs</span>
                    <span className="text-[9px] text-nx-muted font-mono">{familyTxns.length} events logged</span>
                  </div>

                  {familyTxns.length === 0 ? (
                    <div className="text-center py-6 text-xs text-nx-muted">
                      No family transactions recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {familyTxns.map((txn) => (
                        <div key={txn.id} className="bg-nx-ink/40 border border-nx-border/50 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <div className="text-xs text-nx-paper font-bold">Spender: {txn.customer_phone}</div>
                            <div className="text-[10px] text-nx-muted mb-1">Kiosk: {txn.merchant_code}</div>
                            <div className="text-[9px] text-nx-muted font-mono uppercase">{txn.transaction_code}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono text-nx-paper font-bold font-mono">KSH {txn.amount}</div>
                            <div className="text-[10px] text-nx-ember font-mono">- {txn.nx_redeemed.toFixed(2)} NX</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-nx-card border border-nx-border rounded-xl p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-nx-amber/10 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-nx-amber" />
                </div>
                <div>
                  <h4 className="font-display text-xl text-nx-paper mb-1">Create Family Account</h4>
                  <p className="text-xs text-nx-muted max-w-xs mx-auto">
                    Generate a revocable, regeneratable family code to allow children to passively earn NX units or share spending privileges with your oversight.
                  </p>
                </div>

                <button
                  onClick={async () => {
                    setIsCreatingFamily(true);
                    const code = "FAM" + Math.floor(10000 + Math.random() * 90000);
                    const { error } = await supabase
                      .from('family_accounts')
                      .insert({
                        parent_phone: user.phone,
                        family_code: code,
                        status: 'active',
                        allow_spending: false // defaults to earn only! De-risked!
                      });
                    
                    if (!error) {
                      toast.success("Family account created successfully!");
                      await fetchFamilyAccount();
                    } else {
                      toast.error("Failed to register family account.");
                    }
                    setIsCreatingFamily(false);
                  }}
                  disabled={isCreatingFamily}
                  className="w-full py-3 bg-nx-amber text-nx-ink font-bold uppercase tracking-wider rounded-xl hover:bg-nx-paper transition-colors disabled:opacity-50"
                >
                  {isCreatingFamily ? "Creating..." : "Generate Family Code"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h3 className="text-xs uppercase tracking-widest text-nx-paper font-bold">Transaction History</h3>
            <div className="space-y-3">
              {txns.length === 0 ? (
                <div className="text-center py-8 text-nx-muted text-xs border border-dashed border-nx-border rounded-xl">
                  No transactions yet
                </div>
              ) : (
                txns.map((txn) => (
                  <div key={txn.id} className="bg-nx-card border border-nx-border rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-nx-ink flex items-center justify-center border border-nx-border shrink-0">
                        <TrendingUp className="w-5 h-5 text-nx-green" />
                      </div>
                      <div>
                        <div className="text-xs text-nx-paper font-bold mb-1">Paid {txn.merchant_code}</div>
                        <div className="text-[10px] text-nx-muted">{new Date(txn.created_at).toLocaleString()}</div>
                        <div className="text-[9px] text-nx-muted mt-1 font-mono uppercase">{txn.transaction_code}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-nx-paper font-bold">KSH {txn.amount}</div>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        <div className="text-[10px] font-mono text-nx-ember font-bold">- {txn.nx_redeemed.toFixed(2)} NX</div>
                        <div className="text-[10px] text-nx-green font-bold">+ {txn.nx_earned.toFixed(2)} NX</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation removed in favor of sidebar */}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-nx-card border border-nx-border w-full max-w-sm rounded-2xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-nx-paper mb-2">{confirmModal.title}</h3>
            <p className="text-xs text-nx-muted mb-6">{confirmModal.message}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-nx-paper bg-nx-border/20 hover:bg-nx-border/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors",
                  confirmModal.title.includes('Revoke') ? "bg-nx-ember text-white hover:opacity-90" : "bg-nx-amber text-nx-ink hover:opacity-90"
                )}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPayModalOpen && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-nx-card border border-nx-border w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between p-4 border-b border-nx-border">
              <h3 className="font-display text-xl text-nx-paper tracking-wider">Pay Merchant</h3>
              <button onClick={closePayModal} className="p-2 text-nx-muted hover:text-nx-paper transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {payStatus === 'completed' && receipt ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-nx-green/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-nx-green" />
                  </div>
                  <div>
                    <h4 className="font-display text-2xl text-nx-paper mb-1">Payment Successful</h4>
                    <p className="text-sm text-nx-muted">Paid to {receipt.merchantName}</p>
                  </div>
                  
                  <div className="bg-nx-ink border border-nx-border rounded-xl p-4 space-y-3 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-nx-muted">Total Amount</span>
                      <span className="text-nx-paper font-mono">KSH {receipt.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nx-muted">NX Redeemed</span>
                      <span className="text-nx-amber font-mono">- {receipt.nxRedeemed.toFixed(2)} NX</span>
                    </div>
                    {receipt.nxFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-nx-amber flex items-center gap-1">
                          Network Fee <Info size={12} />
                        </span>
                        <span className="text-nx-amber font-mono">{receipt.nxFee.toFixed(2)} NX</span>
                      </div>
                    )}
                    <div className="h-px bg-nx-border my-2"></div>
                    <div className="flex justify-between font-medium">
                      <span className="text-nx-paper">Cash to Pay</span>
                      <span className="text-nx-green font-mono">KSH {receipt.cashPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-nx-border/50">
                      <span className="text-nx-muted text-xs">NX Earned</span>
                      <span className="text-nx-green text-xs font-mono">+ {receipt.nxEarned.toFixed(2)} NX</span>
                    </div>
                  </div>
                  
                  <button onClick={closePayModal} className="w-full py-3 bg-nx-amber text-nx-ink font-bold uppercase tracking-wider rounded-xl">
                    Done
                  </button>
                </div>
              ) : payStatus === 'success' && receipt ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-nx-amber/10 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-nx-amber animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-display text-2xl text-nx-paper mb-1">Awaiting Approval</h4>
                    <p className="text-sm text-nx-muted">Waiting for {receipt.merchantName} to confirm</p>
                  </div>
                  
                  <div className="bg-nx-ink border border-nx-border rounded-xl p-4 space-y-3 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-nx-muted">Total Bill</span>
                      <span className="text-nx-paper font-mono">KSH {receipt.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nx-muted">NX Redeemed</span>
                      <span className="text-nx-amber font-mono">- {receipt.nxRedeemed.toFixed(2)} NX</span>
                    </div>
                    {receipt.nxFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-nx-amber flex items-center gap-1">
                          Network Fee <Info size={12} />
                        </span>
                        <span className="text-nx-amber font-mono">{receipt.nxFee.toFixed(2)} NX</span>
                      </div>
                    )}
                    <div className="h-px bg-nx-border my-2"></div>
                    <div className="flex justify-between font-bold">
                      <span className="text-nx-paper">Cash to Pay</span>
                      <span className="text-nx-green font-mono">KSH {receipt.cashPaid.toFixed(2)}</span>
                    </div>
                    <div className="bg-nx-amber/5 p-3 rounded-xl border border-nx-amber/10 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-nx-muted text-xs italic flex items-center gap-1">
                          <Zap size={14} className="text-nx-amber" /> You are earning
                        </span>
                        <span className="text-nx-green text-sm font-bold">+ {receipt.nxEarned.toFixed(2)} NX</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-nx-muted mt-1 uppercase tracking-tighter">
                        <span>Rate: {receipt.earnLabel}</span>
                        {receipt.utilization > 0.4 && (
                          <span>(Throttled by merchant health)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-nx-ink border border-nx-border rounded-xl">
                    <p className="text-[10px] text-nx-muted uppercase tracking-widest text-center">
                      Please ask the merchant to approve the transaction on their dashboard.
                    </p>
                  </div>

                  <button onClick={closePayModal} className="w-full py-3 border border-nx-border text-nx-muted font-bold uppercase tracking-wider rounded-xl">
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePay} className="space-y-5">
                  {/* Payment Type Tabs */}
                  <div className="grid grid-cols-2 p-1 bg-nx-ink border border-nx-border rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIsFamilyPaymentMode(false)}
                      className={cn(
                        "py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        !isFamilyPaymentMode
                          ? "bg-nx-amber text-nx-ink"
                          : "text-nx-muted hover:text-nx-paper"
                      )}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFamilyPaymentMode(true)}
                      className={cn(
                        "py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        isFamilyPaymentMode
                          ? "bg-nx-amber text-nx-ink"
                          : "text-nx-muted hover:text-nx-paper"
                      )}
                    >
                      Family Account
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-nx-muted mb-2">Merchant Code</label>
                    <input 
                      type="text" 
                      value={merchantCode}
                      onChange={(e) => setMerchantCode(e.target.value.toUpperCase())}
                      placeholder="e.g. M123456"
                      className="w-full bg-nx-ink border border-nx-border rounded-xl px-4 py-3 text-nx-paper focus:outline-none focus:border-nx-amber transition-colors font-mono uppercase"
                      required
                    />
                  </div>

                  {isFamilyPaymentMode && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="block text-[10px] uppercase tracking-widest text-nx-muted mb-2">Family Code</label>
                      <input 
                        type="password" 
                        value={familyCodePaymentInput}
                        onChange={(e) => setFamilyCodePaymentInput(e.target.value.toUpperCase())}
                        placeholder="e.g. FAM-XYZ"
                        className="w-full bg-nx-ink border border-nx-border rounded-xl px-4 py-3 text-nx-paper focus:outline-none focus:border-nx-amber transition-colors font-mono uppercase"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-nx-muted mb-2">Amount (KSH)</label>
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min="1"
                      step="1"
                      className="w-full bg-nx-ink border border-nx-border rounded-xl px-4 py-3 text-nx-paper focus:outline-none focus:border-nx-amber transition-colors font-mono"
                      required
                    />
                  </div>

                  {liveAmount > 0 && (
                    <div className="bg-nx-ink/50 border border-nx-border rounded-xl p-4 space-y-2">
                       <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest text-nx-muted">Total Sale</span>
                        <span className="text-xs font-mono text-nx-paper">KSH {liveAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest text-nx-amber">NX Discount</span>
                        <span className="text-xs font-mono text-nx-amber">
                          {isFamilyPaymentMode ? "Calculated on submit" : `-${liveNxRedeem.toFixed(2)} NX`}
                        </span>
                      </div>
                      {!isFamilyPaymentMode && liveNxFee > 0 && (
                        <div className="flex justify-between items-center text-nx-amber/80">
                          <span className="text-[10px] uppercase tracking-widest flex items-center gap-1">Network Fee <Info size={10} /></span>
                          <span className="text-[10px] font-mono">-{liveNxFee.toFixed(2)} NX</span>
                        </div>
                      )}
                      <div className="h-px bg-nx-border/50 my-1"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest text-nx-green font-bold">Cash to Pay</span>
                        <span className="text-sm font-mono text-nx-green font-bold">
                          {isFamilyPaymentMode ? "Calculated on submit" : `KSH ${liveCash.toFixed(2)}`}
                        </span>
                      </div>
                      
                      {isInvalidAmount && (
                        <div className="pt-2 flex items-start gap-2 text-[9px] text-nx-ember uppercase tracking-tighter">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          Amount must end with 0 or 5 (Minimum physical change)
                        </div>
                      )}
                    </div>
                  )}
                  
                  {payError && (
                    <div className="p-3 bg-nx-ember/10 border border-nx-ember/30 rounded-xl text-xs text-nx-ember">
                      {payError}
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    disabled={payStatus === 'loading'}
                    className="w-full py-3 bg-nx-amber text-nx-ink font-bold uppercase tracking-wider rounded-xl hover:bg-nx-paper transition-colors disabled:opacity-50"
                  >
                    {payStatus === 'loading' ? 'Processing...' : 'Review Payment'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
