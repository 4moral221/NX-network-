import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RAW_PRODUCTS = [
  { sku: "F1", name: "Pembe Maize Flour 2kg", category: "Maize/Wheat Flour" },
  { sku: "F2", name: "Soko Maize Flour 2kg", category: "Maize/Wheat Flour" },
  { sku: "ML1", name: "Brookside Milk 500ml", category: "Milk" },
  { sku: "ML2", name: "KCC Milk 500ml", category: "Milk" },
  { sku: "SG1", name: "Mumias Sugar 1kg", category: "Sugar" },
  { sku: "SG2", name: "Kabras Sugar 1kg", category: "Sugar" },
  { sku: "CO1", name: "Fresh Fri Cooking Oil 1L", category: "Cooking Oil" },
  { sku: "CO2", name: "Salit Cooking Oil 1L", category: "Cooking Oil" },
];

async function seedProducts() {
  console.log("🚀 Seeding product catalog (without embeddings)...");
  
  await supabase.from("nx_products").delete().neq("sku", "XYZ");

  for (const p of RAW_PRODUCTS) {
    console.log(`- Seeding ${p.name}...`);
    try {
      // Vertex AI SDK removed.
      
      const normalized = p.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");

      const { error } = await supabase.from("nx_products").insert({
        sku: p.sku,
        name: p.name,
        normalized_name: normalized,
        category: p.category
      });

      if (error) console.error(`  ❌ Error seeding ${p.sku}:`, error.message);
      else console.log(`  ✅ ${p.sku} seeded.`);
    } catch (err: any) {
      console.error(`  ❌ Failed to seed ${p.sku}:`, err.message);
    }
  }
}

seedProducts();
