import { supabase } from '../src/lib/supabase';

async function checkBatches() {
  console.log('Checking restock_batches table...');
  const { data: batches, error } = await supabase
    .from('restock_batches')
    .select('*');

  if (error) {
    console.error('Error fetching batches:', error);
  } else {
    console.log(`Found ${batches?.length || 0} batches total.`);
    if (batches && batches.length > 0) {
      console.log('First few batches:', batches.slice(0, 5).map(b => ({
        id: b.id,
        sku: b.sku_code,
        status: b.status,
        qty: b.total_qty || b.total_quantity,
        window: b.window_end
      })));
    }
  }

  console.log('\nChecking restock_requests with batch_id...');
  const { data: reqs, error: rError } = await supabase
    .from('restock_requests')
    .select('id, batch_id, status, sku_code')
    .not('batch_id', 'is', null);

  if (rError) {
    console.error('Error fetching requests:', rError);
  } else {
    console.log(`Found ${reqs?.length || 0} requests with batch_id.`);
    if (reqs && reqs.length > 0) {
      console.log('Sample requests:', reqs.slice(0, 5));
    }
  }
}

checkBatches();
