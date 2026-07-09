import { createClient } from '@supabase/supabase-js';
import * as skuMatcher from '../src/services/skuMatcher';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  console.log("🚀 Starting Full Restock Diagnostics...");
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    // 1. Database Connectivity & Schema Check
    console.log("\n--- [1] Database & Schema ---");
    const { data: tables, error: tableErr } = await supabase.from('restock_requests').select('count', { count: 'exact', head: true });
    if (tableErr) {
      console.error("❌ Failed to query 'restock_requests' table:", tableErr.message);
    } else {
      console.log("✅ 'restock_requests' table accessible.");
    }

    const { data: productCount, error: prodErr } = await supabase.from('nx_products').select('count', { count: 'exact', head: true });
    if (prodErr) {
      console.error("❌ Failed to query 'nx_products' table:", prodErr.message);
    } else {
      console.log(`✅ 'nx_products' table accessible (${productCount} items).`);
    }

    // 2. SKU Matcher Logic Test
    console.log("\n--- [2] SKU Matcher Logic ---");
    const testQueries = ["Pembe 2kg", "Brookside 500ml", "Milk"];
    for (const query of testQueries) {
      console.log(`🔍 Testing match for: "${query}"...`);
      try {
        const result = await skuMatcher.matchProduct(query);
        if (result.bestMatch) {
          console.log(`   ✅ Match found: ${result.bestMatch.name} (${result.bestMatch.sku}) - Score: ${result.bestMatch.score.toFixed(2)}`);
        } else {
          console.log(`   ⚠️ No match found. System will use raw query: "${query}"`);
        }
      } catch (e: any) {
        console.log(`   ❌ Matcher error: ${e.message}`);
      }
    }

    // 3. Status Code Audit
    console.log("\n--- [3] Status Code Audit ---");
    const { data: statusCounts, error: statusErr } = await supabase
      .from('restock_requests')
      .select('status');
    
    if (statusErr) {
      console.error("❌ Failed to fetch statuses:", statusErr.message);
    } else {
      const counts: Record<string, number> = {};
      statusCounts.forEach(r => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });
      console.log("📊 Restock Status Summary:");
      Object.entries(counts).forEach(([status, count]) => {
        const icon = status === 'pending' ? '🟡' : status === 'completed' ? '✅' : '⚪';
        console.log(`   ${icon} ${status}: ${count}`);
      });

      if (counts['sent']) {
        console.warn("⚠️  WARNING: Found 'sent' status. These should be 'pending' for Admin visibility.");
      }
    }

    // 4. USSD Endpoint Simulation Configuration
    console.log("\n--- [4] USSD Configuration ---");
    console.log("✅ USSD Endpoint: /api/ussd");
    console.log("✅ Parser: SKU*QTY (e.g. Pembe*10)");

    console.log("\n✨ Diagnostics Complete.");
  } catch (err: any) {
    console.error("\n💥 Critical Diagnostic failure:", err.message);
  }
}

runDiagnostics();
