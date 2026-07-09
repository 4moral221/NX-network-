import { supabase } from '../src/lib/supabase';

async function seedBatches() {
  console.log('Seeding simulated batches (minimal)...');

  const now = new Date();
  const mockBatches = [
    {
      sku_code: 'ML',
      total_quantity: 1500,
      merchant_count: 12,
      status: 'open',
      normal_price: 65,
      offered_price: 60
    },
    {
      sku_code: 'FL',
      total_quantity: 450,
      merchant_count: 8,
      status: 'open',
      normal_price: 180,
      offered_price: 170
    },
    {
      sku_code: 'SG',
      total_quantity: 800,
      merchant_count: 15,
      status: 'open',
      normal_price: 150,
      offered_price: 140
    }
  ];

  for (const b of mockBatches) {
    const { data, error } = await supabase.from('restock_batches').insert(b).select();
    if (error) {
      console.error(`Error seeding batch ${b.sku_code}:`, error);
    } else {
      console.log(`Seeded batch: ${b.sku_code} (ID: ${data[0].id})`);
    }
  }
}

seedBatches();
