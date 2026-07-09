import { supabase } from '../src/lib/supabase';

async function setup() {
  console.log('Setting up broadcasts table...');
  const { error } = await supabase.rpc('query', { 
    query: `
      CREATE TABLE IF NOT EXISTS broadcasts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message TEXT NOT NULL,
        target_segment TEXT,
        delivery_method TEXT,
        sent_by TEXT,
        reach_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'sent',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Add RLS
      ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
      
      -- Simple policy for admin
      CREATE POLICY "Admin can do everything on broadcasts" 
      ON broadcasts FOR ALL 
      TO authenticated
      USING (true)
      WITH CHECK (true);
    ` 
  });

  if (error) {
    if (error.message.includes('function "query" does not exist')) {
        console.warn('RPC "query" not found. This project might not have a direct SQL executor.');
        console.log('Attempting to check if broadcasts exists via standard select...');
        const { error: checkErr } = await supabase.from('broadcasts').select('id').limit(1);
        if (checkErr) {
            console.error('Broadcasts table still missing and cannot be created via RPC.');
        } else {
            console.log('Broadcasts table already exists.');
        }
    } else {
        console.error('Error creating broadcasts table:', error);
    }
  } else {
    console.log('Broadcasts table setup successfully.');
  }
}

setup();
