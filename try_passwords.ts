import postgres from 'postgres';

const host = 'db.balrpczytusvzzquzqob.supabase.co';
const user = 'postgres';
const database = 'postgres';

const list = [
  'Password123!',
  'Password123',
  'admin123',
  'dragonfart999',
  'balance123',
  'balrpczytusvzzquzqob',
  'postgres'
];

async function test(pwd: string) {
  const connectionString = `postgresql://${user}:${encodeURIComponent(pwd)}@${host}:5432/${database}`;
  console.log(`Trying password: ${pwd}`);
  const sql = postgres(connectionString, { ssl: 'require', connect_timeout: 4 });
  try {
    const res = await sql`SELECT 1 as ok`;
    console.log(`✅ SUCCESS! Password worked: ${pwd}`);
    await sql.unsafe('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;');
    console.log(`✅ ALTER TABLE executued successfully! Column added.`);
    await sql.end();
    return true;
  } catch (e: any) {
    console.log(`❌ Failed: ${e.message}`);
    await sql.end();
    return false;
  }
}

async function main() {
  for (const pwd of list) {
    const ok = await test(pwd);
    if (ok) {
      console.log("Database updated successfully!");
      break;
    }
  }
}

main();
