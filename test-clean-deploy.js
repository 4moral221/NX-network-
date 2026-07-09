
import { execSync } from 'child_process';
import fs from 'fs';

const token = process.env.VERCEL_TEAM_TOKEN;

async function run() {
  if (fs.existsSync('.vercel')) fs.rmSync('.vercel', { recursive: true, force: true });
  
  const env = {}; // CLEAN ENV
  
  console.log('Testing with clean environment and Token...');
  try {
    // Try to deploy the current directory as a new project
    // I'll name it something unique to avoid collisions
    const name = `test-${Date.now()}`;
    execSync(`npx vercel@39.3.0 deploy . --prod --yes --token=${token} --debug`, { 
        env: { ...env, PATH: process.env.PATH }, 
        stdio: 'inherit' 
    });
    console.log('Success!');
  } catch (e) {
    console.log('Failed');
  }
}

run();
