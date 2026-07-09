import postgres from 'postgres';

const connectionString = 'postgresql://postgres:Password123!@db.balrpczytusvzzquzqob.supabase.co:5432/postgres';

async function run() {
  console.log("Connecting directly via postgres-js to alter 'users' table...");
  try {
    const sql = postgres(connectionString, { ssl: 'require' });
    
    console.log("Checking table constraints and modifying table schema...");
    await sql.unsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;');
    console.log("✅ ALTER TABLE executed successfully!");

    await sql.end();
  } catch (e: any) {
    console.error("❌ Failed to alter table:", e.message, e);
  }
}

run();
