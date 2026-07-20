import { keyGenLimiter, supabase, requirePartner, getLocalFallbackFile, saveLocalFallbackFile } from "../core";
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
    
    const file = 'sandbox_api_keys.json';
    const existing = getLocalFallbackFile<{ id: string; partner_id: number; partner_name: string; key: string; created_at: string; revoked: boolean }>(file);
    const isSandbox = existing.some(k => k.id === key_id);
    
    if (isSandbox) {
      const updated = existing.filter(k => k.id !== key_id);
      saveLocalFallbackFile(file, updated);
    } else {
      const { error } = await supabase.from('fmcg_partners').update({ api_key: null }).eq('id', key_id);
      if (error) throw error;
    }
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

    const keys: any[] = [];

    if (pRec && pRec.api_key) {
      const rawKey = pRec.api_key;
      let prefix = 'nx_live_';
      let last4 = '****';
      if (rawKey.length > 4) {
          if (rawKey.startsWith('nx_live_')) {
              last4 = rawKey.slice(-4);
          } else if (rawKey.startsWith('nx_sandbox_')) {
              prefix = 'nx_sandbox_';
              last4 = rawKey.slice(-4);
          } else {
              prefix = 'sys_';
              last4 = rawKey.slice(-4);
          }
      }

      keys.push({
          id: pRec.id,
          partner_id: pRec.id,
          prefix,
          last4,
          created_at: pRec.created_at || new Date().toISOString(),
          revoked: false,
          type: 'production'
      });
    }

    if (pRec) {
      const file = 'sandbox_api_keys.json';
      const sandboxKeys = getLocalFallbackFile<{ id: string; partner_id: number; partner_name: string; key: string; created_at: string; revoked: boolean }>(file);
      const match = sandboxKeys.find(k => k.partner_id === pRec.id && !k.revoked);
      if (match) {
        keys.push({
          id: match.id,
          partner_id: pRec.id,
          prefix: 'nx_sandbox_',
          last4: match.key.slice(-4),
          created_at: match.created_at,
          revoked: false,
          type: 'sandbox'
        });
      }
    }

    res.json({ success: true, keys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/api/fmcg/generate-key', requirePartner, keyGenLimiter, async (req, res) => {
  try {
    const { brand_name, brand_id, company_name, type } = req.body;
    let finalBrandName = brand_name || company_name;
    
    if (!finalBrandName && brand_id) {
       const { data: pCheck } = await supabase.from('fmcg_partners').select('name').eq('id', brand_id).maybeSingle();
       if (pCheck?.name) finalBrandName = pCheck.name;
    }
    if (!finalBrandName) {
       return res.status(400).json({ success: false, error: 'Brand name matches could not be resolved from inputs.' });
    }

    const isSandbox = type === 'sandbox';
    const keyPrefix = isSandbox ? 'nx_sandbox_' : 'nx_live_';
    const rawKey = `${keyPrefix}${crypto.randomBytes(16).toString('hex')}`;
    
    if (isSandbox) {
      const { data: pRec } = await supabase.from('fmcg_partners').select('id, name').ilike('name', finalBrandName).maybeSingle();
      if (!pRec) return res.status(404).json({ success: false, error: 'Partner not found' });
      
      const file = 'sandbox_api_keys.json';
      const existing = getLocalFallbackFile<{ id: string; partner_id: number; partner_name: string; key: string; created_at: string; revoked: boolean }>(file);
      const updated = existing.filter(k => k.partner_id !== pRec.id);
      const newKeyObj = {
        id: crypto.randomUUID(),
        partner_id: pRec.id,
        partner_name: pRec.name,
        key: rawKey,
        created_at: new Date().toISOString(),
        revoked: false
      };
      updated.push(newKeyObj);
      saveLocalFallbackFile(file, updated);
      
      res.json({ success: true, key: rawKey, prefix: keyPrefix, last4: rawKey.slice(-4), id: newKeyObj.id, type: 'sandbox' });
    } else {
      const { data: pRec, error } = await supabase.from('fmcg_partners').update({ api_key: rawKey }).ilike('name', finalBrandName).select().maybeSingle();
      
      if (error || !pRec) {
         return res.status(500).json({ success: false, error: "Failed to update API key." });
      }

      res.json({ success: true, key: rawKey, prefix: keyPrefix, last4: rawKey.slice(-4), id: pRec.id, type: 'production' });
    }
  } catch (err: any) {
    console.error("Generate API key error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
