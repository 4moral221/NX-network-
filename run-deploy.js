
import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';

const VERCEL_TEAM_TOKEN = 'vcp_2AFsqIB9f9xrPJ2T7FIeIqVpXf5AuOas1Fg6Uk13YQDTcHHSOv0DIyAn';
const VERCEL_ORG_ID = "team_zEeC9fTESHnDu1Qe6FF4xyBA";

if (!VERCEL_TEAM_TOKEN) {
  console.error("Error: VERCEL_TEAM_TOKEN is not set.");
  process.exit(1);
}

const portals = {
  admin: "prj_JpldBwlqpU9Bpeb46MbKfNuZDC7C",
  landing: "prj_zeO2RO4kwXAitTBgRfk6eieLD7a3",
  pwa: "prj_NsMSeZbYgwaEquE39Pcy8vYqnSIq",
  merchant: "prj_ytyWgmVDQzwDg9kt4J6A4RQ1bElB",
  fmcg: "prj_WAgU6jNfRjHLKZOmgwKuaYDAN0Ee",
  partners: "prj_FTTAQ2uTnHcMR3Jtw9QwCQi2M613",
};

async function run() {
  for (const [target, projectId] of Object.entries(portals)) {
    console.log(`---------------------------------------------------`);
    console.log(`Deploying ${target} to project_id ${projectId}...`);
    console.log(`---------------------------------------------------`);

    try {
      // Clear .vercel to ensure a fresh link each time
      if (fs.existsSync('.vercel')) {
        fs.rmSync('.vercel', { recursive: true, force: true });
      }
      fs.mkdirSync('.vercel');
      fs.writeFileSync('.vercel/project.json', JSON.stringify({
        orgId: VERCEL_ORG_ID,
        projectId: projectId
      }));

      // Use the Vercel CLI via npx
      const command = `npx vercel deploy . --prod --yes ` + 
        `--token=${VERCEL_TEAM_TOKEN} ` +
        `--build-env VITE_APP_TARGET=${target} ` +
        `--build-env VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL} ` +
        `--build-env VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY} ` +
        `--build-env VITE_GOOGLE_MAPS_PLATFORM_KEY=${process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || ''} ` +
        `--build-env GOOGLE_MAPS_PLATFORM_KEY=${process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || ''} ` +
        `--env SUPABASE_URL=${process.env.VITE_SUPABASE_URL} ` +
        `--env VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL} ` +
        `--env VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY} ` +
        `--env VITE_GOOGLE_MAPS_PLATFORM_KEY=${process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || ''} ` +
        `--env GOOGLE_MAPS_PLATFORM_KEY=${process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || ''}`;
      
      execSync(command, {
        env: {
          ...process.env,
          VERCEL_ORG_ID,
          VERCEL_PROJECT_ID: projectId
        },
        stdio: 'inherit',
      });
      console.log(`Successfully deployed ${target}`);
    } catch (error) {
      console.error(`Failed to deploy ${target}:`, error.message);
    }
  }
}

run();
