import { supabase } from "./src/server/core";

async function testInsert() {
  const code = "NX" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const payload = {
    transaction_code: code,
    customer_phone: "254123456789",
    merchant_code: "M470203",
    merchant_phone: "254700000000",
    amount: 100,
    nx_redeemed: 0,
    nx_earned: 5,
    status: "awaiting_merchant"
  };

  const { data, error } = await supabase.from("transactions").insert([payload]);
  console.log("Insert result:", data, error);
}

testInsert();
