import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables missing.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function sha256(plain: string): string {
  return crypto.createHash('sha256').update(plain.trim()).digest('hex');
}

async function run() {
  console.log("Starting portal test account seeding...");

  const testPassword = 'password123';
  const hashedPass = sha256(testPassword);

  // 1. FMCG: Unilever
  console.log("\n--- Seeding FMCG (Unilever) ---");
  // Clean up any other "Unilever " (with trailing space) or "Unilever"
  const { data: existingUnilever } = await supabase
    .from('fmcg_partners')
    .select('id')
    .or('name.eq.Unilever,name.eq."Unilever "')
    .maybeSingle();

  let unileverId = existingUnilever?.id;

  const unileverData: any = {
    name: 'Unilever',
    contact: 'formidablefoe254@gmail.com',
    active: true,
    dashboard_password: hashedPass,
    partner_type: 'fmcg',
    category: 'Partner'
  };

  let fmcgErr: any = null;
  if (unileverId) {
    const { error } = await supabase
      .from('fmcg_partners')
      .update(unileverData)
      .eq('id', unileverId);
    fmcgErr = error;
  } else {
    const { data: inserted, error } = await supabase
      .from('fmcg_partners')
      .insert([unileverData])
      .select('id')
      .single();
    fmcgErr = error;
    if (inserted) unileverId = inserted.id;
  }

  if (fmcgErr) {
    console.error("Error upserting Unilever in fmcg_partners:", fmcgErr.message);
  } else {
    console.log("✅ Unilever successfully upserted in fmcg_partners. ID:", unileverId);
  }

  // 2. Partner: DHL Express
  console.log("\n--- Seeding Partner (DHL Express) ---");
  const { data: existingDHL } = await supabase
    .from('fmcg_partners')
    .select('id')
    .eq('name', 'DHL Express')
    .maybeSingle();

  let dhlId = existingDHL?.id;

  const dhlData: any = {
    name: 'DHL Express',
    contact: 'partner@nxnetwork.com',
    active: true,
    dashboard_password: hashedPass,
    partner_type: 'fmcg',
    category: 'Partner'
  };

  let partnerErr: any = null;
  if (dhlId) {
    const { error } = await supabase
      .from('fmcg_partners')
      .update(dhlData)
      .eq('id', dhlId);
    partnerErr = error;
  } else {
    const { data: inserted, error } = await supabase
      .from('fmcg_partners')
      .insert([dhlData])
      .select('id')
      .single();
    partnerErr = error;
    if (inserted) dhlId = inserted.id;
  }

  if (partnerErr) {
    console.error("Error upserting DHL Express in fmcg_partners:", partnerErr.message);
  } else {
    console.log("✅ DHL Express successfully upserted in fmcg_partners. ID:", dhlId);
  }

  // 3. Hub Merchant: 254722222222 (M222222)
  console.log("\n--- Seeding Hub Merchant ---");
  const hubPhone = '254722222222';
  const hubCode = 'M222222';

  const { data: existingHub } = await supabase
    .from('users')
    .select('id')
    .eq('phone', hubPhone)
    .maybeSingle();

  const hubId = existingHub?.id || 'd3375f51-f7c9-4912-b036-9f276edcf518';

  const hubUserData = {
    id: hubId,
    phone: hubPhone,
    name: 'Nairobi Central Hub',
    role: 'merchant',
    franchise_tier: 'HUB',
    tier: 'HUB',
    merchant_code: hubCode,
    status: 'active',
    dashboard_password: hashedPass,
    nx_balance: 10000,
    language: 'en'
  };

  const { error: hubErr } = await supabase
    .from('users')
    .upsert(hubUserData, { onConflict: 'id' });

  if (hubErr) {
    console.error("Error upserting Hub User in users table:", hubErr.message);
  } else {
    console.log("✅ Hub Merchant successfully upserted in users table.");
  }

  // Ensure also inside merchant_margins
  const { error: marginErr } = await supabase
    .from('merchant_margins')
    .upsert({ merchant_code: hubCode, gross_margin: 15000 }, { onConflict: 'merchant_code' });

  if (marginErr) {
    console.error("Error upserting Hub Merchant margins:", marginErr.message);
  } else {
    console.log("✅ Hub Merchant margins successfully seeded.");
  }

  // 4. Update local onboarding_db.json
  console.log("\n--- Seeding Local onboarding_db.json ---");
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const onboardingDbPath = path.join(dataDir, 'onboarding_db.json');
  let currentDb: any = { whitelist: [], approvals: [], audit_logs: [] };

  if (fs.existsSync(onboardingDbPath)) {
    try {
      currentDb = JSON.parse(fs.readFileSync(onboardingDbPath, 'utf8'));
    } catch (e) {
      console.warn("Failed to read existing onboarding_db.json, recreating.");
    }
  }

  // Helper to upsert whitelist
  const upsertWhitelist = (email: string, brandName: string, portal: 'fmcgs' | 'partners') => {
    const idx = currentDb.whitelist.findIndex((w: any) => w.email.toLowerCase() === email.toLowerCase());
    const entry = {
      id: `wl-${brandName.toLowerCase().replace(/\s+/g, '-')}`,
      email,
      brand_name: brandName,
      portal,
      active: true,
      created_at: new Date().toISOString()
    };
    if (idx >= 0) {
      currentDb.whitelist[idx] = entry;
    } else {
      currentDb.whitelist.push(entry);
    }
  };

  // Helper to upsert approvals
  const upsertApproval = (partnerId: string | number, email: string, companyName: string) => {
    const idx = currentDb.approvals.findIndex((a: any) => a.email.toLowerCase() === email.toLowerCase());
    const entry = {
      id: `app-${companyName.toLowerCase().replace(/\s+/g, '-')}`,
      partner_id: String(partnerId),
      email,
      companyName,
      status: 'approved',
      created_at: new Date().toISOString()
    };
    if (idx >= 0) {
      currentDb.approvals[idx] = entry;
    } else {
      currentDb.approvals.push(entry);
    }
  };

  upsertWhitelist('formidablefoe254@gmail.com', 'Unilever', 'fmcgs');
  upsertWhitelist('partner@nxnetwork.com', 'DHL Express', 'partners');

  upsertApproval(unileverId, 'formidablefoe254@gmail.com', 'Unilever');
  upsertApproval(dhlId, 'partner@nxnetwork.com', 'DHL Express');

  fs.writeFileSync(onboardingDbPath, JSON.stringify(currentDb, null, 2), 'utf8');
  console.log("✅ Local onboarding_db.json updated successfully.");

  console.log("\n🎉 Portal Seeding complete! All test accounts are ready for use.");
  console.log("Credentials Summary:");
  console.log("1. FMCG PORTAL:   Brand: Unilever      / Email: formidablefoe254@gmail.com / Password: password123");
  console.log("2. PARTNER PORTAL: Brand: DHL Express   / Email: partner@nxnetwork.com      / Password: password123");
  console.log("3. HUB PORTAL:     Phone: 254722222222 / Merchant Code: M222222           / Password: password123");
}

run().catch(err => {
  console.error("Execution failed:", err);
});
