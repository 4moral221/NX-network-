import { keyGenLimiter, supabase, requirePartner } from "../core";
import express from "express";
import crypto from "crypto";

const router = express.Router();
router.post('/api/fmcg/submit-bid', requirePartner, async (req, res) => {
  try {
    const { batch_id, brand_id, offered_price, delivery_days, notes } = req.body;
    if (!batch_id || !brand_id || !offered_price) return res.status(400).json({ success: false, error: 'Missing required fields' });

    const { data, error } = await supabase.from('restock_batch_offers').insert({
      batch_id,
      fmcg_partner_id: brand_id,
      offered_price: Number(offered_price),
      status: 'pending',
    }).select().single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Bid submission error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/api/fmcg/contribute', requirePartner, async (req, res) => {
  try {
    const { merchant_code, fmcg_name, contribution_amount, effective_from, effective_to, status } = req.body;
    if (!merchant_code || !contribution_amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const { data, error } = await supabase.from('fmcg_margin_contributions').insert([{
      merchant_code,
      fmcg_name: fmcg_name || 'Brookside (Dedicated)',
      contribution_amount: Number(contribution_amount),
      effective_from: effective_from || new Date().toISOString().slice(0, 10),
      effective_to: effective_to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: status || 'pending'
    }]).select();

    if (error) throw error;
    res.json({ success: true, data: data ? data[0] : null });
  } catch (err: any) {
    console.error("FMCG contribution insertion error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/api/fmcg/revoke-key', requirePartner, async (req, res) => {
  try {
    const { key_id } = req.body;
    if (!key_id) {
      return res.status(400).json({ success: false, error: 'Key ID required' });
    }
    const { error } = await supabase.from('fmcg_partners').update({ api_key: null }).eq('id', key_id);
    if (error) throw error;
    res.json({ success: true, message: 'Key revoked successfully' });
  } catch (err: any) {
    console.error("Revoke API key error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get('/api/fmcg/api-keys', requirePartner, async (req, res) => {
  try {
    const { brand_name } = req.query;
    if (!brand_name) return res.status(400).json({ success: false, error: 'Brand name required' });
    const cleanBrand = String(brand_name).trim().toLowerCase();
    
    const { data: pRec } = await supabase.from('fmcg_partners').select('id, name, api_key, created_at').ilike('name', cleanBrand).maybeSingle();

    if (!pRec || !pRec.api_key) {
       return res.json({ success: true, keys: [] });
    }

    const rawKey = pRec.api_key;
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

    const keys = [{
        id: pRec.id,
        partner_id: pRec.id,
        prefix,
        last4,
        created_at: pRec.created_at || new Date().toISOString(),
        revoked: false
    }];

    res.json({ success: true, keys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/api/fmcg/generate-key', requirePartner, keyGenLimiter, async (req, res) => {
  try {
    const { brand_name, brand_id, company_name } = req.body;
    let finalBrandName = brand_name || company_name;
    
    if (!finalBrandName && brand_id) {
       const { data: pCheck } = await supabase.from('fmcg_partners').select('name').eq('id', brand_id).maybeSingle();
       if (pCheck?.name) finalBrandName = pCheck.name;
    }
    if (!finalBrandName) {
       return res.status(400).json({ success: false, error: 'Brand name matches could not be resolved from inputs.' });
    }

    const rawKey = `nx_live_${crypto.randomBytes(16).toString('hex')}`;
    const { data: pRec, error } = await supabase.from('fmcg_partners').update({ api_key: rawKey }).ilike('name', finalBrandName).select().maybeSingle();
    
    if (error || !pRec) {
       return res.status(500).json({ success: false, error: "Failed to update API key." });
    }

    res.json({ success: true, key: rawKey, prefix: 'nx_live_', last4: rawKey.slice(-4), id: pRec.id });
  } catch (err: any) {
    console.error("Generate API key error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
