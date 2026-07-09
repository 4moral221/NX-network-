import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = 'sbp_600a2bbf4487f6496c0e19078aa33453fef02e13';

async function applySQL() {
  const sql = fs.readFileSync('supabase/migrations/20260612000000_apply_hardened_rls.sql', 'utf8');
  console.log("Applying hardened RLS via Supabase Management API query endpoint...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (res.ok) {
    console.log('✅ RLS SQL applied successfully.');
    const result = await res.json();
    console.log('API Response:', result);
  } else {
    console.error('❌ Error applying SQL:', await res.text());
  }
}
applySQL();
