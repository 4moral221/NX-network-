import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://balrpczytusvzzquzqob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== DIAGNOSTICS STARTED ===");
  try {
    // 1. Fetch fmcg_partners
    const { data: fmcgPartners, error: fmcgError } = await supabase.from('fmcg_partners').select('*');
    console.log(`[FMCG Partners] Total: ${fmcgPartners?.length || 0}`, fmcgError || '');
    if (fmcgPartners && fmcgPartners.length > 0) {
      console.log('Sample fmcg_partners:', fmcgPartners.slice(0, 3));
    }

    // 2. Fetch partners
    const { data: partners, error: partnersError } = await supabase.from('partners').select('*');
    console.log(`[Partners] Total: ${partners?.length || 0}`, partnersError || '');
    if (partners && partners.length > 0) {
      console.log('Sample partners:', partners.slice(0, 3));
    }

    // 3. Fetch current API keys
    const { data: apiKeys, error: keysError } = await supabase.from('api_keys').select('*').limit(3);
    console.log(`[API Keys] Sample:`, apiKeys, keysError || '');

    // 4. Fetch delivery agents
    const { data: deliveryAgents, error: agentsError } = await supabase.from('delivery_agents').select('*').limit(3);
    console.log(`[Delivery Agents] Sample:`, deliveryAgents, agentsError || '');

    // 5. Check what happens if we search for a brand manually
    if (fmcgPartners && fmcgPartners.length > 0) {
      const p = fmcgPartners[0];
      console.log(`Testing key generation sequence for: ${p.name}`);
      const cleanBrand = p.name.trim();
      const { data: pRec, error: pRecErr } = await supabase.from('partners').select('id, user_id')
        .or(`company_name.ilike."${cleanBrand}",company_name.ilike."${cleanBrand} %",company_name.ilike."%${cleanBrand}%"`)
        .maybeSingle();
      console.log('Matched partners record:', pRec, pRecErr || '');
    }

  } catch (e: any) {
    console.error('Fatal Error during diagnostics:', e);
  }
}

run();
