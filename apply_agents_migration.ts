import * as fs from 'fs';

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = 'sbp_46131940654bf5b7457a6e6db8bbb36099271fae';

async function applySQL() {
  console.log("Reading 20260531000000_agents_and_delivery_handshake.sql...");
  const sql = fs.readFileSync('supabase/migrations/20260531000000_agents_and_delivery_handshake.sql', 'utf8');
  
  console.log("Applying SQL to project database...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  const responseText = await res.text();
  if (res.ok) {
    console.log('SQL applied successfully! Response:', responseText);
  } else {
    console.error('Error applying SQL status:', res.status, 'Body:', responseText);
  }
}

applySQL();
