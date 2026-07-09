import { createClient } from '@supabase/supabase-js';
import { merchantFinalise } from './src/services/ussd/db';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, key);

async function run() {
  console.log("Querying transaction NX5L3O4N...");
  const { data: txn, error: queryErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('transaction_code', 'NX5L3O4N')
    .single();

  if (queryErr) {
    console.error("Query failed:", queryErr);
    return;
  }

  console.log("Found transaction in database:", txn);

  console.log(`Invoking merchantFinalise on transaction ID: ${txn.id}...`);
  const success = await merchantFinalise(txn);

  console.log(`\n===========================================`);
  console.log(`Merchant finalise result success:`, success);
  console.log(`===========================================`);

  // Query transaction again to see status
  const { data: finalTxn } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', txn.id)
    .single();
    
  console.log("Final transaction state in database:", finalTxn);
}

run();
