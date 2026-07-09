import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || "https://balrpczytusvzzquzqob.supabase.co";
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(url, key);

async function check() {
  console.log("Checking tables using service role key...");
  
  const tables = ["partners", "api_keys", "whitelist", "admin_approvals", "ops_audit_logs", "nx_logs"];
  
  for (const table of tables) {
    try {
      const { data, error, status } = await supabase.from(table).select("*").limit(1);
      if (error) {
        console.log(`❌ Table [${table}] returned error:`, error.message, `(Status: ${status})`);
      } else {
        console.log(`✅ Table [${table}] exists! Found rows count:`, data?.length);
      }
    } catch (err: any) {
      console.log(`❌ Exception checking table [${table}]:`, err.message);
    }
  }
}

check();
