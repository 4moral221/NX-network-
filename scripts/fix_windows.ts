import { supabase } from '../src/lib/supabase';

async function fixBatchWindows() {
  console.log('Fixing window_end for seeded batches...');
  const windowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('restock_batches')
    .update({ window_end: windowEnd })
    .in('sku_code', ['ML', 'FL', 'SG'])
    .eq('status', 'open');

  if (error) console.error('Error fixing windows:', error);
  else console.log('Windows updated to 48h from now.');
}

fixBatchWindows();
