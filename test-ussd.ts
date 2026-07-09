
import { supabase } from './src/lib/supabase';

async function testRestock() {
  const phoneNumber = '254700000002'; // Assuming this is a merchant
  const text = '2*Pembe 2kg*10';
  
  console.log('--- Testing USSD Restock ---');
  console.log('Input:', text);
  
  // Note: I can't easily hit the live express server from here with a script easily 
  // if it's in a different process, but I can check the database after I simulate the logic.
  // Actually, I'll just check if there's a merchant first.
  
  const { data: user } = await supabase.from('users').select('*').eq('phone', phoneNumber).maybeSingle();
  if (!user) {
    console.log('User not found. Try 254700000001?');
    return;
  }
  
  console.log('User found:', user.name, 'Role:', user.role);
  console.log('Merchant Code:', user.merchant_code);
}

testRestock();
