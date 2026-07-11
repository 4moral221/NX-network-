import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || "https://balrpczytusvzzquzqob.supabase.co";
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(url, key);

async function check() {
  console.log("Checking tables using service role key...");
  
  try {
    const { data: users, error: uErr } = await supabase.from("users").select("id, phone, name, role, franchise_tier, email, status");
    console.log("=== USERS ===");
    if (uErr) console.error("Error reading users:", uErr.message);
    else console.log(users);
    
    const { data: partners, error: pErr } = await supabase.from("fmcg_partners").select("id, name, contact, active, category");
    console.log("=== FMCG PARTNERS ===");
    if (pErr) console.error("Error reading fmcg_partners:", pErr.message);
    else console.log(partners);
  } catch (err: any) {
    console.error("Query failed:", err.message);
  }
}

check();
