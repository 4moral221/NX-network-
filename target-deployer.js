import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';

const VERCEL_TEAM_TOKEN = 'vcp_2AFsqIB9f9xrPJ2T7FIeIqVpXf5AuOas1Fg6Uk13YQDTcHHSOv0DIyAn';
const VERCEL_ORG_ID = "team_zEeC9fTESHnDu1Qe6FF4xyBA";

const portals = {
  admin: "prj_JpldBwlqpU9Bpeb46MbKfNuZDC7C",
  landing: "prj_zeO2RO4kwXAitTBgRfk6eieLD7a3",
  pwa: "prj_NsMSeZbYgwaEquE39Pcy8vYqnSIq",
  merchant: "prj_ytyWgmVDQzwDg9kt4J6A4RQ1bElB",
  fmcg: "prj_WAgU6jNfRjHLKZOmgwKuaYDAN0Ee",
  partners: "prj_FTTAQ2uTnHcMR3Jtw9QwCQi2M613",
};

const target = process.argv[2];

if (!target || !portals[target]) {
  console.error(`Error: Invalid or missing target. Choose one of: ${Object.keys(portals).join(', ')}`);
  process.exit(1);
}

const projectId = portals[target];

console.log(`---------------------------------------------------`);
console.log(`Deploying target: [${target.toUpperCase()}]`);
console.log(`Project ID: ${projectId}`);
console.log(`---------------------------------------------------`);

let originalVercelConfig = '';
const hasVercelJson = fs.existsSync('vercel.json');
if (hasVercelJson) {
  originalVercelConfig = fs.readFileSync('vercel.json', 'utf8');
}

try {
  // If the target is landing (static-only), write a pure frontend static-routing vercel.json
  if (target === 'landing') {
    const staticConfig = {
      version: 2,
      cleanUrls: true,
      routes: [
        {
          handle: "filesystem"
        },
        {
          src: "/(.*)",
          dest: "dist/index.html"
        }
      ]
    };
    fs.writeFileSync('vercel.json', JSON.stringify(staticConfig, null, 2));
    console.log("Configuring a pure-static frontend vercel.json for the [LANDING] deployment...");
  }

  // Reset .vercel folder for target mapping
  if (fs.existsSync('.vercel')) {
    fs.rmSync('.vercel', { recursive: true, force: true });
  }
  fs.mkdirSync('.vercel');
  fs.writeFileSync('.vercel/project.json', JSON.stringify({
    orgId: VERCEL_ORG_ID,
    projectId: projectId
  }));

  const command = `npx vercel deploy . --prod --yes --force ` + 
    `--token=${VERCEL_TEAM_TOKEN} ` +
    `--build-env VITE_APP_TARGET=${target} ` +
    `--build-env VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL} ` +
    `--build-env VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY} ` +
    `--env SUPABASE_URL=${process.env.VITE_SUPABASE_URL} ` +
    `--env VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL} ` +
    `--env VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY}`;
  
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
  process.exit(1);
} finally {
  if (hasVercelJson) {
    fs.writeFileSync('vercel.json', originalVercelConfig);
    console.log("Restored original vercel.json configuration.");
  } else if (fs.existsSync('vercel.json')) {
    fs.rmSync('vercel.json');
  }
}
