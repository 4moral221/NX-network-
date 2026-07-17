import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { matchProduct } from '../../services/skuMatcher';
import NXLogo from '../../components/NXLogo';
import { 
  LogOut, 
  Store, 
  Package, 
  CheckCircle2, 
  TrendingUp, 
  Phone, 
  Info, 
  ArrowRight, 
  Share2, 
  X, 
  ChevronRight, 
  AlertCircle,
  Award,
  Zap,
  Truck,
  Sparkles,
  RefreshCw,
  FileText,
  Menu,
  Users,
  ShieldAlert,
  Mail
} from 'lucide-react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

export default function MerchantDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pool, setPool] = useState(0);
  const [utilization, setUtilization] = useState(0);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [totalLiability, setTotalLiability] = useState(0);
  const [poolBalance, setPoolBalance] = useState(0);
  const [pendingTxns, setPendingTxns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'restock' | 'tiers' | 'referral' | 'network' | 'family'>('home');
  const [familyAccount, setFamilyAccount] = useState<any>(null);
  const [familyTxns, setFamilyTxns] = useState<any[]>([]);
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockOrder, setRestockOrder] = useState('');
  const [restockStatus, setRestockStatus] = useState<'idle' | 'loading' | 'predicting' | 'success' | 'error'>('idle');
  const [predictedItems, setPredictedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [subMerchants, setSubMerchants] = useState<any[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [fmcgContributions, setFmcgContributions] = useState<any[]>([]);
  const [batchAlerts, setBatchAlerts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [successModalTxn, setSuccessModalTxn] = useState<any>(null);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  // Merchant-initiated family code payment states
  const [familyCodeInput, setFamilyCodeInput] = useState('');
  const [familyAmountInput, setFamilyAmountInput] = useState('');
  const [familyPayStatus, setFamilyPayStatus] = useState<'idle' | 'verifying' | 'preview' | 'success' | 'error'>('idle');
  const [familyPayError, setFamilyPayError] = useState('');
  const [familyPreviewData, setFamilyPreviewData] = useState<any>(null);

  // Hub Enrollment States
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);

  const handleEnrollSubMerchant = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrollPhone) {
      toast.error('Please enter a phone number to enroll.');
      return;
    }

    let normalized = enrollPhone.replace(/\D/g, '');
    if (normalized.startsWith('0')) {
      normalized = '254' + normalized.substring(1);
    }
    if (normalized.length < 9) {
      toast.error('Phone number format is invalid.');
      return;
    }

    setEnrollLoading(true);
    try {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id, name')
        .eq('phone', normalized)
        .maybeSingle();

      if (existing) {
        toast.error(`Phone line already registered to ${existing.name || 'a member'}.`);
        setEnrollLoading(false);
        return;
      }

      // Check if already whitelisted
      const { data: existingWl } = await supabase
        .from('merchant_whitelist')
        .select('id')
        .eq('phone', normalized)
        .maybeSingle();

      if (existingWl) {
        toast.error('This number is already on the whitelist registry.');
        setEnrollLoading(false);
        return;
      }

      // Insert whitelist entry matching the USSD tier structure
      const { error: whitelistErr } = await supabase
        .from('merchant_whitelist')
        .insert({
          phone: normalized,
          hub_merchant_code: user.merchant_code,
          tier: 'BASIC'
        });

      if (whitelistErr) throw whitelistErr;

      toast.success(`Sub-merchant with phone ${normalized} enrolled successfully!`);
      setEnrollPhone('');
      fetchMerchantData(); // Refresh the list
    } catch (err: any) {
      toast.error(`Enrollment failed: ${err.message}`);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleFamilyCodePaymentVerify = async () => {
    if (!familyCodeInput.trim()) {
      toast.error("Please enter a family code.");
      return;
    }
    const amt = Number(familyAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setFamilyPayStatus('verifying');
    setFamilyPayError('');

    try {
      // 1. Fetch family account
      const { data: family, error: famErr } = await supabase
        .from('family_accounts')
        .select('*')
        .eq('family_code', familyCodeInput.trim().toUpperCase())
        .maybeSingle();

      if (famErr || !family) {
        throw new Error("Family Code not found. Please verify with the customer.");
      }

      if (family.status !== 'active') {
        throw new Error("This Family Account is currently inactive.");
      }

      // 2. Fetch parent user
      const { data: parentUser, error: parentErr } = await supabase
        .from('users')
        .select('name, phone, nx_balance')
        .eq('phone', family.parent_phone)
        .maybeSingle();

      if (parentErr || !parentUser) {
        throw new Error("Associated parent account not found or inactive.");
      }

      const parentBal = Number(parentUser.nx_balance || 0);

      // 3. Perform calculations
      const currentTier = user.franchise_tier || user.tier || 'BASIC';
      const acceptCeilingMap: Record<string, number> = {
        BASIC: 0.20,
        CERTIFIED: 0.30,
        HUB: 0.40
      };
      const baseCeiling = acceptCeilingMap[currentTier] || 0.20;

      // Dynamic Throttling Logic based on current merchant pool utilization
      let dynamicCeiling = baseCeiling;
      if (utilization >= 0.90) dynamicCeiling = 0;
      else if (utilization >= 0.70) dynamicCeiling = Math.min(0.10, baseCeiling);
      else if (utilization >= 0.40) dynamicCeiling = Math.min(0.20, baseCeiling);

      let earnMultiplier = 1.0;
      if (utilization >= 0.90) earnMultiplier = 0;
      else if (utilization >= 0.70) earnMultiplier = 0.25;
      else if (utilization >= 0.40) earnMultiplier = 0.50;

      const remainingPool = Math.max(0, pool - totalLiability);
      const earnRate = 0.05; // 5% standard

      let nxRedeem = 0;
      let cashPaid = amt;
      let nxEarned = 0;
      let nxFee = 0;

      if (family.allow_spending) {
        // Earn & Spend Mode
        const maxNxAllowed = Math.floor(amt * dynamicCeiling);
        nxRedeem = Math.min(parentBal, maxNxAllowed, remainingPool);
        nxRedeem = Math.floor(nxRedeem / 5) * 5; // floor to nearest 5
        cashPaid = amt - nxRedeem;
        nxEarned = Math.floor(cashPaid * earnRate * earnMultiplier);

        // Enforce total impact limit on remaining pool
        if (nxRedeem + nxEarned > remainingPool) {
          nxEarned = Math.max(0, remainingPool - nxRedeem);
        }
        nxFee = parentBal > 0 ? 2 : 0;
      } else {
        // Earn Only Mode
        nxRedeem = 0;
        cashPaid = amt;
        nxEarned = Math.floor(cashPaid * earnRate * earnMultiplier);
        nxEarned = Math.min(nxEarned, remainingPool);
        nxFee = 0;
      }

      setFamilyPreviewData({
        familyCode: family.family_code,
        parentName: parentUser.name || "Family Representative",
        parentPhone: parentUser.phone,
        parentBal,
        allowSpending: family.allow_spending,
        amount: amt,
        nxRedeem,
        cashPaid,
        nxEarned,
        nxFee,
        utilization,
        remainingPool
      });
      setFamilyPayStatus('preview');
    } catch (err: any) {
      setFamilyPayError(err.message || "An error occurred during verification.");
      setFamilyPayStatus('error');
    }
  };

  const handleFamilyCodePaymentSubmit = async () => {
    if (!familyPreviewData) return;
    setFamilyPayStatus('verifying'); // reuse state for loading

    try {
      const {
        familyCode,
        parentPhone,
        amount,
        nxRedeem,
        cashPaid,
        nxEarned,
        nxFee
      } = familyPreviewData;

      const transactionCode = 'NX' + Math.random().toString(36).substring(2, 8).toUpperCase();

      // 1. Insert Transaction into Database
      const { data: txn, error: txnErr } = await supabase
        .from('transactions')
        .insert({
          transaction_code: transactionCode,
          customer_phone: parentPhone,
          merchant_code: user.merchant_code,
          merchant_phone: user.phone,
          amount,
          nx_redeemed: nxRedeem,
          nx_earned: nxEarned,
          cash_paid: cashPaid,
          nx_fee: nxFee,
          family_code: familyCode,
          status: 'confirmed' // terminal state bypassing broken trigger
        })
        .select()
        .single();

      if (txnErr) throw txnErr;

      // 2. Insert Ledger Entries
      const entries = [];
      if (nxEarned > 0) {
        entries.push({
          account_phone: parentPhone,
          entry_type: 'credit',
          amount: nxEarned,
          reference: transactionCode,
          expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString()
        });
      }
      if (nxRedeem > 0) {
        entries.push({
          account_phone: parentPhone,
          entry_type: 'debit',
          amount: -nxRedeem,
          reference: transactionCode,
          expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString()
        });
        // Credit merchant for customer redemption
        entries.push({
          account_phone: user.phone,
          entry_type: 'credit',
          amount: nxRedeem,
          reference: transactionCode,
          expires_at: new Date(Date.now() + 99 * 365 * 24 * 3600 * 1000).toISOString()
        });
      }

      if (entries.length) {
        const { error: ledErr } = await supabase.from("ledger_entries").insert(entries);
        if (ledErr) throw ledErr;
      }

      // 3. Update Parent's User Balance
      const { data: parentAccount } = await supabase
        .from('users')
        .select('nx_balance')
        .eq('phone', parentPhone)
        .maybeSingle();

      const currentParentBal = Number(parentAccount?.nx_balance || 0);
      const parentNewBal = currentParentBal + nxEarned - nxRedeem;

      const { error: parentUpdateErr } = await supabase
        .from('users')
        .update({
          nx_balance: parentNewBal,
          is_first_purchase_used: true,
          cancellation_count: 0
        })
        .eq('phone', parentPhone);

      if (parentUpdateErr) throw parentUpdateErr;

      // 4. Update Merchant's User Balance
      if (nxRedeem > 0) {
        const { data: merchantAccount } = await supabase
          .from('users')
          .select('nx_balance')
          .eq('phone', user.phone)
          .maybeSingle();

        const currentMerchantBal = Number(merchantAccount?.nx_balance || 0);
        const newMerchantBal = currentMerchantBal + nxRedeem;

        const { error: merchUpdateErr } = await supabase
          .from('users')
          .update({
            nx_balance: newMerchantBal
          })
          .eq('phone', user.phone);

        if (merchUpdateErr) throw merchUpdateErr;
      }

      toast.success("Family Code transaction processed successfully!");
      setFamilyPayStatus('success');
      fetchMerchantData();
    } catch (err: any) {
      console.error(err);
      setFamilyPayError(err.message || "Failed to process transaction.");
      setFamilyPayStatus('error');
    }
  };

  const fetchMerchantData = async () => {
    setLoading(true);

    // Tier Reversion Logic (Automatic Downgrade)
    // The client shouldn't downgrade tiers directly, leave it to backend sync/cron jobs
    // to avoid RLS infinite recursion errors and security risks.

    // 1. Calculate Earnings (Total NX Redeemed by customers at this shop) and Pool Liability
    const { data: rdRes } = await supabase.from('transactions')
      .select('nx_redeemed, nx_earned')
      .eq('merchant_code', user.merchant_code)
      .in('status', ['completed', 'confirmed', 'awaiting_merchant', 'pending_customer']);
    
    const totalRedeemedRaw = rdRes?.reduce((s, x) => s + (x.nx_redeemed || 0), 0) || 0;
    const totalLiabilityRaw = rdRes?.reduce((s, x) => s + (x.nx_redeemed || 0) + (x.nx_earned || 0), 0) || 0;
    setTotalRedeemed(totalRedeemedRaw);
    setTotalLiability(totalLiabilityRaw);

    // 2. Fetch Merchant Balance from ledger as source of truth
    const { data: ledgerRes } = await supabase.from('ledger_entries')
      .select('amount')
      .eq('account_phone', user.phone)
      .gt('expires_at', new Date().toISOString());
    
    const merchantBalance = ledgerRes?.reduce((s, x) => s + (x.amount || 0), 0) || (user.nx_balance || 0);

    // 3. Calculate Node Pool (Max redemption capacity based on markup)
    const { data: marginRes } = await supabase
      .from('merchant_margins')
      .select('gross_margin')
      .eq('merchant_code', user.merchant_code)
      .maybeSingle();
    
    const { data: fmcgRes } = await supabase
      .from('fmcg_margin_contributions')
      .select('contribution_amount')
      .eq('merchant_code', user.merchant_code)
      .eq('status', 'active');
    
    const currentTier = user.franchise_tier || user.tier || 'BASIC';
    const rateMap: Record<string, number> = {
      BASIC: 0.60,
      CERTIFIED: 0.65,
      HUB: 0.70
    };
    const poolRate = rateMap[currentTier] || 0.60;
    const fmcgBoost = fmcgRes?.reduce((s, r) => s + Number(r.contribution_amount || 0), 0) || 0;
    const poolLimit = marginRes ? (marginRes.gross_margin * poolRate) + fmcgBoost : fmcgBoost;
    
    setPool(poolLimit);
    setPoolBalance(merchantBalance);
    
    // Utilization is total liability (redeemed + earned) vs current pool limit
    setUtilization(poolLimit > 0 ? totalLiabilityRaw / poolLimit : 0);

    // Fetch pending txns
    const { data: pending } = await supabase
      .from('transactions')
      .select('*')
      .eq('merchant_phone', user.phone)
      .eq('status', 'awaiting_merchant')
      .order('created_at', { ascending: false });
    
    if (pending) setPendingTxns(pending);

    // Fetch Hub data if applicable
    if (currentTier === 'HUB') {
      const { data: subs } = await supabase
        .from('users')
        .select('name, phone, created_at, merchant_code, location, tier, franchise_tier')
        .eq('hub_merchant_code', user.merchant_code)
        .eq('role', 'merchant');
      if (subs) setSubMerchants(subs);

      const { data: comms } = await supabase
        .from('hub_commissions')
        .select('*')
        .eq('hub_merchant_code', user.merchant_code)
        .order('created_at', { ascending: false })
        .limit(10);
      if (comms) setCommissions(comms);
    }

    // Fetch FMCG Contributions
    const { data: contributions } = await supabase
      .from('fmcg_margin_contributions')
      .select('*')
      .eq('merchant_code', user.merchant_code)
      .order('created_at', { ascending: false })
      .limit(3);
    if (contributions) setFmcgContributions(contributions);

    // Fetch Batch Statuses for merchant's requests
    const { data: myRestocks } = await supabase
      .from('restock_requests')
      .select('batch_id')
      .eq('merchant_code', user.merchant_code)
      .not('batch_id', 'is', null);
    
    const bIds = [...new Set(myRestocks?.map(r => r.batch_id).filter(Boolean))];
    if (bIds.length > 0) {
      const { data: batches } = await supabase
        .from('restock_batches')
        .select(`
          *,
          fmcg_partners(name)
        `)
        .in('id', bIds)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (batches) setBatchAlerts(batches);
    }

    // Fetch Formal Notifications
    const { data: notes } = await supabase
      .from('merchant_notifications')
      .select('*')
      .eq('merchant_code', user.merchant_code)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (notes) setNotifications(notes);

    // Fetch Chart Data (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: chartTxns } = await supabase
      .from('transactions')
      .select('created_at, amount, nx_earned')
      .eq('merchant_code', user.merchant_code)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true });

    if (chartTxns) {
      const grouped = chartTxns.reduce((acc: any, tx: any) => {
        const date = new Date(tx.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        if (!acc[date]) {
          acc[date] = { date, volume: 0, rewards: 0 };
        }
        acc[date].volume += Number(tx.amount || 0);
        acc[date].rewards += Number(tx.nx_earned || 0);
        return acc;
      }, {});

      const template = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        return grouped[dayStr] || { date: dayStr, volume: 0, rewards: 0 };
      });
      setChartData(template);
    } else {
      setChartData([]);
    }

    await fetchFamilyAccount();
    setLoading(false);
    fetchPendingInvoices();
  };

  const fetchFamilyAccount = async () => {
    try {
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
    } catch (e) {
      console.error("Error fetching family account:", e);
    }
  };

  const fetchPendingInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('restock_invoices')
        .select('*')
        .eq('merchant_code', user.merchant_code)
        .is('delivered_at', null)
        .order('created_at', { ascending: false });
      if (!error && data) setPendingInvoices(data);
    
    // Fetch unpaid invoices (delivered but not paid)
    const { data: unpaid, error: upError } = await supabase
        .from('restock_invoices')
        .select('*')
        .eq('merchant_code', user.merchant_code)
        .not('status', 'eq', 'paid')
        .not('delivered_at', 'is', null)
        .order('created_at', { ascending: false });
      if (!upError && unpaid) setUnpaidInvoices(unpaid);

      // Check if they have an active pending or predicting restock request
      const { data: activeRequests } = await supabase
        .from('restock_requests')
        .select('id')
        .eq('merchant_code', user.merchant_code)
        .in('status', ['pending', 'approving_prediction'])
        .limit(1);

      setHasPendingRequest(!!activeRequests && activeRequests.length > 0);
    } catch (err) {
      console.error('Error fetching pending invoices:', err);
    }
  };

  const handleSettleInvoice = async (invoice: any) => {
    const nxPayable = Math.min(poolBalance, invoice.invoice_amount || 0);
    if (nxPayable <= 0) {
      toast.error("Insufficient NX balance to settle this invoice.");
      return;
    }

    if (!confirm(`Settle this invoice? Using ${nxPayable.toFixed(1)} NX from your balance.`)) return;

    setLoading(true);
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
      fetchPendingInvoices();
      fetchMerchantData();
    } catch (err: any) {
      toast.error('Settlement failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (invoice: any) => {
    if (!hasPendingRequest) {
      toast.error("You must have a pending restock request to confirm delivery!");
      return;
    }

    if (!confirm("Are you sure you want to confirm delivery of this restock invoice? This is a permanent handshake that confirms receipt of physical goods.")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('restock_invoices')
        .update({ delivered_at: new Date().toISOString() })
        .eq('id', invoice.id);

      if (error) throw error;

      toast.success("Delivery Handshake Confirmed!");
      fetchPendingInvoices();
      fetchMerchantData();
    } catch (err: any) {
      toast.error("Confirmation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantData();

    // Real-time subscription for transactions and ledger entries
    const channel = supabase
      .channel(`merchant-updates-${user.phone}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `merchant_phone=eq.${user.phone}`
      }, () => {
        fetchMerchantData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ledger_entries',
        filter: `account_phone=eq.${user.phone}`
      }, () => {
        fetchMerchantData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fmcg_margin_contributions',
        filter: `merchant_code=eq.${user.merchant_code}`
      }, () => {
        fetchMerchantData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'restock_batches'
      }, () => {
        // This is a broader filter but safer for now as batches change infrequently
        fetchMerchantData();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'merchant_notifications',
        filter: `merchant_code=eq.${user.merchant_code}`
      }, () => {
        fetchMerchantData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.phone]);

  const markAsRead = async (id: number) => {
    await supabase
      .from('merchant_notifications')
      .update({ is_read: true })
      .eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleConfirmTxn = async (txnId: string) => {
    try {
      const pendingTxn = pendingTxns.find(t => t.id === txnId);
      if (!pendingTxn) {
        console.error("Transaction not found in pending list");
        return;
      }

      const { customer_phone, nx_earned = 0, nx_redeemed = 0, transaction_code, merchant_phone } = pendingTxn;

      // 1. Try to set to 'completed' which triggers the DB function handle_transaction_completion
      const { error: updateErr } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', txnId);
      
      if (updateErr) {
        if (updateErr.message?.includes('last_transaction_at') || updateErr.code === '42703') {
          console.warn("DB Trigger failing due to missing last_transaction_at. Falling back to manual finalization.");
          
          // Fallback: If DB trigger fails due to schema drift, we finalize manually.
          // We use 'confirmed' as a terminal state that bypasses the broken 'completed' trigger.
          const { error: fallbackErr } = await supabase
            .from('transactions')
            .update({ status: 'confirmed' })
            .eq('id', txnId);
          
          if (fallbackErr) throw fallbackErr;

          // Manual Ledger Entries (mirrors handle_transaction_completion trigger)
          let targetDebitPhone = customer_phone;
          if (pendingTxn.family_code) {
            const { data: family } = await supabase
              .from('family_accounts')
              .select('parent_phone')
              .eq('family_code', pendingTxn.family_code)
              .maybeSingle();
            if (family?.parent_phone) {
              targetDebitPhone = family.parent_phone;
            }
          }

          const entries = [];
          if (nx_earned > 0) {
            entries.push({
              account_phone: customer_phone,
              entry_type: 'credit',
              amount: nx_earned,
              reference: transaction_code,
              expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString()
            });
          }
          if (nx_redeemed > 0) {
            entries.push({
              account_phone: targetDebitPhone,
              entry_type: 'debit',
              amount: -nx_redeemed,
              reference: transaction_code,
              expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString()
            });
            // Credit merchant for customer redemption
            entries.push({
              account_phone: merchant_phone || pendingTxn.merchant_phone,
              entry_type: 'credit',
              amount: nx_redeemed,
              reference: transaction_code,
              expires_at: new Date(Date.now() + 99 * 365 * 24 * 3600 * 1000).toISOString()
            });
          }

          if (entries.length) {
            await supabase.from("ledger_entries").insert(entries);
          }

          // Update Customer Balance and first purchase
          if (customer_phone) {
            const { data: debitUser } = await supabase
              .from('users')
              .select('nx_balance')
              .eq('phone', targetDebitPhone)
              .maybeSingle();

            const currentBal = Number(debitUser?.nx_balance || 0);
            const parentNewBal = currentBal - Number(nx_redeemed);

            await supabase
              .from('users')
              .update({ nx_balance: parentNewBal })
              .eq('phone', targetDebitPhone);

            if (targetDebitPhone !== customer_phone) {
              const { data: childUser } = await supabase
                .from('users')
                .select('nx_balance')
                .eq('phone', customer_phone)
                .maybeSingle();
              const childNewBal = Number(childUser?.nx_balance || 0) + Number(nx_earned);
              await supabase
                .from('users')
                .update({
                  nx_balance: childNewBal,
                  is_first_purchase_used: true,
                  cancellation_count: 0
                })
                .eq('phone', customer_phone);
            } else {
              const childNewBal = currentBal + (Number(nx_earned) - Number(nx_redeemed));
              await supabase
                .from('users')
                .update({
                  nx_balance: childNewBal,
                  is_first_purchase_used: true,
                  cancellation_count: 0
                })
                .eq('phone', customer_phone);
            }
          }

          // Update Merchant Balance
          const mPhone = merchant_phone || pendingTxn.merchant_phone;
          if (mPhone && nx_redeemed > 0) {
            const { data: merchantUser } = await supabase
              .from('users')
              .select('nx_balance')
              .eq('phone', mPhone)
              .maybeSingle();

            const currentMerchantBal = Number(merchantUser?.nx_balance || 0);
            const newMerchantBal = currentMerchantBal + Number(nx_redeemed);

            await supabase
              .from('users')
              .update({
                nx_balance: newMerchantBal
              })
              .eq('phone', mPhone);
          }
        } else {
          throw updateErr;
        }
      } else {
        // Normal success: Update customer first purchase without last_transaction_at just in case
        if (customer_phone) {
          try {
            await supabase.from('users')
              .update({ 
                is_first_purchase_used: true,
                cancellation_count: 0
              })
              .eq('phone', customer_phone);
          } catch (e) {
            console.error("Normal update first purchase failed:", e);
          }
        }
      }

      if (pendingTxn) {
        setSuccessModalTxn({...pendingTxn, nx_redeemed: nx_redeemed || pendingTxn.nx_redeemed});
      }

      fetchMerchantData();
    } catch (err: any) {
      console.error('Confirm error:', err);
    }
  };

  const handleCancelTxn = async (txnId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('id', txnId);
      
      if (error) throw error;
      fetchMerchantData();
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const handleRestockSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRestockStatus('loading');
    
    try {
      const rawParts = restockOrder.split(/,|\n/).map(p => p.trim()).filter(Boolean);
      const results: any[] = [];

      for (const part of rawParts) {
        let s = part;
        let qty = 1;

        const startQtyMatch = s.match(/^(\d+)[\sxX*]+/);
        if (startQtyMatch) {
          qty = parseInt(startQtyMatch[1], 10);
          s = s.substring(startQtyMatch[0].length).trim();
        } else {
          const endQtyMatch = s.match(/[*\sxX]+(\d+)\s*$/);
          if (endQtyMatch) {
            qty = parseInt(endQtyMatch[1], 10);
            s = s.substring(0, s.length - endQtyMatch[0].length).trim();
          }
        }

        s = s.replace(/([a-zA-Z])(\d)/g, "$1 $2");
        const variantMatch = s.match(/\b\d+(\.\d+)?\s*(kg|g|ml|l|litre|ltr|pkt|pcs|tray|packet|sack|bag)\b/i);
        const variantHint = variantMatch ? variantMatch[0].replace(/\s+/g, "").toLowerCase() : null;

        if (variantMatch) {
           s = s.replace(variantMatch[0], "").replace(/\s+/g, " ").trim();
        }
        
        const keyword = s.toUpperCase();

        const BRAND_TO_SKU: Record<string, string> = {
          "UNGA": "F", "PEMBE": "F", "AJAB": "F", "JOGOO": "F", "DOLA": "F", "EXE": "F", "NDOVU": "F", "SOKO": "F", "FAMILA": "F", "DUMA": "F", "UGALI": "F", "HOSTESS": "F", "KABRAS": "F", "RHINO": "F",
          "MKATE": "BR", "BREAD": "BR", "LOAF": "BR", "BROADWAYS": "BR", "FAMILY": "BR", "KINGMIL": "BR", "SUPALOAF": "BR", "SUPA LOAF": "BR", "FAHARI": "BR", "UNITED": "BR", 
          "MAZIWA": "ML", "MILK": "ML", "FRESH": "ML", "BROOKSIDE": "ML", "FRESHA": "ML", "MT KENYA": "ML", "TUZO": "ML", "KCC": "ML", "ILARA": "ML", "DAIMA": "ML", "LALA": "ML", "MAZIWA LALA": "ML",
          "SUKARI": "SG", "SUGAR": "SG", "MUMIAS": "SG", "KIBOS": "SG", "WEST KENYA": "SG", "SONY": "SG",
          "MAFUTA": "CO", "OIL": "CO", "ELIANTO": "CO", "SALIT": "CO", "RINA": "CO", "GOLDEN FRY": "CO",
        };

        let skuCode = null;
        if (['BR', 'ML', 'SG', 'CO', 'F'].includes(keyword)) {
          skuCode = keyword;
        } else if (BRAND_TO_SKU[keyword]) {
          skuCode = BRAND_TO_SKU[keyword];
        } else {
           for (const [brand, sku] of Object.entries(BRAND_TO_SKU)) {
              if (keyword.includes(brand)) {
                 skuCode = sku;
                 break;
              }
           }
        }

        results.push({
          sku: skuCode,
          name: keyword,
          variant: variantHint,
          quantity: qty,
          raw: part,
        });
      }

      if (results.length > 0) {
        // Direct Submit to Admin Console
        for (const item of results) {
          let batchId = null;
          if (item.sku) {
            try {
              const { openOrGetBatch, refreshBatchTotals } = await import('@/src/services/batchHelper');
              const { data: bId, error: bErr } = await openOrGetBatch(supabase, item.sku, item.variant || null, item.quantity);
              if (bErr) console.error('Batching error:', bErr);
              batchId = bId;
            } catch (e) { 
              console.error('Failed to access batching system:', e);
            }
          }

          const requestPayload: any = {
            merchant_code: user.merchant_code,
            merchant_phone: user.phone,
            sku_code: item.sku,
            sku_name: item.name,
            quantity: item.quantity,
            variant_code: item.variant || null,
            raw_input: item.raw,
            fuzzy_resolved: false,
            status: 'pending' // Let Admin approve it
          };

          if (batchId) {
            requestPayload.batch_id = batchId;
          }

          await supabase.from('restock_requests').insert(requestPayload);

          if (batchId) {
            try {
              const { refreshBatchTotals } = await import('@/src/services/batchHelper');
              await refreshBatchTotals(supabase, batchId);
            } catch (e) {
              console.error('Failed to refresh batch totals:', e);
            }
          }
        }
        
        setRestockStatus('success');
        setTimeout(() => {
          setIsRestockModalOpen(false);
          setRestockStatus('idle');
          setRestockOrder('');
          setPredictedItems([]);
        }, 2000);
      } else {
        setRestockStatus('error');
      }
    } catch (err) {
      console.error('Restock parsing error:', err);
      setRestockStatus('error');
    }
  };

  const handleConfirmRestockBatch = async () => {
    setRestockStatus('loading');
    try {
      for (const item of predictedItems) {
        let batchId = null;
        if (item.sku) {
          try {
            const { openOrGetBatch } = await import('@/src/services/batchHelper');
            const { data: bId, error: rpcErr } = await openOrGetBatch(supabase, item.sku, item.variant || null, item.quantity);
            if (!rpcErr) batchId = bId;
          } catch (e) {
            console.warn('Batching system unavailable, skipping batch_id');
          }
        }

        const requestPayload: any = {
          merchant_code: user.merchant_code,
          merchant_phone: user.phone,
          sku_code: item.sku,
          sku_name: item.name || item.sku,
          quantity: item.quantity,
          variant_code: item.variant || null,
          raw_input: item.raw,
          fuzzy_resolved: item.fuzzy || false,
          status: 'fulfilled', // Auto-fulfill
          fulfilled_at: new Date().toISOString()
        };

        if (batchId) {
          requestPayload.batch_id = batchId;
        }

        // Auto-update merchant inventory
        const { data: inv } = await supabase
          .from('merchant_inventory')
          .select('quantity')
          .eq('merchant_code', user.merchant_code)
          .eq('sku_code', item.sku)
          .eq('variant_code', item.variant || '')
          .maybeSingle();

        const newQty = (inv?.quantity || 0) + item.quantity;
        await supabase
          .from('merchant_inventory')
          .upsert({
            merchant_code: user.merchant_code,
            sku_code: item.sku,
            variant_code: item.variant || '',
            quantity: newQty
          }, { onConflict: 'merchant_code,sku_code,variant_code' });

        if (item.id) {
          await supabase.from('restock_requests').update({
            status: 'fulfilled',
            fulfilled_at: new Date().toISOString(),
            ...(batchId ? { batch_id: batchId } : {})
          }).eq('id', item.id);
        } else {
          await supabase.from('restock_requests').insert(requestPayload);
        }

        if (batchId) {
          try {
            const { refreshBatchTotals } = await import('@/src/services/batchHelper');
            await refreshBatchTotals(supabase, batchId);
          } catch (e) { /* ignore */ }
        }
      }
      setRestockStatus('success');
      setTimeout(() => {
        setIsRestockModalOpen(false);
        setRestockStatus('idle');
        setRestockOrder('');
        setPredictedItems([]);
      }, 2000);
    } catch (err) {
      console.error('Restock confirm error:', err);
      setRestockStatus('error');
    }
  };

  const handleDeclineRestockBatch = () => {
    setIsRestockModalOpen(false);
    setRestockStatus('idle');
    setRestockOrder('');
    setPredictedItems([]);
  };

  const handleShare = (platform: 'whatsapp' | 'email') => {
    const text = `Join the NX Network! Use my merchant code ${user.merchant_code} to join the community. ${window.location.origin}`;
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`mailto:?subject=Join NX Network&body=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-nx-ink relative">
      {/* Header */}
      <header className="px-6 py-5 border-b border-nx-border flex items-center justify-between bg-nx-card">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-nx-muted hover:text-nx-paper transition-colors rounded-lg hover:bg-nx-border/20"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <NXLogo title={user.name} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 right-0 translate-x-1/2 w-4 h-4 bg-nx-ember text-white text-[8px] flex items-center justify-center rounded-full font-bold animate-pulse z-30">
                  {notifications.length}
                </span>
              )}
            </div>
            <div className="bg-[#1a1d23] border border-[#2a2d35] rounded-md px-2 py-1 shadow-inner">
              <span className="font-mono text-[10px] font-bold text-[#e8a020] tracking-widest select-none">{user.merchant_code}</span>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="p-2 text-nx-muted hover:text-nx-ember transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
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
                <NXLogo title="NX Portal" />
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
                  {user.name ? user.name[0].toUpperCase() : 'M'}
                </div>
                <div>
                  <div className="text-xs font-bold text-nx-paper">{user.name}</div>
                  <div className="text-[10px] text-nx-muted font-mono">{user.phone}</div>
                  <div className="text-[9px] text-nx-amber font-bold uppercase tracking-wider">{user.franchise_tier || user.tier || 'MERCHANT'}</div>
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
                  <Store className="w-4 h-4" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('restock');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    activeTab === 'restock'
                      ? "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
                      : "text-nx-muted hover:text-nx-paper hover:bg-nx-border/10"
                  )}
                >
                  <Package className="w-4 h-4" />
                  <span>Restock</span>
                </button>

                {((user.franchise_tier || user.tier) === 'HUB') && (
                  <button
                    onClick={() => {
                      setActiveTab('network');
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                      activeTab === 'network'
                        ? "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
                        : "text-nx-muted hover:text-nx-paper hover:bg-nx-border/10"
                    )}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Network</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab('tiers');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    activeTab === 'tiers'
                      ? "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
                      : "text-nx-muted hover:text-nx-paper hover:bg-nx-border/10"
                  )}
                >
                  <Award className="w-4 h-4" />
                  <span>Tiers</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('referral');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                    activeTab === 'referral'
                      ? "bg-nx-amber/10 text-nx-amber border border-nx-amber/20"
                      : "text-nx-muted hover:text-nx-paper hover:bg-nx-border/10"
                  )}
                >
                  <Share2 className="w-4 h-4" />
                  <span>Refer</span>
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
                  <span>Family Code Payments</span>
                </button>
              </div>

              <div className="pt-4 border-t border-nx-border flex items-center justify-between">
                <span className="text-[10px] font-mono text-nx-muted uppercase tracking-widest">NX Network v1.2</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12">
        {activeTab === 'home' && (
          <>
            {/* New Notifications Section */}
            {notifications.length > 0 && (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <motion.div 
                    key={n.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-2xl border flex gap-4 relative overflow-hidden",
                      n.type === 'success' ? "bg-nx-green/5 border-nx-green/30" : 
                      n.type === 'error' ? "bg-nx-ember/5 border-nx-ember/30" :
                      "bg-nx-amber/5 border-nx-amber/30"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      n.type === 'success' ? "bg-nx-green/20 text-nx-green" :
                      n.type === 'error' ? "bg-nx-ember/20 text-nx-ember" :
                      "bg-nx-amber/20 text-nx-amber"
                    )}>
                      {n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                       n.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
                       <Info className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="text-xs font-bold text-nx-paper mb-1">{n.title}</div>
                      <div className="text-[10px] text-nx-muted leading-relaxed">{n.message}</div>
                    </div>
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="absolute top-3 right-3 text-nx-muted hover:text-nx-paper"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Merchant Info & Prominent Code Card */}
            <div className="bg-nx-card border border-nx-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-nx-muted uppercase tracking-widest font-bold">Active Merchant Portal</span>
                <h3 className="font-display text-xl text-nx-paper font-bold tracking-wide mt-1">{user.name}</h3>
                <p className="text-[11px] text-nx-muted font-mono">{user.phone}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="bg-nx-amber/10 text-nx-amber border border-nx-amber/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    {user.franchise_tier || user.tier || 'BASIC'} Franchise
                  </span>
                </div>
              </div>
              <div className="w-full sm:w-auto text-center sm:text-right shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0 border-nx-border">
                <div className="text-[10px] uppercase tracking-[0.2em] text-nx-muted mb-2 font-bold">Your Merchant Code</div>
                <div className="bg-nx-ink border-2 border-nx-amber/40 px-6 py-4 rounded-2xl text-center font-mono text-4xl font-black text-nx-amber tracking-widest select-none shadow-lg shadow-nx-amber/10 border-b-4">
                  {user.merchant_code}
                </div>
              </div>
            </div>

            {/* USSD Reference */}
            <div className="bg-nx-amber/10 border border-nx-amber/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-nx-amber flex items-center justify-center">
                  <Phone className="w-4 h-4 text-nx-ink" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-nx-amber font-bold">USSD Access</div>
                  <div className="text-sm font-mono text-nx-paper font-bold tracking-widest">*384*6180#</div>
                </div>
              </div>
              <div className="text-[9px] text-nx-amber/70 uppercase tracking-tighter">Dial to manage offline</div>
            </div>

            {/* Pool Card */}
            <div className="bg-gradient-to-br from-[#1a1714] to-[#12110e] border border-nx-amber/30 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-black/40">
              <div className="absolute top-0 right-0 w-32 h-32 bg-nx-amber/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-nx-amber">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-nx-paper">Earning Ledger</span>
                </div>
                <div className="px-2 py-1 bg-nx-amber/10 rounded text-[9px] text-nx-amber font-bold border border-nx-amber/20 uppercase">
                  {user.franchise_tier || user.tier || 'BASIC'}
                </div>
              </div>
              
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-nx-muted mb-1">Your Earned Balance</div>
                  <div className="font-display text-4xl text-nx-paper tracking-wider">
                    <AnimatedNumber value={poolBalance} decimals={1} /> <span className="text-xs text-nx-amber">NX</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-widest text-nx-muted mb-1">Total Pool Capacity</div>
                  <div className="font-mono text-lg text-nx-green font-bold">
                    <AnimatedNumber value={pool} decimals={1} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em]">
                  <span className="text-nx-muted">Pool Utilization</span>
                  <span className={cn(
                    "font-bold",
                    utilization > 0.9 ? "text-nx-ember" : utilization > 0.7 ? "text-nx-amber" : "text-nx-green"
                  )}>
                    <AnimatedNumber value={totalLiability} decimals={0} /> / <AnimatedNumber value={pool} decimals={0} /> NX
                  </span>
                </div>
                <div className="h-1.5 bg-nx-ink/60 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, utilization * 100)}%` }}
                    className={cn(
                      "h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                      utilization > 0.9 ? "bg-nx-ember" : utilization > 0.7 ? "bg-nx-amber" : "bg-nx-green"
                    )}
                  />
                </div>
                <div className="flex justify-between items-center text-[8px] text-nx-muted uppercase italic">
                  <span>Funds from Wholesale Markup</span>
                  {utilization > 0.4 && <span className="text-nx-amber font-semibold">Dynamic Rate Adjustment Active</span>}
                </div>

                <div className="pt-3 border-t border-white/5 mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-nx-ink/40 p-3 rounded-xl border border-nx-border/20">
                    <div className="text-[8px] uppercase tracking-wider text-nx-muted mb-0.5">Cashback Reward Scale</div>
                    <div className="font-mono text-xs font-bold text-nx-paper flex items-center gap-1.5">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full inline-block",
                        utilization >= 0.9 ? "bg-nx-ember animate-pulse" : utilization >= 0.7 ? "bg-nx-amber" : utilization >= 0.4 ? "bg-nx-amber/70" : "bg-nx-green"
                      )}/>
                      {utilization >= 0.9 ? "0.0x (Deactivated)" : utilization >= 0.7 ? "0.25x (Low-Traction)" : utilization >= 0.4 ? "0.5x (Throttled)" : "1.0x (Unrestricted)"}
                    </div>
                  </div>
                  <div className="bg-nx-ink/40 p-3 rounded-xl border border-nx-border/20">
                    <div className="text-[8px] uppercase tracking-wider text-nx-muted mb-0.5">Acceptance Ceiling Cap</div>
                    <div className="font-mono text-xs font-bold text-nx-paper flex items-center gap-1.5">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full inline-block",
                        utilization >= 0.9 ? "bg-nx-ember animate-pulse" : utilization >= 0.7 ? "bg-nx-amber" : utilization >= 0.4 ? "bg-nx-amber/70" : "bg-nx-green"
                      )}/>
                      {utilization >= 0.9 ? "0% (Soft Ceiling)" : utilization >= 0.7 ? "10% Max Cap" : utilization >= 0.4 ? "20% Max Cap" : "Full Franchise Tier"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => fetchMerchantData()}
                className="bg-nx-card border border-nx-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:border-nx-amber transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-nx-amber/10 flex items-center justify-center group-hover:bg-nx-amber/20 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-nx-amber" />
                </div>
                <span className="text-[10px] font-bold text-nx-paper uppercase tracking-widest text-center">Confirm<br/>Payments</span>
              </button>
              <button 
                onClick={() => setIsRestockModalOpen(true)}
                className="bg-nx-card border border-nx-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:border-nx-green transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-nx-green/10 flex items-center justify-center group-hover:bg-nx-green/20 transition-colors">
                  <Package className="w-5 h-5 text-nx-green" />
                </div>
                <span className="text-[10px] font-bold text-nx-paper uppercase tracking-widest text-center">Order<br/>Restock</span>
              </button>
            </div>

            {/* Chart Section */}
            <div className="bg-nx-card border border-nx-border rounded-xl p-4 overflow-hidden">
              <h3 className="text-[10px] uppercase tracking-widest text-nx-muted font-bold mb-4">7-Day Performance</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f5a623" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f5a623" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2723" vertical={false} />
                    <XAxis dataKey="date" stroke="#8b8682" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#8b8682" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `KES ${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1714', border: '1px solid #3d3833', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#f5f0e6' }}
                    />
                    <Area type="monotone" dataKey="volume" stroke="#f5a623" fillOpacity={1} fill="url(#colorVolume)" name="Volume" />
                    <Area type="monotone" dataKey="rewards" stroke="#22c55e" fillOpacity={1} fill="url(#colorRewards)" name="Rewards" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FMCG & Batch Notifications */}
            {(fmcgContributions.length > 0 || batchAlerts.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00d4ff]" />
                  <h3 className="text-[10px] uppercase tracking-widest text-nx-muted font-bold">Network Updates</h3>
                </div>
                
                <div className="space-y-2">
                  {fmcgContributions.map((c) => (
                    <motion.div 
                      key={c.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between gap-4",
                        c.status === 'active' ? "bg-nx-green/5 border-nx-green/20" : 
                        c.status === 'rejected' ? "bg-nx-ember/5 border-nx-ember/20" :
                        "bg-nx-card border-nx-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          c.status === 'active' ? "bg-nx-green/10 text-nx-green" : "bg-nx-muted/10 text-nx-muted"
                        )}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-nx-paper">
                            {c.status === 'active' ? 'Pool Boost Confirmed' : c.status === 'rejected' ? 'Contribution Rejected' : 'New Contribution'}
                          </div>
                          <div className="text-[9px] text-nx-muted font-mono uppercase">
                            {c.fmcg_name} // {c.contribution_amount} NX
                          </div>
                        </div>
                      </div>
                      {c.status === 'active' && (
                        <div className="text-[8px] bg-nx-green/20 text-nx-green font-bold px-2 py-0.5 rounded uppercase tracking-tighter">Live</div>
                      )}
                    </motion.div>
                  ))}

                  {batchAlerts.map((b) => (
                    <motion.div 
                      key={b.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between gap-4",
                        b.status === 'deal_accepted' ? "bg-nx-amber/5 border-nx-amber/20 shadow-[0_0_15px_rgba(255,181,71,0.05)]" : "bg-nx-card border-nx-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          b.status === 'deal_accepted' ? "bg-nx-amber/10 text-nx-amber" : "bg-nx-muted/10 text-nx-muted"
                        )}>
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-nx-paper uppercase tracking-tight">
                            {b.status === 'deal_accepted' ? 'Restock Bid Accepted' : 'Restock Batch Pending'}
                          </div>
                          <div className="text-[9px] text-nx-muted font-mono uppercase">
                            {b.fmcg_partners?.name || 'Tendering'} // Batch {b.id.substring(0, 8)}
                          </div>
                        </div>
                      </div>
                      {b.status === 'deal_accepted' && (
                        <div className="text-[8px] bg-nx-amber/20 text-nx-amber font-bold px-2 py-0.5 rounded uppercase tracking-tighter">Confirmed</div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Approvals */}
            <div id="pending-approvals">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] uppercase tracking-widest text-nx-muted font-bold">Pending Approvals</h3>
                <span className="bg-nx-amber/20 text-nx-amber text-[10px] px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                  {pendingTxns.length} REQUIRED
                </span>
              </div>
              
              <div className="space-y-4">
                {pendingTxns.length === 0 ? (
                  <div className="text-center py-10 text-nx-muted text-[10px] border border-dashed border-nx-border rounded-2xl bg-nx-card/30">
                    <div className="mb-2 opacity-50">NO PENDING PAYMENTS</div>
                    <div className="text-[8px] uppercase tracking-widest">Awaiting customer scans...</div>
                  </div>
                ) : (
                  pendingTxns.map((txn) => (
                    <motion.div 
                      key={txn.id} 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-nx-card border-2 border-nx-amber/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity transform scale-[0.6]">
                        <NXLogo />
                      </div>

                      <div className="flex justify-between items-start mb-5 relative z-10">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-nx-ink border border-nx-border flex items-center justify-center shadow-inner">
                            <Phone className="w-6 h-6 text-nx-amber" />
                          </div>
                          <div>
                            <div className="text-sm text-nx-paper font-bold mb-1 tracking-tight">{txn.customer_phone}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-nx-muted font-mono uppercase tracking-widest px-1.5 py-0.5 bg-nx-ink rounded border border-white/5">
                                {txn.transaction_code}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-mono text-nx-green font-bold tracking-tighter">KSH {txn.amount}</div>
                          <div className="text-[10px] text-nx-amber font-bold uppercase tracking-widest">
                            {txn.nx_redeemed > 0 ? `-${txn.nx_redeemed} NX` : 'CASH ONLY'}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 relative z-10">
                        <button 
                          onClick={() => handleConfirmTxn(txn.id)}
                          className="flex-1 bg-nx-green text-nx-ink py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-nx-paper transition-all flex items-center justify-center gap-2 shadow-lg shadow-nx-green/10"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleCancelTxn(txn.id)}
                          className="px-4 bg-nx-ink border border-nx-border text-nx-muted py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-nx-ember hover:text-white transition-all shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Status indicator */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-nx-amber animate-ping"></div>
                        <span className="text-[8px] text-nx-amber font-bold uppercase tracking-widest opacity-70">
                          Awaiting your confirmation
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'tiers' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-nx-amber" />
              <h3 className="text-sm uppercase tracking-widest text-nx-paper font-bold">Merchant Tiers</h3>
            </div>

            <div className="space-y-4">
              {[
                { name: 'BASIC', color: 'text-nx-muted', icon: <Store className="w-5 h-5" />, active: (user.franchise_tier || user.tier || 'BASIC') === 'BASIC', perks: ['60% standard loyalty pool rate', '20% max NX acceptance per txn', 'USSD restock access'] },
                { name: 'CERTIFIED', color: 'text-nx-amber', icon: <Award className="w-5 h-5" />, active: (user.franchise_tier || user.tier) === 'CERTIFIED', perks: ['65% higher pool earn rate', '30% max NX acceptance per txn', 'Priority restock delivery'] },
                { name: 'HUB', color: 'text-nx-green', icon: <Zap className="w-5 h-5" />, active: (user.franchise_tier || user.tier) === 'HUB', perks: ['70% max pool earn rate', '40% max NX acceptance per txn', '0.2 NX sub-merchant commission'] },
              ].map((tier, i) => (
                <div key={i} className={cn(
                  "bg-nx-card border rounded-2xl p-5 relative overflow-hidden transition-all",
                  tier.active ? "border-nx-amber ring-1 ring-nx-amber/30" : "border-nx-border opacity-60"
                )}>
                  {tier.active && <div className="absolute top-0 right-0 bg-nx-amber text-nx-ink text-[8px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">Current</div>}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", tier.active ? "bg-nx-amber/10" : "bg-nx-ink")}>
                      {tier.icon}
                    </div>
                    <div>
                      <div className={cn("text-xs font-bold uppercase tracking-widest", tier.color)}>{tier.name}</div>
                      <div className="text-[10px] text-nx-muted">Tier Status</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {tier.perks.map((perk, j) => (
                      <div key={j} className="flex items-center gap-2 text-[11px] text-nx-paper/80">
                        <CheckCircle2 className="w-3 h-3 text-nx-green" />
                        {perk}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'restock' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-nx-green" />
                <h3 className="text-sm uppercase tracking-widest text-nx-paper font-bold">Smart Restock</h3>
              </div>
              <button 
                onClick={() => setIsRestockModalOpen(true)}
                className="bg-nx-amber text-nx-ink px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg"
              >
                + New Order
              </button>
            </div>

            <div className="bg-nx-ink border border-nx-border rounded-xl p-4 text-left space-y-3">
              <div className="flex items-center gap-2 text-[10px] text-nx-amber font-bold uppercase tracking-widest">
                <Info className="w-3 h-3" />
                How to order
              </div>
              <p className="text-[10px] text-nx-muted font-mono leading-relaxed">
                Type items like:<br/>
                - Pembe 2kg * 20<br/>
                - Brookside 500ml * 12<br/>
                - BR * 10 (Bread)
              </p>
            </div>

            {/* Delivery Confirmation Handshake */}
            {pendingInvoices.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] text-nx-amber font-bold uppercase tracking-widest">
                  <Truck className="w-3 h-3" />
                  Pending Deliveries ({pendingInvoices.length})
                </div>
                {pendingInvoices.map(inv => (
                  <div key={inv.id} className="bg-nx-card border-2 border-nx-amber/30 rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-nx-paper uppercase tracking-widest">Restock Invoice #{inv.invoice_number}</div>
                        <div className="text-[10px] text-nx-muted mt-1 uppercase">{new Date(inv.created_at).toLocaleDateString()} · Total: KSH {inv.total_amount?.toLocaleString() || 0}</div>
                      </div>
                      <div className="px-2 py-0.5 bg-nx-amber/10 text-nx-amber text-[8px] font-extrabold uppercase rounded border border-nx-amber/20">Awaiting Fulfillment</div>
                    </div>

                    <div className="pt-2">
                       <label className="text-[9px] font-bold text-nx-muted uppercase tracking-[0.1em] block mb-2">Delivery Handshake</label>
                       <p className="text-xs text-nx-paper mb-3">This invoice is pending delivery to your location.</p>
                       
                       <div className="pt-1">
                         <button
                           id={`confirm-delivery-${inv.id}`}
                           onClick={() => handleConfirmDelivery(inv)}
                           disabled={!hasPendingRequest}
                           className={`w-full py-2.5 px-4 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${
                             hasPendingRequest 
                               ? 'bg-nx-amber text-black hover:bg-nx-amber/90 active:scale-[0.98]' 
                               : 'bg-nx-paper/10 text-nx-muted border border-nx-border cursor-not-allowed opacity-60'
                           }`}
                         >
                           Confirm Handshake
                         </button>
                         {!hasPendingRequest && (
                           <div className="text-[8px] text-nx-amber/70 font-mono mt-1.5 uppercase tracking-wider">
                             ⚠️ Requires an active/pending restock request
                           </div>
                         )}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unpaid Invoices Settlement */}
            {unpaidInvoices.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-[10px] text-nx-green font-bold uppercase tracking-widest">
                  <FileText className="w-3 h-3" />
                  Unpaid Invoices ({unpaidInvoices.length})
                </div>
                {unpaidInvoices.map(inv => (
                  <div key={inv.id} className="bg-nx-card border-2 border-nx-green/30 rounded-2xl p-5 space-y-4 shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-nx-paper uppercase tracking-widest">Invoice #{inv.invoice_number || inv.id.slice(0,8)}</div>
                        <div className="text-[10px] text-nx-muted mt-1">Delivered: {new Date(inv.delivered_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-display text-nx-paper">KSH {inv.invoice_amount?.toLocaleString()}</div>
                         <div className="text-[8px] text-nx-muted uppercase font-bold">Total Due</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-nx-paper/5 rounded-xl border border-nx-border">
                      <div>
                        <div className="text-[10px] text-nx-muted uppercase tracking-widest mb-0.5">Pay with NX</div>
                        <div className="text-xs font-bold text-nx-green"><AnimatedNumber value={Math.min(poolBalance, inv.invoice_amount || 0)} decimals={1} /> NX</div>
                      </div>
                      <button 
                         onClick={() => handleSettleInvoice(inv)}
                         className="bg-nx-green text-black px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-nx-green/20"
                      >
                         Settle Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-nx-card border border-nx-border rounded-2xl overflow-hidden">
               <div className="p-4 border-b border-nx-border bg-nx-paper/5">
                 <h4 className="text-[10px] uppercase tracking-widest text-nx-muted font-bold">Recent Requests</h4>
               </div>
               <div className="p-0 overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-nx-ink/30 border-b border-nx-border">
                      <tr>
                        <th className="px-4 py-3 text-[9px] uppercase tracking-widest text-nx-muted font-bold">Date</th>
                        <th className="px-4 py-3 text-[9px] uppercase tracking-widest text-nx-muted font-bold">Items</th>
                        <th className="px-4 py-3 text-[9px] uppercase tracking-widest text-nx-muted font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-nx-border">
                      {/* We should fetch and show real requests here */}
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-nx-muted text-[10px]">Your restock history will appear here.</td></tr>
                    </tbody>
                 </table>
               </div>
            </div>
            
            <div className="bg-nx-amber/5 border border-nx-amber/30 rounded-2xl p-6 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-nx-amber/20 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-nx-amber" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-nx-paper mb-1">Bulk Savings Active</h4>
                <p className="text-[10px] text-nx-muted leading-relaxed">
                  Multiple merchants are requesting flour this window. Current discount level: <span className="text-nx-green font-bold">12% OFF RRP</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'network' && (user.franchise_tier || user.tier) === 'HUB' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-nx-green" />
              <h3 className="text-sm uppercase tracking-widest text-nx-paper font-bold">Hub Network</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-nx-card border border-nx-border rounded-2xl p-5 text-center">
                <div className="text-[10px] uppercase tracking-widest text-nx-muted mb-1">Sub-Merchants</div>
                <div className="text-2xl font-display text-nx-paper">{subMerchants.length}</div>
              </div>
              <div className="bg-nx-card border border-nx-border rounded-2xl p-5 text-center">
                <div className="text-[10px] uppercase tracking-widest text-nx-muted mb-1">Total Commission</div>
                <div className="text-2xl font-display text-nx-green">
                  <AnimatedNumber value={commissions.reduce((sum, c) => sum + c.amount, 0)} decimals={1} /> NX
                </div>
              </div>
            </div>

            {/* Direct Enroll Whitelist Sub-Merchant Form */}
            <form onSubmit={handleEnrollSubMerchant} className="bg-nx-card border border-nx-border/40 rounded-2xl p-5 space-y-4">
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-nx-paper mb-1">Enroll New Sub-Merchant</h4>
                <p className="text-[10px] text-nx-muted uppercase tracking-widest leading-relaxed">
                  Whitelist a new merchant's phone number directly onto your HUB network. They can then register immediately.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder={`e.g. ${user.phone || '2547XXXXXXXX'}`}
                  value={enrollPhone}
                  onChange={(e) => setEnrollPhone(e.target.value)}
                  className="bg-nx-bg border border-nx-border rounded-lg px-4 py-3 text-nx-paper text-xs font-mono focus:outline-none focus:ring-1 focus:ring-nx-amber/50 flex-1 placeholder-white/20"
                  required
                />
                <button
                  type="submit"
                  disabled={enrollLoading}
                  className="nx-btn-primary px-5 text-[10px] uppercase font-bold tracking-widest shrink-0"
                >
                  {enrollLoading ? 'Whitelisting...' : 'Whitelist'}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest text-nx-muted font-bold">Sub-Merchant Directory</h4>
              {subMerchants.length === 0 ? (
                <div className="text-center py-8 text-nx-muted text-xs border border-dashed border-nx-border rounded-xl">
                  No sub-merchants yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {subMerchants.slice((subPage - 1) * 3, subPage * 3).map((sub, i) => (
                    <div key={i} className="bg-nx-card border border-nx-border rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-nx-paper font-bold">{sub.name || "Unnamed Shop"}</div>
                        <div className="text-[9px] text-nx-muted uppercase tracking-tighter">
                          Code: {sub.merchant_code} | {sub.location || 'AWAITING LOCATION'}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-nx-amber font-bold">{sub.tier || 'BASIC'}</div>
                    </div>
                  ))}
                  
                  {subMerchants.length > 3 && (
                    <div className="flex justify-between items-center pt-2">
                      <button 
                        onClick={() => setSubPage(p => Math.max(1, p - 1))}
                        disabled={subPage === 1}
                        className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-nx-paper disabled:opacity-50 border border-nx-border rounded"
                      >
                        Prev
                      </button>
                      <span className="text-[9px] text-nx-muted uppercase font-mono">Page {subPage} of {Math.ceil(subMerchants.length / 3)}</span>
                      <button 
                        onClick={() => setSubPage(p => Math.min(Math.ceil(subMerchants.length / 3), p + 1))}
                        disabled={subPage >= Math.ceil(subMerchants.length / 3)}
                        className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-nx-paper disabled:opacity-50 border border-nx-border rounded"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 mt-6">
              <h4 className="text-[10px] uppercase tracking-widest text-nx-muted font-bold">Recent Commissions</h4>
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-nx-muted text-xs border border-dashed border-nx-border rounded-xl">
                  No commissions earned yet
                </div>
              ) : (
                <div className="space-y-2">
                  {commissions.map((comm, i) => (
                    <div key={i} className="bg-nx-card border border-nx-border rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-nx-paper font-bold">Transaction Reward</div>
                        <div className="text-[9px] text-nx-muted uppercase tracking-tighter">
                          {new Date(comm.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm font-mono text-nx-green font-bold">+{comm.amount} NX</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tiers' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-nx-amber" />
              <h3 className="text-sm uppercase tracking-widest text-nx-paper font-bold">Network Tiers</h3>
            </div>
          </div>
        )}

        {activeTab === 'referral' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Share2 className="w-6 h-6 text-nx-amber" />
              <h3 className="text-sm uppercase tracking-widest text-nx-paper font-bold">Refer Friends</h3>
            </div>

            <div className="bg-nx-card border border-nx-border rounded-2xl p-8 text-center space-y-6">
              <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto shadow-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/app/login')}`} 
                  alt="PWA QR Code" 
                  className="w-full h-full"
                />
              </div>
              <div>
                <h4 className="text-lg font-bold text-nx-paper mb-2">Grow the NX Network</h4>
                <p className="text-xs text-nx-muted leading-relaxed px-4">
                  Help other merchants join the loyalty revolution. Share your link or let them scan this QR code.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => handleShare('whatsapp')}
                  className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                >
                  <Share2 className="w-5 h-5" /> Share via WhatsApp
                </button>
                <button 
                  onClick={() => handleShare('email')}
                  className="w-full py-4 bg-nx-paper text-nx-ink rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                >
                  <Mail className="w-5 h-5" /> Share via Email
                </button>
              </div>

              <div className="flex items-center gap-2 justify-center text-[10px] text-nx-muted italic">
                <AlertCircle className="w-3 h-3" />
                Refer friends through sending them the link via email or WhatsApp
              </div>
            </div>
          </div>
        )}

        {activeTab === 'family' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest text-nx-paper font-bold">Family Code Payments</h3>
              <span className="text-[10px] bg-nx-amber/10 border border-nx-amber/20 text-nx-amber px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Merchant Initiated
              </span>
            </div>

            {familyPayStatus === 'verifying' && (
              <div className="bg-nx-card border border-nx-border rounded-2xl p-8 text-center space-y-4">
                <div className="w-12 h-12 border-2 border-nx-amber border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-nx-muted uppercase tracking-widest">Validating family code and calculating rewards...</p>
              </div>
            )}

            {familyPayStatus === 'preview' && familyPreviewData && (
              <div className="space-y-6">
                <div className="bg-nx-card border border-nx-border rounded-2xl p-5 space-y-4">
                  <div>
                    <span className="text-[10px] text-nx-muted uppercase tracking-widest font-bold">Customer Profile</span>
                    <h4 className="font-display text-base text-nx-paper font-bold tracking-wide mt-0.5">
                      Parent: {familyPreviewData.parentName}
                    </h4>
                    <p className="text-[11px] text-nx-muted font-mono">
                      Phone: {familyPreviewData.parentPhone.substring(0, 6)}****{familyPreviewData.parentPhone.substring(familyPreviewData.parentPhone.length - 3)}
                    </p>
                    <p className="text-[11px] text-nx-amber font-mono mt-1">
                      Family Code: <span className="font-bold">{familyPreviewData.familyCode}</span>
                    </p>
                  </div>

                  {/* Mode Banner */}
                  {!familyPreviewData.allowSpending ? (
                    <div className="p-4 bg-nx-amber/5 border border-nx-amber/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-nx-amber font-bold text-xs uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Earn Only Mode (Spending Offline)
                      </div>
                      <p className="text-[10px] text-nx-muted uppercase tracking-tight leading-normal">
                        Spending privileges are currently offline for this family code, customer pays full cash amount but will earn NX units
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-nx-green/5 border border-nx-green/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-nx-green font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Earn & Spend Mode (Spending Allowed)
                      </div>
                      <p className="text-[10px] text-nx-muted uppercase tracking-tight leading-normal">
                        Spending is allowed! The parent's balance can be used to cover a portion of this transaction up to the merchant's dynamic acceptance ceiling.
                      </p>
                    </div>
                  )}

                  {/* Breakdown details */}
                  <div className="bg-nx-ink/40 border border-nx-border/50 rounded-xl p-4 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center text-nx-muted">
                      <span>Total Amount:</span>
                      <span className="text-nx-paper font-bold text-sm">KSH {familyPreviewData.amount.toFixed(2)}</span>
                    </div>

                    {familyPreviewData.allowSpending ? (
                      <>
                        <div className="flex justify-between items-center text-nx-muted">
                          <span>Paid via parent's NX balance:</span>
                          <span className="text-nx-amber font-bold">-{familyPreviewData.nxRedeem.toFixed(1)} NX (KSH {familyPreviewData.nxRedeem})</span>
                        </div>
                        <div className="flex justify-between items-center text-nx-muted">
                          <span>Remaining Cash Due:</span>
                          <span className="text-nx-green font-bold text-sm">KSH {familyPreviewData.cashPaid.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center text-nx-muted">
                        <span>Paid via cash/mobile money:</span>
                        <span className="text-nx-paper font-bold">KSH {familyPreviewData.cashPaid.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="h-px bg-nx-border/50 my-2" />

                    <div className="flex justify-between items-center text-nx-muted">
                      <span>Passive NX Rewards Earned:</span>
                      <span className="text-nx-green font-bold">+{familyPreviewData.nxEarned.toFixed(1)} NX</span>
                    </div>

                    {familyPreviewData.allowSpending && familyPreviewData.nxFee > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-nx-muted italic">
                        <span>Parent Security Fee:</span>
                        <span>{familyPreviewData.nxFee} NX</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setFamilyPayStatus('idle')}
                      className="flex-1 py-3 border border-nx-border text-nx-paper text-xs uppercase font-bold tracking-widest rounded-xl hover:bg-white/5 transition-all bg-transparent"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleFamilyCodePaymentSubmit}
                      className="flex-1 py-3 bg-nx-amber text-nx-ink text-xs uppercase font-bold tracking-widest rounded-xl hover:bg-nx-paper transition-all"
                    >
                      Confirm Payment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {familyPayStatus === 'success' && (
              <div className="bg-nx-card border border-nx-border rounded-2xl p-6 text-center space-y-6">
                <div className="w-16 h-16 bg-nx-green/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <CheckCircle2 className="w-10 h-10 text-nx-green mx-auto mt-3" />
                </div>
                <div>
                  <h4 className="font-display text-xl text-nx-paper font-bold mb-1">Transaction Completed!</h4>
                  <p className="text-xs text-nx-muted uppercase tracking-wider">
                    The family payment was successfully processed.
                  </p>
                </div>

                <div className="bg-nx-ink/40 border border-nx-border/50 rounded-xl p-4 text-left space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-nx-muted">Family Code:</span>
                    <span className="text-nx-paper font-bold">{familyPreviewData?.familyCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nx-muted">Total Amount:</span>
                    <span className="text-nx-paper font-bold">KSH {familyPreviewData?.amount.toFixed(2)}</span>
                  </div>
                  {familyPreviewData?.nxRedeem > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-nx-muted">Paid via NX:</span>
                        <span className="text-nx-amber font-bold">{familyPreviewData?.nxRedeem} NX</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nx-muted">Cash Received:</span>
                        <span className="text-nx-green font-bold">KSH {familyPreviewData?.cashPaid.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-nx-muted">Cash Received:</span>
                      <span className="text-nx-paper font-bold">KSH {familyPreviewData?.cashPaid.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-nx-green">
                    <span>Rewards Added:</span>
                    <span className="font-bold">+{familyPreviewData?.nxEarned} NX</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFamilyCodeInput('');
                    setFamilyAmountInput('');
                    setFamilyPayStatus('idle');
                    setFamilyPreviewData(null);
                  }}
                  className="w-full py-3 bg-nx-amber text-nx-ink text-xs uppercase font-bold tracking-widest rounded-xl hover:bg-nx-paper transition-all"
                >
                  New Transaction
                </button>
              </div>
            )}

            {(familyPayStatus === 'idle' || familyPayStatus === 'error') && (
              <div className="space-y-6">
                {/* Intro Card */}
                <div className="bg-gradient-to-br from-nx-card to-[#12110e] border border-nx-border rounded-2xl p-5 space-y-1">
                  <span className="text-[10px] text-nx-amber uppercase tracking-widest font-bold">Duka Family Terminal</span>
                  <h4 className="font-display text-sm text-nx-paper uppercase tracking-wider font-bold">Process Family Payments</h4>
                  <p className="text-[11px] text-nx-muted leading-relaxed">
                    Parents can distribute unique Family Codes to children. Enter the code here to process the payment and reward passive earnings to the family pool.
                  </p>
                </div>

                {/* Main Form */}
                <div className="bg-nx-card border border-nx-border rounded-2xl p-5 space-y-4">
                  {familyPayError && (
                    <div className="p-3 bg-nx-ember/15 border border-nx-ember/30 rounded-xl flex items-start gap-2 text-[11px] text-nx-ember font-mono uppercase">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{familyPayError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-nx-muted font-bold block">
                      Family Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FAM12345"
                      value={familyCodeInput}
                      onChange={(e) => setFamilyCodeInput(e.target.value)}
                      className="w-full bg-nx-bg border border-nx-border rounded-xl px-4 py-3 text-nx-paper text-sm font-mono tracking-widest placeholder-white/10 uppercase focus:outline-none focus:ring-1 focus:ring-nx-amber/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-nx-muted font-bold block">
                      Total Purchase Amount (KSH)
                    </label>
                    <input
                      type="number"
                      placeholder="Enter amount in KSH"
                      value={familyAmountInput}
                      onChange={(e) => setFamilyAmountInput(e.target.value)}
                      className="w-full bg-nx-bg border border-nx-border rounded-xl px-4 py-3 text-nx-paper text-sm font-mono placeholder-white/10 focus:outline-none focus:ring-1 focus:ring-nx-amber/50"
                    />
                  </div>

                  <button
                    onClick={handleFamilyCodePaymentVerify}
                    className="w-full py-3.5 bg-nx-amber text-nx-ink text-xs uppercase font-bold tracking-widest rounded-xl hover:bg-nx-paper transition-all shadow-lg shadow-nx-amber/10 mt-2"
                  >
                    Verify & Calculate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom navigation removed in favor of sidebar */}

      {/* Restock Modal */}
      {isRestockModalOpen && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-nx-card border border-nx-border w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between p-4 border-b border-nx-border">
              <h3 className="font-display text-xl text-nx-paper tracking-wider">New Restock Order</h3>
              <button onClick={() => setIsRestockModalOpen(false)} className="p-2 text-nx-muted hover:text-nx-paper transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {restockStatus === 'success' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 px-4 space-y-6"
                >
                  <div className="relative mx-auto w-24 h-24">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="absolute inset-0 bg-nx-green/20 rounded-full animate-ping"
                    />
                    <div className="relative w-full h-full bg-nx-green rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                      <CheckCircle2 className="w-12 h-12 text-nx-ink" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-display text-2xl text-nx-paper font-bold tracking-tight">Confirmed!</h4>
                    <p className="text-nx-amber font-mono text-[10px] uppercase tracking-widest font-bold">Request sent to NX Network</p>
                  </div>
                  
                  <p className="text-sm text-nx-muted leading-relaxed">
                    We've received your restock order. Our team will review and fulfill it shortly. You can track status in your history.
                  </p>

                  <button 
                    onClick={() => setIsRestockModalOpen(false)}
                    className="w-full py-4 bg-nx-card border border-nx-border text-nx-paper rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-nx-paper/10 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </motion.div>
              ) : restockStatus === 'loading' ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-12 h-12 border-2 border-nx-amber border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] text-nx-muted uppercase font-mono tracking-widest animate-pulse">Processing Order...</p>
                </div>
              ) : (
                <form onSubmit={handleRestockSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-nx-muted mb-2">Order Details</label>
                    <textarea 
                      value={restockOrder}
                      onChange={(e) => setRestockOrder(e.target.value)}
                      placeholder="e.g. Pembe 2kg * 20, Brookside 500ml * 12"
                      className="w-full bg-nx-ink border border-nx-border rounded-xl px-4 py-3 text-nx-paper focus:outline-none focus:border-nx-amber transition-colors font-mono text-sm min-h-[120px]"
                      required
                    />
                  </div>
                  
                  <div className="bg-nx-ink/50 rounded-xl p-4 flex gap-3 items-start">
                    <Info className="w-4 h-4 text-nx-amber shrink-0 mt-0.5" />
                    <p className="text-[10px] text-nx-muted leading-relaxed">
                      Our AI will automatically resolve brand names and weights. You'll receive a confirmation USSD prompt shortly.
                    </p>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={restockStatus === 'loading'}
                    className="w-full py-4 bg-nx-green text-nx-ink font-bold uppercase tracking-wider rounded-xl hover:bg-nx-paper transition-all disabled:opacity-50 relative overflow-hidden group shadow-lg shadow-nx-green/20"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                       {restockStatus === 'loading' ? 'Processing...' : 'Submit Order'}
                       <Zap className="w-4 h-4" />
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transparency Card Modal */}
      {successModalTxn && (
        <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-b from-[#1a1714] to-[#12110e] border border-nx-amber/40 w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
          >
            {/* Background glowing orb */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-nx-amber/20 rounded-full blur-[40px] -mr-10 -mt-10"></div>
            
            <div className="p-8 text-center space-y-6 relative z-10">
              <div className="mx-auto w-20 h-20 bg-nx-amber/20 rounded-full flex items-center justify-center border border-nx-amber/30 shadow-[0_0_20px_rgba(255,181,71,0.2)]">
                <CheckCircle2 className="w-10 h-10 text-nx-amber" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-display text-2xl text-nx-paper tracking-wider">Payment Approved!</h3>
                <p className="text-[10px] text-nx-muted uppercase tracking-widest font-mono">
                  Txn: {successModalTxn.transaction_code}
                </p>
              </div>

              <div className="bg-black/40 border border-nx-amber/20 rounded-2xl p-6">
                <div className="text-[10px] uppercase tracking-widest text-nx-muted mb-2">You Earned</div>
                <div className="font-display text-4xl text-nx-paper mb-1 tracking-tighter">
                  KES {successModalTxn.nx_redeemed || 0}
                </div>
                <div className="text-[9px] text-nx-amber/80 font-bold uppercase tracking-widest">
                  Added directly to your NX Pool
                </div>
                
                {fmcgContributions && fmcgContributions.length > 0 && fmcgContributions[0].status === 'active' && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2 text-left">
                    <Sparkles className="w-3 h-3 text-[#00d4ff] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[9px] font-bold text-[#00d4ff] uppercase tracking-wider mb-0.5">
                        Pool Boost Applied
                      </div>
                      <div className="text-[10px] text-nx-muted/90 italic line-clamp-2">
                        Includes bonus margin from <b>{fmcgContributions[0].fmcg_name} Boost</b>—thanks to your recent restock volumes!
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSuccessModalTxn(null)}
                className="w-full py-4 bg-nx-amber text-nx-ink font-bold uppercase tracking-wider rounded-xl hover:bg-nx-paper transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-nx-card border border-nx-border w-full max-w-sm rounded-2xl overflow-hidden p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-nx-paper mb-2">{confirmModal.title}</h3>
            <p className="text-xs text-nx-muted mb-6">{confirmModal.message}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-nx-paper bg-nx-border/20 hover:bg-nx-border/40 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer",
                  confirmModal.title.includes('Revoke') ? "bg-nx-ember text-white hover:opacity-90" : "bg-nx-amber text-nx-ink hover:opacity-90"
                )}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
