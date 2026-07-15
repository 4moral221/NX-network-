import { supabase, escapeLike, requireAdmin, loadOnboardingDB, saveOnboardingDB, logAudit, WhitelistEntry } from "../core";
import express from "express";

const router = express.Router();
router.get('/api/onboarding/whitelist', requireAdmin, (req, res) => {
    try {
      const db = loadOnboardingDB();
      res.json({ success: true, whitelist: db.whitelist });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/onboarding/whitelist', requireAdmin, (req, res) => {
    try {
      const { email, brand_name, portal } = req.body || {};
      if (!email || !brand_name) {
        return res.status(400).json({ success: false, error: 'Email/domain and brand_name are required' });
      }

      const db = loadOnboardingDB();
      const cleanEmail = email.toLowerCase().trim();
      
      // Prevent duplicates
      if (db.whitelist.some(w => w.email.toLowerCase() === cleanEmail)) {
        return res.status(400).json({ success: false, error: 'This domain or email is already whitelisted' });
      }

      const newEntry: WhitelistEntry = {
        id: 'wl-' + Date.now(),
        email: cleanEmail,
        brand_name: brand_name.trim(),
        portal: (portal === 'partners' || portal === 'fmcgs') ? portal : 'fmcgs',
        active: true,
        created_at: new Date().toISOString()
      };

      db.whitelist.unshift(newEntry);
      saveOnboardingDB(db);
      logAudit(`Added to Whitelist: ${brand_name} (${cleanEmail})`, 'Admin', req);

      res.json({ success: true, entry: newEntry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.delete('/api/onboarding/whitelist/:id?', requireAdmin, (req, res) => {
    try {
      const id = req.params.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }
      const db = loadOnboardingDB();
      const index = db.whitelist.findIndex(w => w.id === id);
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Whitelist entry not found' });
      }

      const removed = db.whitelist.splice(index, 1)[0];
      saveOnboardingDB(db);
      logAudit(`Removed from Whitelist: ${removed.email}`, 'Admin', req);

      res.json({ success: true, removed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.get('/api/onboarding/approvals', requireAdmin, (req, res) => {
    try {
      const db = loadOnboardingDB();
      res.json({ success: true, approvals: db.approvals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.post('/api/onboarding/approve', requireAdmin, async (req, res) => {
    try {
      const { action, approvedBy } = req.body; // action is 'approve' or 'reject'
      const approvalId = req.body.approvalId || req.body.id;
      if (!approvalId || !action) {
        return res.status(400).json({ success: false, error: 'approvalId and action required' });
      }

      const db = loadOnboardingDB();
      const approval = db.approvals.find(a => a.id === approvalId);
      
      if (!approval) {
        return res.status(404).json({ success: false, error: 'Approval record not found' });
      }

      const finalStatus = action === 'approve' ? 'approved' : 'rejected';
      approval.status = finalStatus;
      approval.approved_by = approvedBy || 'Admin';

      // Update in Supabase public.partners status
      if (approval.partner_id) {
        const partnerStatus = action === 'approve' ? 'active' : 'suspended';
        const { error: pErr } = await supabase
          .from('partners')
          .update({ status: partnerStatus })
          .eq('id', approval.partner_id);
          
        if (pErr) console.error("Error updating partner status in Supabase:", pErr.message);

        // Update in fmcg_partners table too for legacy support
        const { error: fmcgErr } = await supabase
          .from('fmcg_partners')
          .update({ active: action === 'approve' })
          .ilike('name', escapeLike(approval.companyName));
          
        if (fmcgErr) console.error("Error updating fmcg_partners in Supabase:", fmcgErr.message);
      }

      saveOnboardingDB(db);
      logAudit(`Approval processed: ${action.toUpperCase()} for ${approval.companyName} (${approval.email})`, approvedBy || 'Admin', req);

      res.json({ success: true, approval });
    } catch (err: any) {
      console.error("Approve error in backend:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
router.get('/api/onboarding/audit_logs', requireAdmin, (req, res) => {
    try {
      const db = loadOnboardingDB();
      res.json({ success: true, audit_logs: db.audit_logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

export default router;
