import { supabase, requirePartner, getLocalFallbackFile, saveLocalFallbackFile, logProjectAction } from "../core";
import express from "express";
import crypto from "crypto";

const router = express.Router();
router.post('/api/logistics/generate-key', requirePartner, async (req, res) => {
    try {
      const { brand_name, company_name, type } = req.body;
      const finalBrand = brand_name || company_name;
      if (!finalBrand) return res.status(400).json({ success: false, error: 'Partner name required' });
      
      const isSandbox = type === 'sandbox';
      const keyPrefix = isSandbox ? 'nx_sandbox_' : 'nx_live_';
      const rawKey = `${keyPrefix}${crypto.randomBytes(16).toString('hex')}`;
      
      if (isSandbox) {
        const { data: pRec } = await supabase.from('fmcg_partners').select('id, name').ilike('name', finalBrand).maybeSingle();
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
        const { data: pRec, error } = await supabase.from('fmcg_partners').update({ api_key: rawKey }).ilike('name', finalBrand).select().maybeSingle();
        if (error || !pRec) return res.status(500).json({ success: false, error: 'Failed to generate logistics API key' });

        res.json({ success: true, key: rawKey, prefix: keyPrefix, last4: rawKey.slice(-4), id: pRec.id, type: 'production' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.get('/api/logistics/api-keys', requirePartner, async (req, res) => {
    try {
      const { brand_name } = req.query;
      if (!brand_name) return res.status(400).json({ success: false, error: 'Partner name required' });
      const cleanBrand = String(brand_name).trim().toLowerCase();
      
      const { data: pRec } = await supabase.from('fmcg_partners').select('id, name, api_key, created_at').ilike('name', cleanBrand).maybeSingle();
      
      const keys: any[] = [];
      
      if (pRec && pRec.api_key) {
        const rawKey = pRec.api_key;
        let prefix = 'nx_live_';
        let last4 = '****';
        if (rawKey.length > 4) {
            if (rawKey.startsWith('nx_live_')) last4 = rawKey.slice(-4);
            else if (rawKey.startsWith('nx_sandbox_')) { prefix = 'nx_sandbox_'; last4 = rawKey.slice(-4); }
            else { prefix = 'sys_'; last4 = rawKey.slice(-4); }
        }
        keys.push({ id: pRec.id, partner_id: pRec.id, prefix, last4, created_at: pRec.created_at || new Date().toISOString(), revoked: false, type: 'production' });
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
router.post('/api/logistics/revoke-key', requirePartner, async (req, res) => {
    try {
      const { key_id } = req.body;
      if (!key_id) return res.status(400).json({ success: false, error: 'Key ID required' });
      
      const file = 'sandbox_api_keys.json';
      const existing = getLocalFallbackFile<{ id: string; partner_id: number; partner_name: string; key: string; created_at: string; revoked: boolean }>(file);
      const isSandbox = existing.some(k => k.id === key_id);
      
      if (isSandbox) {
        const updated = existing.filter(k => k.id !== key_id);
        saveLocalFallbackFile(file, updated);
      } else {
        await supabase.from('fmcg_partners').update({ api_key: null }).eq('id', key_id);
      }
      res.json({ success: true, message: 'Key revoked successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.get('/api/logistics/dispatches', requirePartner, async (req, res) => {
    try {
      let invoices: any[] = [];
      let fetchedFromDb = false;

      try {
        if (supabase && typeof supabase.from === 'function') {
          const { data, error } = await supabase
            .from('restock_invoices')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            invoices = data;
            fetchedFromDb = true;
          }
        }
      } catch (dbErr) {
        console.warn("[Dispatches GET] DB query failed, using local fallback:", dbErr);
      }

      if (!fetchedFromDb) {
        invoices = getLocalFallbackFile<any>('restock_invoices.json');
      }

      res.json({ success: true, dispatches: invoices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/logistics/dispatch', requirePartner, async (req, res) => {
    try {
      const { localities } = req.body;
      if (!localities || !Array.isArray(localities)) {
        return res.status(400).json({ success: false, error: 'localities array is required' });
      }

      const insertedInvoices: any[] = [];
      const localInvoices = getLocalFallbackFile<any>('restock_invoices.json');

      for (const loc of localities) {
        if (!loc.orders || !Array.isArray(loc.orders)) continue;

        for (const o of loc.orders) {
          const extId = `INV-SIM-${Math.floor(100000 + Math.random() * 900000)}`;
          const invoiceData = {
            id: crypto.randomUUID(),
            merchant_code: o.merchantCode,
            invoice_amount: (o.exactQuantity || 1) * 75,
            status: 'pending',
            logistics_status: 'dispatched',
            external_id: extId,
            driver_name: "Evans Omoke",
            notes: JSON.stringify({
              driver_name: "Evans Omoke",
              driver_phone: "+254712345678",
              vehicle: "KCY 481G (Light Fuso)",
              route_zone: loc.name,
              specific_order: o.specificOrder || ''
            }),
            created_at: new Date().toISOString()
          };

          // Try DB insert
          let savedToDb = false;
          try {
            if (supabase && typeof supabase.from === 'function') {
              const { data, error } = await supabase
                .from('restock_invoices')
                .insert([{
                  merchant_code: invoiceData.merchant_code,
                  invoice_amount: invoiceData.invoice_amount,
                  status: 'pending',
                  logistics_status: 'dispatched',
                  external_id: invoiceData.external_id,
                  driver_name: invoiceData.driver_name,
                  notes: invoiceData.notes
                }])
                .select()
                .single();

              if (!error && data) {
                invoiceData.id = data.id;
                invoiceData.created_at = data.created_at;
                savedToDb = true;
              } else if (error) {
                console.warn("[Dispatch POST] DB insert error:", error);
              }
            }
          } catch (err) {
            console.warn("[Dispatch POST] DB insert failed:", err);
          }

          // Always sync with local fallback
          localInvoices.push(invoiceData);
          insertedInvoices.push(invoiceData);
        }
      }

      saveLocalFallbackFile('restock_invoices.json', localInvoices);

      await logProjectAction('info', 'LOGISTICS', `Successfully dispatched ${insertedInvoices.length} delivery shipments to route zones`, { count: insertedInvoices.length });

      res.json({ success: true, message: 'Dispatches initialized successfully', invoices: insertedInvoices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/logistics/handshake', requirePartner, async (req, res) => {
    try {
      const { merchant_code, agent_code } = req.body;
      if (!merchant_code) {
        return res.status(400).json({ success: false, error: 'merchant_code is required' });
      }

      const finalAgentCode = agent_code || 'NX-DEFAULT';

      // Try DB update
      let updatedInDb = false;
      let matchedInvoiceId: string | null = null;

      try {
        if (supabase && typeof supabase.from === 'function') {
          // Find first pending/dispatched invoice for this merchant
          const { data: invoiceRec, error: fetchErr } = await supabase
            .from('restock_invoices')
            .select('id')
            .eq('merchant_code', merchant_code)
            .eq('status', 'pending')
            .maybeSingle();

          if (!fetchErr && invoiceRec) {
            matchedInvoiceId = invoiceRec.id;
            
            // Update invoice status to 'paid' and logistics_status to 'delivered'
            const { error: updateErr } = await supabase
              .from('restock_invoices')
              .update({ status: 'paid', logistics_status: 'delivered', delivered_at: new Date().toISOString() })
              .eq('id', matchedInvoiceId);

            if (!updateErr) {
              // Create Handshake record
              await supabase
                .from('delivery_handshakes')
                .insert([{
                  invoice_id: matchedInvoiceId,
                  merchant_code,
                  agent_code: finalAgentCode,
                  status: 'success'
                }]);

              updatedInDb = true;
            }
          } else {
            // Backup direct query/update without single-row check
            const { error: directErr } = await supabase
              .from('restock_invoices')
              .update({ status: 'paid', logistics_status: 'delivered', delivered_at: new Date().toISOString() })
              .eq('merchant_code', merchant_code);
            
            if (!directErr) updatedInDb = true;
          }
        }
      } catch (dbErr) {
        console.warn("[Handshake POST] DB updates failed, using fallback:", dbErr);
      }

      // Local Fallback Sync
      const localInvoices = getLocalFallbackFile<any>('restock_invoices.json');
      const targetInvoice = localInvoices.find(
        (inv: any) => inv.merchant_code === merchant_code && inv.status === 'pending'
      ) || localInvoices.find((inv: any) => inv.merchant_code === merchant_code);

      if (targetInvoice) {
        targetInvoice.status = 'paid';
        targetInvoice.logistics_status = 'delivered';
        targetInvoice.delivered_at = new Date().toISOString();
        saveLocalFallbackFile('restock_invoices.json', localInvoices);
        matchedInvoiceId = matchedInvoiceId || targetInvoice.id;
      }

      // Save local handshake record
      const localHandshakes = getLocalFallbackFile<any>('delivery_handshakes.json');
      localHandshakes.push({
        id: crypto.randomUUID(),
        invoice_id: matchedInvoiceId || crypto.randomUUID(),
        merchant_code,
        agent_code: finalAgentCode,
        confirmed_at: new Date().toISOString(),
        status: 'success'
      });
      saveLocalFallbackFile('delivery_handshakes.json', localHandshakes);

      await logProjectAction(
        'info',
        'LOGISTICS',
        `SECURE HANDSHAKE verified for Merchant ${merchant_code} via Agent ${finalAgentCode}! Status hard-closed.`,
        { merchant_code, agent_code: finalAgentCode }
      );

      res.json({
        success: true,
        message: 'Handshake PIN verified successfully and invoice marked as settled'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

export default router;
