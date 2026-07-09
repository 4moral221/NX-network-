import { createClient } from '@supabase/supabase-js';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, key);

async function run() {
  console.log("Querying database tables via PostgREST catalog endpoints...");
  try {
    // PostgREST exposes the schema description at the root / checkpoint.
    // Let's query information_schema or a standard view we have SELECT rights on.
    const { data: tables, error } = await supabase
      .from('partners')
      .select('company_name')
      .limit(1);
    
    console.log("Partners table select test:", { data: tables, error: error?.message });

    // Let's try querying information_schema.tables if possible
    // Note: PostgREST doesn't always expose information_schema by default.
    // Let's try or query several standard tables to see what exists.
    const tablesToTry = [
      'delivery_agents',
      'delivery_handshakes',
      'project_logs',
      'users',
      'api_keys',
      'partners',
      'fmcg_partners',
      'restock_invoices',
      'restock_batches',
      'restock_batch_offers',
      'merchant_inventory',
      'transactions'
    ];

    console.log("Probing table existence...");
    for (const t of tablesToTry) {
      const { error: queryErr } = await supabase.from(t).select('*').limit(1);
      if (queryErr) {
        console.log(`  - ${t}: ❌ ${queryErr.message} (Code: ${queryErr.code})`);
      } else {
        console.log(`  - ${t}: ✅ EXISTS`);
      }
    }

  } catch (e: any) {
    console.error("Failed to query catalog:", e.message);
  }
}

run();
