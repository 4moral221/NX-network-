import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAuth() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('List users error:', error);
    return;
  }
  for (const user of users.users) {
    if (user.email !== 'formidablefoe254@gmail.com') { // assuming this is admin
      console.log(`Deleting auth user: ${user.email}`);
      await supabase.auth.admin.deleteUser(user.id);
    }
  }
}
cleanAuth();
