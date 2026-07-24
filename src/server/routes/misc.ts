import { requireAuth, supabase } from "../core";
import express from "express";
import * as fs from "fs";
import * as path from "path";
import { matchProduct } from "../../services/skuMatcher";

const router = express.Router();
router.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok"
  });
});

// Server-side bypass routes to query merchants safely without hitting client-side RLS recursion
router.post('/api/merchant/find-by-code', async (req, res) => {
  try {
    const { merchantCode } = req.body;
    if (!merchantCode) {
      return res.status(400).json({ success: false, error: "Merchant code is required" });
    }

    const { data: merchant, error } = await supabase
      .from('users')
      .select('*')
      .eq('merchant_code', merchantCode.toUpperCase())
      .eq('role', 'merchant')
      .maybeSingle();

    if (error) {
      console.error("Error finding merchant by code:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!merchant) {
      return res.status(404).json({ success: false, error: "Merchant not found" });
    }

    return res.json({ success: true, merchant });
  } catch (err: any) {
    console.error("Merchant find Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/merchant/list', async (req, res) => {
  try {
    const { data: merchants, error } = await supabase
      .from('users')
      .select('name, merchant_code, location, latitude, longitude')
      .eq('role', 'merchant')
      .limit(20);

    if (error) {
      console.error("Error listing merchants:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, merchants });
  } catch (err: any) {
    console.error("Merchant list Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/merchant/pool-info', async (req, res) => {
  try {
    const { merchantCode, franchiseTier, tier } = req.body;
    if (!merchantCode) {
      return res.status(400).json({ success: false, error: "Merchant code is required" });
    }

    const mCodeUpper = merchantCode.toUpperCase();

    // Query merchant_margins and fmcg_margin_contributions
    const [{ data: marginRes }, { data: fmcgRes }] = await Promise.all([
      supabase
        .from('merchant_margins')
        .select('gross_margin')
        .eq('merchant_code', mCodeUpper)
        .maybeSingle(),
      supabase
        .from('fmcg_margin_contributions')
        .select('contribution_amount')
        .eq('merchant_code', mCodeUpper)
        .eq('status', 'active')
    ]);

    const baseMargin = marginRes?.gross_margin || 0;
    const fmcgBoost = fmcgRes?.reduce((s: number, r: any) => s + Number(r.contribution_amount || 0), 0) || 0;

    const TIER_CONFIG: Record<string, { poolRate: number; acceptCeiling: number; monthlyFeeKes: number }> = {
      BASIC:     { poolRate: 0.60, acceptCeiling: 0.20, monthlyFeeKes: 0    },
      CERTIFIED: { poolRate: 0.65, acceptCeiling: 0.30, monthlyFeeKes: 500  },
      HUB:       { poolRate: 0.70, acceptCeiling: 0.40, monthlyFeeKes: 1000 },
    };

    const merchantCfg = TIER_CONFIG[franchiseTier || tier || 'BASIC'] || TIER_CONFIG.BASIC;
    const poolAmount = (baseMargin * merchantCfg.poolRate) + fmcgBoost;

    // Fetch transactions liability
    const { data: rdRes } = await supabase.from('transactions')
      .select('nx_redeemed, nx_earned')
      .eq('merchant_code', mCodeUpper)
      .in('status', ['completed', 'confirmed', 'awaiting_merchant', 'pending_customer']);

    const totalLiability = rdRes?.reduce((s: number, x: any) => s + (x.nx_redeemed || 0) + (x.nx_earned || 0), 0) || 0;
    const remainingPool = Math.max(0, poolAmount - totalLiability);
    const utilization = poolAmount > 0 ? (totalLiability / poolAmount) : 1;

    let dynamicCeiling = merchantCfg.acceptCeiling;
    if (utilization >= 0.90) dynamicCeiling = 0;

    return res.json({
      success: true,
      baseMargin,
      fmcgBoost,
      poolAmount,
      totalLiability,
      remainingPool,
      utilization,
      dynamicCeiling,
    });
  } catch (err: any) {
    console.error("Pool info Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/db-bypass', async (req, res) => {
  try {
    const { table, method, selectColumns, filters, insertData, updateData } = req.body;

    const allowedBypassTables = [
      'transactions',
      'users',
      'ledger_entries',
      'merchant_margins',
      'fmcg_margin_contributions',
      'merchant_whitelist'
    ];

    if (!allowedBypassTables.includes(table)) {
      return res.status(403).json({ data: null, error: `Bypass not allowed for table: ${table}` });
    }

    let query = supabase.from(table);

    if (method === 'select') {
      query = query.select(selectColumns || '*');
    } else if (method === 'insert') {
      query = query.insert(insertData);
    } else if (method === 'update') {
      query = query.update(updateData);
    } else if (method === 'delete') {
      query = query.delete();
    }

    // Apply filters
    if (filters && Array.isArray(filters)) {
      for (const filter of filters) {
        if (filter.type === 'eq') {
          query = query.eq(filter.column, filter.value);
        } else if (filter.type === 'neq') {
          query = query.neq(filter.column, filter.value);
        } else if (filter.type === 'in') {
          query = query.in(filter.column, filter.value);
        } else if (filter.type === 'gt') {
          query = query.gt(filter.column, filter.value);
        } else if (filter.type === 'gte') {
          query = query.gte(filter.column, filter.value);
        } else if (filter.type === 'lt') {
          query = query.lt(filter.column, filter.value);
        } else if (filter.type === 'lte') {
          query = query.lte(filter.column, filter.value);
        } else if (filter.type === 'limit') {
          query = query.limit(Number(filter.value || 50));
        } else if (filter.type === 'order') {
          const col = filter.column;
          const asc = filter.value?.ascending !== false;
          query = query.order(col, { ascending: asc });
        }
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Backend bypass query error for table ${table}:`, error);
      return res.status(200).json({ data: null, error: { message: error.message, code: error.code } });
    }

    return res.json({ data, error: null });
  } catch (err: any) {
    console.error("Backend db-bypass route error:", err);
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

router.post('/api/match', requireAuth, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: "Query is required" });

      const result = await matchProduct(query);
      res.json(result);
    } catch (err: any) {
      console.error("Match Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/predict_restock', requireAuth, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      const lines = text.split('\n').filter((l: string) => l.trim());
      const predictions = await Promise.all(lines.map(async (line: string) => {
        const [query, qtyStr] = line.split('*');
        const qty = parseInt(qtyStr?.trim() || '1', 10);
        const matchResult = await matchProduct(query.trim());
        const bestMatch = (matchResult as any).bestMatch;

        return {
          sku: bestMatch?.sku || 'UNCERTAIN',
          name: bestMatch?.name || query.trim(),
          quantity: qty,
          score: bestMatch?.score || 0,
          fuzzy: bestMatch ? bestMatch.score < 0.9 : true,
          raw: line
        };
      }));

      res.json({ success: true, items: predictions });
    } catch (err: any) {
      console.error("Prediction Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

router.get('/api/landing/waitlist', async (req, res) => {
  try {
    const waitlistPath = path.join(process.cwd(), "data", "waitlist.json");
    let waitlist: any[] = [];
    if (fs.existsSync(waitlistPath)) {
      try {
        waitlist = JSON.parse(fs.readFileSync(waitlistPath, 'utf8'));
      } catch (err) {
        console.error("Error reading waitlist.json:", err);
      }
    }
    return res.json({ success: true, data: waitlist });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api/landing/waitlist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const waitlistPath = path.join(process.cwd(), "data", "waitlist.json");
    if (fs.existsSync(waitlistPath)) {
      let waitlist = JSON.parse(fs.readFileSync(waitlistPath, 'utf8'));
      waitlist = waitlist.filter((item: any) => item.id !== id && item.email !== id);
      fs.writeFileSync(waitlistPath, JSON.stringify(waitlist, null, 2), 'utf8');
    }
    if (supabase && typeof supabase.from === 'function') {
      try {
        await supabase.from('waitlist').delete().or(`id.eq.${id},email.eq.${id}`);
      } catch (e) {
        // Ignore if table missing
      }
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/landing/subscribe', async (req, res) => {
  try {
    const { email, role, phone, name } = req.body;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: "Email address is required." });
    }
    
    const emailLower = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.status(400).json({ success: false, error: "Please enter a valid email address." });
    }
    
    const roleStr = typeof role === 'string' ? role.trim() : 'visitor';
    const phoneStr = typeof phone === 'string' ? phone.trim() : '';
    const nameStr = typeof name === 'string' ? name.trim() : '';
    
    // Save to local JSON storage
    const waitlistPath = path.join(process.cwd(), "data", "waitlist.json");
    let waitlist: any[] = [];
    if (fs.existsSync(waitlistPath)) {
      try {
        waitlist = JSON.parse(fs.readFileSync(waitlistPath, 'utf8'));
      } catch (err) {
        console.error("Error reading waitlist.json:", err);
      }
    }
    
    const alreadyExists = waitlist.some((item: any) => item.email.toLowerCase() === emailLower);
    if (alreadyExists) {
      return res.status(400).json({ 
        success: false, 
        error: "This email address is already registered on our waitlist!" 
      });
    }
    
    const newEntry = {
      id: "sub_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      email: emailLower,
      role: roleStr,
      phone: phoneStr,
      name: nameStr,
      subscribedAt: new Date().toISOString(),
      subscribed_at: new Date().toISOString()
    };
    
    waitlist.push(newEntry);
    
    const dir = path.dirname(waitlistPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(waitlistPath, JSON.stringify(waitlist, null, 2), 'utf8');

    // Also attempt Supabase insert if waitlist table exists
    if (supabase && typeof supabase.from === 'function') {
      try {
        await supabase.from('waitlist').insert({
          email: emailLower,
          name: nameStr,
          role: roleStr,
          subscribed_at: newEntry.subscribedAt
        });
      } catch (sbErr) {
        // Silently catch if table doesn't exist in Supabase
      }
    }
    
    return res.json({ 
      success: true, 
      message: "Thank you! You have been successfully added to our waitlist." 
    });
  } catch (err: any) {
    console.error("Subscription Error:", err);
    res.status(500).json({ success: false, error: "An unexpected error occurred. Please try again." });
  }
});

export default router;
