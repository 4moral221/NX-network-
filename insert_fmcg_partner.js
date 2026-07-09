require('dotenv').config();
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://balrpczytusvzzquzqob.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function formatUser() {
  const email = "formidablefoe254@gmail.com";
  const password = "Password123!";
  const brandName = "NX Global HQ";

  // Check if exists
  const { data: existing } = await supabase.from('fmcg_partners').select('*').ilike('name', brandName).maybeSingle();
  if (existing) {
    console.log("Partner already exists, skipping insertion.");
    return;
  }

  // Insert into fmcg_partners
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const { data: fmcgData, error: fmcgErr } = await supabase.from('fmcg_partners').insert([{
    name: brandName,
    contact: email,
    api_key_hash: hash, 
    dashboard_password: hash,
    active: true,
    category: 'Partner'
  }]).select().single();

  if (fmcgErr) {
    console.error("Failed to insert into fmcg_partners:", fmcgErr);
  } else {
    console.log("Successfully inserted into fmcg_partners!");
  }
}

formatUser();
