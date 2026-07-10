import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
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
  FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

export default function MerchantDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [pool, setPool] = useState(0);
  const [utilization, setUtilization] = useState(0);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [totalLiability, setTotalLiability] = useState(0);
  const [poolBalance, setPoolBalance] = useState(0);
  const [pendingTxns, setPendingTxns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'restock' | 'tiers' | 'referral' | 'network'>('home');
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

  const fetchMerchantData = async () => {
    setLoading(true);

    // Tier Reversion Logic (Automatic Downgrade)
    // The client shouldn't downgrade tiers directly, leave it to backend sync/cron jobs
    // to avoid RLS infinite recursion errors and security risks.

    // 1. Calculate Earnings (Total NX Redeemed by customers at this shop) and Pool Liability
    const { data: rdRes } = await supabase.from('transactions')
      .select('nx_redeemed, nx_earned')
      .eq('merchant_code', user.merchant_code)
      .in('status', ['completed', 'awaiting_merchant', 'pending_customer']);
    
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
        .select('name, phone, created_at')
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

    setLoading(false);
    fetchPendingInvoices();
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
    <div className="flex-1 flex flex-col bg-nx-ink">
      {/* Header */}
      <header className="px-6 py-5 border-b border-nx-border flex items-center justify-between bg-nx-card">
        <div className="flex items-center gap-3">
          <div className="relative">
            <NXLogo title={user.name} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 right-0 translate-x-1/2 w-4 h-4 bg-nx-ember text-white text-[8px] flex items-center justify-center rounded-full font-bold animate-pulse z-30">
                {notifications.length}
              </span>
            )}
          </div>
        </div>
        <button onClick={onLogout} className="p-2 text-nx-muted hover:text-nx-ember transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
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
                    {poolBalance.toFixed(1)} <span className="text-xs text-nx-amber">NX</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-widest text-nx-muted mb-1">Total Pool Capacity</div>
                  <div className="font-mono text-lg text-nx-green font-bold">
                    {pool.toFixed(1)}
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
                    {Math.round(totalLiability)} / {pool.toFixed(0)} NX
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
                { name: 'BASIC', color: 'text-nx-muted', icon: <Store className="w-5 h-5" />, active: (user.franchise_tier || user.tier || 'BASIC') === 'BASIC', perks: ['Standard loyalty pool', 'USSD restock access', 'Daily summaries'] },
                { name: 'CERTIFIED', color: 'text-nx-amber', icon: <Award className="w-5 h-5" />, active: (user.franchise_tier || user.tier) === 'CERTIFIED', perks: ['15% Higher pool earn rate', 'Priority restock delivery', 'Custom brand alerts'] },
                { name: 'HUB', color: 'text-nx-green', icon: <Zap className="w-5 h-5" />, active: (user.franchise_tier || user.tier) === 'HUB', perks: ['Max pool earn rate (70%)', 'Zero-fee restock delivery', 'FMCG direct insights'] },
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
                        <div className="text-xs font-bold text-nx-green">{Math.min(poolBalance, inv.invoice_amount || 0).toFixed(1)} NX</div>
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
                  {commissions.reduce((sum, c) => sum + c.amount, 0).toFixed(1)} NX
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
                  placeholder="e.g. 2547XXXXXXXX or 07XXXXXXXX"
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
                          Code: {sub.merchant_code} | {sub.location || 'Unknown location'}
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
                  <Phone className="w-5 h-5" /> Share via Email
                </button>
              </div>

              <div className="flex items-center gap-2 justify-center text-[10px] text-nx-muted italic">
                <AlertCircle className="w-3 h-3" />
                Refer friends through sending them the link via email or WhatsApp
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-nx-card border-t border-nx-border px-4 py-3 flex items-center justify-between z-40">
        {[
          { id: 'home', icon: <Store className="w-5 h-5" />, label: 'Portal' },
          { id: 'restock', icon: <Package className="w-5 h-5" />, label: 'Restock' },
          ...((user.franchise_tier || user.tier) === 'HUB' ? [{ id: 'network', icon: <Zap className="w-5 h-5" />, label: 'Network' }] : []),
          { id: 'tiers', icon: <Award className="w-5 h-5" />, label: 'Tiers' },
          { id: 'referral', icon: <Share2 className="w-5 h-5" />, label: 'Refer' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              activeTab === item.id ? "text-nx-amber" : "text-nx-muted hover:text-nx-paper"
            )}
          >
            {item.icon}
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

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

    </div>
  );
}
