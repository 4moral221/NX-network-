const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = 'sbp_600a2bbf4487f6496c0e19078aa33453fef02e13';

async function run() {
  const query = `
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `;
  
  console.log("Fetching live tables and RLS status from Supabase API...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (res.ok) {
    const tables = await res.json();
    console.log("=== LIVE PUBLIC TABLES RLS STATUS ===");
    tables.forEach((row: any) => {
      console.log(`Table: ${String(row.tablename).padEnd(30)} | RLS Enabled: ${row.rowsecurity ? '✅ YES' : '❌ NO'}`);
    });
  } else {
    console.error("Error fetching RLS status via API:", await res.text());
  }
}

run();
