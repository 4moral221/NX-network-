import { supabase } from '../src/lib/supabase';

async function simulateDemand() {
  console.log('Simulating demand...');
  
  // 1. Ensure we have some open batches with quantity
  const { data: batch, error: bErr } = await supabase
    .from('restock_batches')
    .insert({
      sku_code: 'ML',
      sku_name: 'Fresh Milk 500ml',
      total_qty: 120, // standardized to total_qty
      merchant_count: 5,
      status: 'open',
      window_end: new Date(Date.now() + 86400000).toISOString(), // 24h from now
      normal_price: 65,
    })
    .select()
    .single();

  if (bErr) {
    console.error('Error creating simulated batch:', bErr);
    // Try total_quantity if total_qty fails
    const { data: batch2, error: bErr2 } = await supabase
      .from('restock_batches')
      .insert({
        sku_code: 'BR',
        sku_name: 'Bread 400g', // Try total_quantity here
        total_quantity: 250,
        merchant_count: 8,
        status: 'open',
        window_end: new Date(Date.now() + 86400000).toISOString(),
        normal_price: 60,
      })
      .select()
      .single();
    
    if (bErr2) {
      console.error('Error creating simulated batch 2:', bErr2);
    } else {
      console.log('Simulated batch 2 created:', batch2.id);
    }
  } else {
    console.log('Simulated batch created:', batch.id);
  }
}

simulateDemand();
