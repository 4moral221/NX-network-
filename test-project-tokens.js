
import { execSync } from 'child_process';
import fs from 'fs';

const token1 = 'vcp_6GPaUnX6ipxzyQoG3d53Hh1v4yCL2CKodiMfRWGtf59RkYODGD13IY5b'; // VERCEL_TOKEN
const token2 = 'vcp_0xZ1YR3avAqhQkCqCSuPM8aW3ibfDYL4FLk3iW2bQjaaYjGxnd0gZBQo'; // VERCEL_TEAM_TOKEN

async function run() {
  if (fs.existsSync('.vercel')) fs.rmSync('.vercel', { recursive: true, force: true });
  
  const env = { ...process.env };
  delete env.VERCEL_ORG_ID;
  delete env.VERCEL_TEAM_ID;
  delete env.VERCEL_PROJECT_ID;

  console.log('--- Testing Token 1 (VERCEL_TOKEN) ---');
  try {
    execSync(`npx vercel deploy . --prod --yes --token=${token1}`, { env, stdio: 'inherit' });
  } catch (e) {
    console.log('Token 1 failed');
  }

  console.log('\n--- Testing Token 2 (VERCEL_TEAM_TOKEN) ---');
  try {
    execSync(`npx vercel deploy . --prod --yes --token=${token2}`, { env, stdio: 'inherit' });
  } catch (e) {
    console.log('Token 2 failed');
  }
}

run();
