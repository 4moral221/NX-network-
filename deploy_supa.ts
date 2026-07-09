import { exec } from 'child_process';
import process from 'process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_600a2bbf4487f6496c0e19078aa33453fef02e13';

console.log("Linking Supabase Project...");
exec('npx supabase link --project-ref balrpczytusvzzquzqob -p "Password123!"', (err, stdout, stderr) => {
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
  if (err) {
    console.error('Error linking:', err);
  }
  
  console.log("Deploying Supabase Edge Functions...");
  exec('npx supabase functions deploy --project-ref balrpczytusvzzquzqob', (err2, stdout2, stderr2) => {
    console.log('stdout2:', stdout2);
    console.log('stderr2:', stderr2);
    if (err2) {
      console.error('Error deploying functions:', err2);
    }
  });
});
