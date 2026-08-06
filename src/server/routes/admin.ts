import { supabase, e2eState, requireAdmin, getLocalFallbackFile, saveOnboardingDB, getE2EHistory, triggerE2ETest, OnboardingDB } from "../core";
import express from "express";

const router = express.Router();
router.get('/api/admin/logs', requireAdmin, async (req, res) => {
  try {
    try {
      const { data, error } = await supabase.from('project_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
        throw new Error('FALLBACK');
      }
      if (error) throw error;
      res.json({ success: true, logs: data || [] });
    } catch (dbErr: any) {
      if (dbErr.message === 'FALLBACK' || dbErr.code === 'PGRST205' || dbErr.message?.includes('schema cache')) {
        const localLogs = getLocalFallbackFile<any>('project_logs.json')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 100);
        return res.json({ success: true, logs: localLogs, is_fallback: true });
      }
      throw dbErr;
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/api/admin/approve-merchant', requireAdmin, async (req, res) => {
    try {
      const { appId, phone, businessName, location, lat, lng, recoveryPin, nationalId, hubMerchantCode } = req.body;
      
      if (!appId || !phone) {
        return res.status(400).json({ error: "Missing appId or phone" });
      }

      // Perform all operations using the server-side supabase client (service role)
      
      // 1. Update application status
      const { error: appError } = await supabase
        .from('merchant_applications')
        .update({ 
          status: 'approved', 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', appId);
      
      if (appError) throw appError;

      // 2. Whitelist them
      await supabase
        .from('merchant_whitelist')
        .upsert({ phone, added_at: new Date().toISOString() }, { onConflict: 'phone' });

      // 3. Generate merchant code if needed
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('merchant_code')
        .eq('phone', phone)
        .maybeSingle();

      let mCode = existingUser?.merchant_code;
      if (!mCode) {
        mCode = 'M' + Math.floor(100000 + Math.random() * 900000).toString();
      }

      // 4. Create/Update user
      const userData = { 
        phone,
        role: 'merchant', 
        merchant_code: mCode,
        franchise_tier: 'BASIC',
        hub_merchant_code: hubMerchantCode || null,
        location,
        latitude: lat,
        longitude: lng,
        name: businessName,
        acceptance_percent: 0.2,
        recovery_pin: recoveryPin,
        national_id: nationalId,
        status: 'active',
        updated_at: new Date().toISOString()
      };

      const { error: userError } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'phone' });
      
      if (userError) throw userError;

      // Duplicate to users_uuid for FK compatibility
      await supabase.from('users_uuid').upsert(userData, { onConflict: 'phone' });

      // 5. Notify merchant
      await supabase.from('merchant_notifications').insert({
        merchant_code: mCode,
        title: 'Account Approved',
        message: 'Welcome to the platform! Your merchant application has been approved.',
        type: 'success'
      });

      // 6. Seed margin row
      await supabase.from('merchant_margins').upsert({
        merchant_code: mCode, gross_margin: 0,
      }, { onConflict: 'merchant_code' });
      
      // 7. Seed inventory
      const SKU_VARIANTS: Record<string, string[]> = {
        BR: ["400g", "600g", "700g"],
        ML: ["250ml", "500ml", "1L", "2L"],
        SG: ["500g", "1kg", "2kg", "5kg"],
        CO: ["500ml", "1L", "2L", "5L", "10L", "20L"],
        F: ["1kg", "2kg", "5kg", "10kg", "25kg"],
      };

      const seedRows: any[] = [];
      for (const [skuCode, variants] of Object.entries(SKU_VARIANTS)) {
        for (const variant of variants) {
          seedRows.push({ merchant_code: mCode, sku_code: skuCode, variant_code: variant, quantity: 0 });
        }
      }
      
      await supabase.from('merchant_inventory').upsert(seedRows, {
        onConflict: 'merchant_code,sku_code,variant_code'
      });
      
      res.json({ success: true, merchantCode: mCode });
    } catch (err: any) {
      console.error("Admin Approval Error:", err);
      // Ensure we return a JSON error even if it's a critical crash
      res.status(err.status || 500).json({ 
        error: err.message || "Internal server error during merchant approval",
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });
router.post('/api/admin/reject-application', requireAdmin, async (req, res) => {
    try {
      const { appId } = req.body;
      if (!appId) return res.status(400).json({ error: "Missing appId" });

      const { data: appData } = await supabase.from('merchant_applications').select('*').eq('id', appId).single();
      const { error } = await supabase.from('merchant_applications').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', appId);
      if (error) throw error;
      
      if (appData) {
        const { data: userData } = await supabase.from('users').select('merchant_code').eq('phone', appData.phone).maybeSingle();
        if (userData?.merchant_code) {
          await supabase.from('merchant_notifications').insert({
            merchant_code: userData.merchant_code,
            title: 'Application Rejected',
            message: 'We regret to inform you that your merchant application has been rejected at this time.',
            type: 'error'
          });
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Reject Application Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
router.get('/api/admin/overview-stats', requireAdmin, async (req, res) => {
  try {
    const { count: mCount, error: mErr } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'merchant');
    if (mErr) throw mErr;
    
    const { count: cCount, error: cErr } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer');
    if (cErr) throw cErr;
    
    const { count: tCount, error: tErr } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'completed', 'awaiting_merchant']);
    if (tErr) throw tErr;

    const { data: recentTxns, error: rErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
    const { data: recentApps, error: aErr } = await supabase.from('merchant_applications').select('*').order('applied_at', { ascending: false }).limit(20);
    const { data: fraudLogs, error: fErr } = await supabase.from('fraud_logs').select('*').order('created_at', { ascending: false }).limit(50);

    res.json({
      mCount: mCount || 0,
      cCount: cCount || 0,
      tCount: tCount || 0,
      recentTxns: recentTxns || [],
      recentApps: recentApps || [],
      fraudLogs: fraudLogs || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
router.post('/api/admin/db/update', requireAdmin, async (req, res) => {
  try {
    const { table, match, payload } = req.body;
    if (!table || !match || !payload) return res.status(400).json({ error: "Missing parameters" });
    const { data, error } = await supabase.from(table).update(payload).match(match).select();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error("Admin DB Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/api/admin/merchants', requireAdmin, async (req, res) => {
    try {
      // In a real app, verify admin session here.
      // For now, we use the service role supabase instance initialized in startServer.
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'merchant')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      console.error("Fetch Merchants Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
router.get('/api/admin/customers', requireAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      console.error("Fetch Customers Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
router.get('/api/admin/user-stats', requireAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('franchise_tier, role')
        .eq('role', 'merchant');

      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      console.error("Fetch User Stats Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
router.post('/api/admin/send-api-key', requireAdmin, async (req, res) => {
    try {
      const { email, partnerName, apiKey, action } = req.body;
      if (!email || !partnerName || !apiKey) return res.status(400).json({ error: "Missing parameters" });

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.warn('RESEND_API_KEY missing - falling back to simulation');
        return res.json({ success: true, simulated: true });
      }

      const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const subject = action === 'rotate' ? 'NX Network API Key Update' : 'Welcome to NX Network - API Credentials';
      
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #1a1d23;">NX Network Gateway</h2>
          <p>Hello <strong>${partnerName}</strong>,</p>
          <p>${action === 'rotate' ? 'Your API credentials for the NX Network have been rotated.' : 'Your partner account has been configured. Below are your API credentials to access the FMCG portal and APIs.'}</p>
          <div style="background: #f4f5f7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e4e6ea;">
            <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase;">Your API Key</p>
            <code style="display: block; font-size: 16px; background: #fff; padding: 10px; border-radius: 4px; border: 1px dashed #ccc;">${apiKey}</code>
          </div>
          <p style="color: #d97706; font-size: 14px;"><strong>Security Warning:</strong> This key grants full access to your FMCG Partner Sandbox. Never share it publicly.</p>
          <hr style="border: none; border-top: 1px solid #e4e6ea; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">Automated message from NX Network Systems.</p>
        </div>
      `;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: email, // If not verified domain, resend limits to the registered email in their dash
          subject,
          html: htmlBody
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email via Resend');
      }

      res.json({ success: true, data });
    } catch (err: any) {
      console.error("Resend Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/admin/purge_test_data', requireAdmin, async (req, res) => {
    try {
      console.log('[Purge Data] Starting system-wide operational data purge...');
      
      // 1. Reset onboarding_db.json
      try {
        const defaultDB: OnboardingDB = {
          whitelist: [
            { id: "wl-1", email: "formidablefoe254@gmail.com", brand_name: "NX Global HQ", active: true, created_at: new Date().toISOString() },
            { id: "wl-2", email: "@unilever.com", brand_name: "Unilever Global", active: true, created_at: new Date().toISOString() },
            { id: "wl-3", email: "@unilever.co.ke", brand_name: "Unilever East Africa", active: true, created_at: new Date().toISOString() },
            { id: "wl-4", email: "@brookside.co.ke", brand_name: "Brookside Dairy Ltd", active: true, created_at: new Date().toISOString() }
          ],
          approvals: [],
          audit_logs: []
        };
        saveOnboardingDB(defaultDB);
        console.log('[Purge Data] Reset onboarding JSON database successfully.');
      } catch (err: any) {
        console.error('[Purge Data] Error resetting onboarding JSON:', err);
      }

      // 2. Perform Postgres purges if Supabase is configured
      if (supabase) {
        const reverseOrderTables = [
          'fraud_logs',
          'ops_audit_logs',
          'merchant_notifications',
          'hub_commissions',
          'franchise_fee_payments',
          'restock_batch_offers',
          'restock_invoices',
          'restock_batches',
          'batch_nx_credits',
          'restock_requests',
          'fmcg_margin_contributions',
          'merchant_whitelist',
          'merchant_applications',
          'merchant_margins',
          'merchant_inventory',
          'nx_rate_limits',
          'nx_logs',
          'transactions',
          'ledger_entries'
        ];

        for (const table of reverseOrderTables) {
          try {
            console.log(`[Purge Data] Purging table: ${table}`);
            const { error } = await supabase.from(table).delete().neq('created_at', '1970-01-01T00:00:00Z');
            if (error) {
              // Try standard delete with different predicate as backup
              await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }
          } catch (te: any) {
            console.warn(`[Purge Data] Non-blocking warning for table ${table}:`, te.message);
          }
        }

        // Keep core admins, delete non-admins
        try {
          console.log('[Purge Data] Purging non-admin users');
          await supabase.from('users').delete().eq('is_admin', false);
          
          // Non-admin users purged successfully
        } catch (ue: any) {
          console.warn('[Purge Data] Non-blocking user purge warning:', ue.message);
        }

        // Restore NX_SYSTEM virtual ledger account
        try {
          await supabase.from('ledger_entries').insert({
            account_phone: 'NX_SYSTEM',
            entry_type: 'credit',
            amount: 0,
            reference: 'SYSTEM_RESET',
            expires_at: '2099-12-31T00:00:00Z'
          });
        } catch (le: any) {
          console.warn('[Purge Data] Ledger account insert warning:', le.message);
        }
      }

      res.json({ success: true, message: 'All operational test data purged successfully.' });
    } catch (err: any) {
      console.error('[Purge Data] Error during purge:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.get('/api/e2e-status', requireAdmin, (req, res) => {
    res.json({
      isRunning: e2eState.isRunning,
      status: e2eState.status,
      lastRun: e2eState.lastRun,
      nextRunInMs: Math.max(0, e2eState.nextRunAt - Date.now()),
      output: e2eState.output,
      history: getE2EHistory().reverse() // Newest first
    });
  });
router.post('/api/e2e-trigger', requireAdmin, async (req, res) => {
    if (e2eState.isRunning) {
      return res.status(400).json({ success: false, error: 'E2E test is already running.' });
    }
    // Fire and forget, trigger in background and reply immediately
    triggerE2ETest().catch(() => {});
    res.json({ success: true, message: 'E2E test run triggered successfully.' });
  });

export default router;
