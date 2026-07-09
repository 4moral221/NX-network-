const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_46131940654bf5b7457a6e6db8bbb36099271fae';

const sql = `
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;
`;

async function main() {
  console.log("Applying alter table directly on Supabase via Management API...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res.ok) {
    console.log('✅ ALTER TABLE executed successfully!');
    const output = await res.json();
    console.log('Response:', output);
  } else {
    console.error('❌ Error executing SQL:', await res.text());
  }
}

main();
