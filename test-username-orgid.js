
import { execSync } from 'child_process';
import fs from 'fs';

const token = process.env.VERCEL_TEAM_TOKEN;
const orgId = "aleckonde-5867";
const projectId = "prj_be6Zcjfwc4UNTctHYOGgbASbcYRY";

async function run() {
  if (fs.existsSync('.vercel')) fs.rmSync('.vercel', { recursive: true, force: true });
  
  console.log('Testing with username as orgId...');
  try {
    execSync(`npx vercel deploy . --prod --yes --token=${token}`, { 
        env: { 
            ...process.env, 
            VERCEL_ORG_ID: orgId, 
            VERCEL_PROJECT_ID: projectId 
        }, 
        stdio: 'inherit' 
    });
    console.log('Success!');
  } catch (e) {
    console.log('Failed');
  }
}

run();
