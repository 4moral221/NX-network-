import { createClient } from "@supabase/supabase-js";

const getEnv = (key: string) => process.env[key] || process.env[`VITE_${key}`] || "";
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://balrpczytusvzzquzqob.supabase.co';
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('users').select('phone').limit(1);
  if (data && data.length) {
    const phone = data[0].phone;
    console.log("Found user:", phone);

    // Call USSD menu
    let text = "2"; // 2 for restock prompt in merchant menu
    
    // Actually, sending '2' assumes they are already past the initial screen. 
    // Wait, the text parameter is cumulative in Africa's Talking (e.g. "2*pembe2kg*70..."). 
    // Oh, text="2*pembe2kg*70, brookside500ml*70, supaloaf400g*5000"
    const orderStr = "2*pembe2kg*70, brookside500ml*70, supaloaf400g*5000";
    
    // First let's check what menu we get
    const r1 = await fetch('http://localhost:3000/api/ussd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'sim2', phoneNumber: phone, text: orderStr })
    });
    console.log("Direct order response:", await r1.text());
  } else {
    console.log("No users found");
  }
}
run();
