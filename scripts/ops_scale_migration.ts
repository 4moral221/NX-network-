import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
-- 1. Add admin_role to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role text;

-- Update existing admins to be super_admin to preserve their access
UPDATE users SET admin_role = 'super_admin' WHERE is_admin = true AND admin_role IS NULL;

-- 2. Add claimed_by to restock_requests
ALTER TABLE restock_requests ADD COLUMN IF NOT EXISTS claimed_by_email text;

-- 3. Create ops_audit_logs table
CREATE TABLE IF NOT EXISTS ops_audit_logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agent_email text NOT NULL,
    action text NOT NULL,
    target_id text,
    details jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ops_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Ops Logs Access" ON ops_audit_logs;
CREATE POLICY "Public Ops Logs Access" ON ops_audit_logs FOR ALL USING (true) WITH CHECK (true);
`;

async function runMigration() {
  console.log("Applying Ops Scaling Migration...");
  try {
    const res = await fetch('https://api.supabase.com/v1/projects/' + PROJECT_ID + '/database/query', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    if (res.ok) {
      console.log("Migration successful.");
    } else {
      console.error("Migration failed:", await res.text());
    }
  } catch (e) {
    console.error("Network error:", e);
  }
}

runMigration();
