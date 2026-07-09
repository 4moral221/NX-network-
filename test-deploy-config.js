
import { execSync } from 'child_process';
import fs from 'fs';

const token = process.env.VERCEL_TEAM_TOKEN;
const userId = "sVrO0MqB8vFzAETaj0NiXzYS";
const projectId = "prj_be6Zcjfwc4UNTctHYOGgbASbcYRY"; // admin

async function test() {
  console.log('Testing with userId as orgId...');
  if (fs.existsSync('.vercel')) fs.rmSync('.vercel', { recursive: true, force: true });
  fs.mkdirSync('.vercel');
  fs.writeFileSync('.vercel/project.json', JSON.stringify({
    orgId: userId,
    projectId: projectId
  }));

  try {
    execSync(`npx vercel deploy . --prod --yes --token=${token}`, { stdio: 'inherit' });
    console.log('Success with userId!');
  } catch (e) {
    console.log('Failed with userId');
    
    console.log('Testing with NO orgId in project.json (just linking)...');
    // Maybe it's a project token and doesn't need orgId? 
    // Unlikely for Vercel CLI, but worth a shot.
  }
}

test();
