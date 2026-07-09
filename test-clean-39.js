import { execSync } from 'child_process';
import fs from 'fs';

const token = process.env.VERCEL_TOKEN || 'vcp_6GPaUnX6ipxzyQoG3d53Hh1v4yCL2CKodiMfRWGtf59RkYODGD13IY5b';

if (fs.existsSync('.vercel')) fs.rmSync('.vercel', { recursive: true, force: true });

const env = { ...process.env };
delete env.VERCEL_ORG_ID;
delete env.VERCEL_TEAM_ID;
delete env.VERCEL_PROJECT_ID;

console.log('Deploying with vercel@39.3.0 under clean env...');
try {
  execSync(`npx vercel@39.3.0 deploy . --prod --yes --token=${token} --debug`, { env, stdio: 'inherit' });
  console.log('Success!');
} catch (e) {
  console.log('Failed:', e.message);
}
