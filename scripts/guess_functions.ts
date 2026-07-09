import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!);

async function findFunctions() {
  const { data, error } = await supabase.from('pg_proc').select('proname').limit(10);
  console.log('Functions from pg_proc:', data, error?.message);
}
findFunctions();
