import { supabase } from '../src/lib/supabase';

async function seedCoreSKUs() {
  console.log('Seeding 5 core SKUs (matching portal meta)...');

  const skus = [
    { sku: 'ML', name: 'Fresh Milk', category: 'Dairy' },
    { sku: 'BR', name: 'Premium Bread', category: 'Bakery' },
    { sku: 'F', name: 'Maize Flour', category: 'Grains' },
    { sku: 'SG', name: 'White Sugar', category: 'Sweeteners' },
    { sku: 'CO', name: 'Cooking Oil', category: 'Fats' }
  ];

  for (const s of skus) {
    await supabase.from('nx_products').upsert({
      sku: s.sku,
      name: s.name,
      category: s.category,
      normalized_name: s.name.toLowerCase()
    }, { onConflict: 'sku, name' });

    await supabase.from('sku_catalog').upsert({
      sku_code: s.sku,
      name_en: s.name,
      name_sw: s.name
    }, { onConflict: 'sku_code' });
    
    console.log(`Seeded: ${s.sku} - ${s.name}`);
  }

  // Create batches for these
  for (const s of skus) {
    const { error } = await supabase.from('restock_batches').insert({
      sku_code: s.sku,
      total_quantity: Math.floor(Math.random() * 1000) + 200,
      merchant_count: Math.floor(Math.random() * 10) + 5,
      status: 'open',
      normal_price: s.sku === 'ML' ? 65 : s.sku === 'BR' ? 60 : s.sku === 'F' ? 180 : s.sku === 'SG' ? 150 : 320,
    });
    if (error) console.error(`Error creating batch for ${s.sku}:`, error);
    else console.log(`Created batch for ${s.sku}`);
  }

  console.log('Core SKUs and Batches seeded.');
}

seedCoreSKUs();
