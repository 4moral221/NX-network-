import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function bootstrapAdmin() {
  const adminEmail = 'formidablefoe254@gmail.com'; // This is hardcoded in the AdminPortal.tsx as super admin
  const adminPhone = '254000000000'; // Default admin phone
  
  console.log(`🚀 Bootstrapping Admin account: ${adminEmail}...`);
  
  try {
    // 1. Create the user record
    const { data: user, error: userErr } = await supabase.from('users').upsert({
      phone: adminPhone,
      name: 'Super Admin',
      role: 'customer',
      email: adminEmail,
      is_admin: true,
      status: 'active'
    }, { onConflict: 'phone' }).select().single();
    
    if (userErr) throw userErr;
    
    console.log(`✅ Admin user record created/verified for phone: ${adminPhone}`);
    console.log(`👉 Now go to the Admin Portal, click "First time? Set up custom password", enter ${adminEmail}, and set your password.`);
    
  } catch (err: any) {
    console.error("❌ Bootstrap failed:", err.message);
  }
}

bootstrapAdmin();
