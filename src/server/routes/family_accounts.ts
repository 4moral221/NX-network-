import { readFamilyAccounts, writeFamilyAccounts } from "../core";
import express from "express";

const router = express.Router();
router.get('/api/family_accounts', (req, res) => {
  const { parent_phone, family_code, id } = req.query;
  let accounts = readFamilyAccounts();
  if (parent_phone) {
    accounts = accounts.filter(a => String(a.parent_phone) === String(parent_phone));
  }
  if (family_code) {
    accounts = accounts.filter(a => String(a.family_code).toUpperCase() === String(family_code).toUpperCase());
  }
  if (id) {
    accounts = accounts.filter(a => String(a.id) === String(id));
  }
  res.json(accounts);
});
router.post('/api/family_accounts', (req, res) => {
  const { parent_phone, family_code, status, allow_spending } = req.body;
  const accounts = readFamilyAccounts();
  
  if (accounts.some(a => String(a.family_code).toUpperCase() === String(family_code).toUpperCase())) {
    return res.status(400).json({ error: 'Family code already exists' });
  }

  const newAccount = {
    id: 'fam-' + Math.random().toString(36).substring(2),
    parent_phone,
    family_code: family_code.toUpperCase(),
    status: status || 'active',
    allow_spending: allow_spending === true,
    created_at: new Date().toISOString()
  };
  accounts.push(newAccount);
  writeFamilyAccounts(accounts);
  res.json(newAccount);
});
router.put('/api/family_accounts', (req, res) => {
  const { id, parent_phone, family_code } = req.query;
  const updates = req.body;
  const accounts = readFamilyAccounts();
  
  const idx = accounts.findIndex(a => {
    if (id && String(a.id) !== String(id) && String(a.family_code) !== String(id)) return false;
    if (parent_phone && String(a.parent_phone) !== String(parent_phone)) return false;
    if (family_code && String(a.family_code) !== String(family_code)) return false;
    return true;
  });

  if (idx === -1) {
    return res.status(404).json({ error: 'Family account not found' });
  }
  
  accounts[idx] = {
    ...accounts[idx],
    ...updates
  };
  writeFamilyAccounts(accounts);
  res.json(accounts[idx]);
});

export default router;
