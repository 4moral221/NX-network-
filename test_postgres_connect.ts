import postgres from 'postgres';
import * as fs from 'fs';

const connectionString = 'postgresql://postgres:Password123!@db.balrpczytusvzzquzqob.supabase.co:5432/postgres';

async function connect() {
  console.log("Attempting direct PG pooler connection with Password123!...");
  try {
    const sql = postgres(connectionString, { ssl: 'require' });
    const result = await sql`SELECT 1 as connected;`;
    console.log("✅ Direct Postgres Connection SUCCESSFUL! Result:", result);
    
    console.log("Reading delivery agents migration SQL...");
    const migrationSql = fs.readFileSync('supabase/migrations/20260531000000_agents_and_delivery_handshake.sql', 'utf8');
    
    console.log("Applying delivery agents schema directly on PostgreSQL...");
    // Execute SQL as a raw transaction or multi-statement
    await sql.unsafe(migrationSql);
    console.log("✅ Schema applied successfully directly via SQL!");
    
    await sql.end();
  } catch (e: any) {
    console.error("❌ Failed to connect or run SQL:", e.message, e);
  }
}

connect();
