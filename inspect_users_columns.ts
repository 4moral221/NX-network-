import { createClient } from '@supabase/supabase-js';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, key);

async function run() {
  console.log("Inspecting columns of 'users' table...");
  const { data: users, error: errU } = await supabase.from('users').select('*').limit(1);
  if (errU) {
    console.error("Error querying 'users':", errU);
  } else {
    console.log("Columns of 'users':", users.length > 0 ? Object.keys(users[0]) : "Empty table");
  }

  console.log("\nInspecting columns of 'users_uuid' table...");
  const { data: usersUuid, error: errUU } = await supabase.from('users_uuid').select('*').limit(1);
  if (errUU) {
    console.error("Error querying 'users_uuid':", errUU);
  } else {
    console.log("Columns of 'users_uuid':", usersUuid.length > 0 ? Object.keys(usersUuid[0]) : "Empty table");
  }
}

run();
