import postgres from 'postgres';

const poolerUrl = 'postgresql://postgres.balrpczytusvzzquzqob:Password123!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function main() {
  console.log("Connecting to Supabase pooler...");
  const sql = postgres(poolerUrl, { ssl: 'require' });
  try {
    const res = await sql`SELECT 1 as ok`;
    console.log("✅ SUCCESS! Connected to pooler database!");
    console.log("Result:", res);
    
    console.log("Executing ALTER TABLE to add last_transaction_at column...");
    await sql.unsafe('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;');
    console.log("✅ Column added successfully!");
    
    await sql.end();
  } catch (e: any) {
    console.error("❌ Failed to connect to pooler:", e.message, e);
    await sql.end();
  }
}

main();
