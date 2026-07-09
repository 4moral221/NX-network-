import { execSync } from 'child_process';

const token = 'sbp_46131940654bf5b7457a6e6db8bbb36099271fae';
const ref = 'balrpczytusvzzquzqob';

console.log("Starting migration push via Supabase CLI...");

try {
  // Push DB changes
  execSync(`npx supabase db push --yes`, {
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: token
    },
    stdio: 'inherit'
  });
  console.log("Migration push completed successfully!");
} catch (e: any) {
  console.error("Migration push failed:", e.message);
}
