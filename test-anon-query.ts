import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "", 
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function testQuery() {
  const code = "M470203";
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("merchant_code", code);
  
  console.log("Anon key query for merchant code M470203:", data, error);
}

testQuery();
