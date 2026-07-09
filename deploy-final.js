import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';

const VERCEL_TEAM_TOKEN = 'vcp_1vgGNmkGsLcI6Gipzgyo6r9mOJJdx6N1FPPo9A1CqLrAlsl3KL02Y6Q0';
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID || 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

const portals = {
  fmcg: "prj_WAgU6jNfRjHLKZOmgwKuaYDAN0Ee", // nx-network-fmcg
  partners: "prj_FTTAQ2uTnHcMR3Jtw9QwCQi2M613", // nx-network-partners
  admin: "prj_JpldBwlqpU9Bpeb46MbKfNuZDC7C", // nx-network-admin
  landing: "prj_zeO2RO4kwXAitTBgRfk6eieLD7a3", // nx-network-landing
  pwa: "prj_NsMSeZbYgwaEquE39Pcy8vYqnSIq", // nx-network-pwa
  merchant: "prj_ytyWgmVDQzwDg9kt4J6A4RQ1bElB", // nx-network-merchant
};

const originalEnv = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf-8') : '';

const supabaseUrl = 'https://balrpczytusvzzquzqob.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTUwMDMsImV4cCI6MjA4ODczMTAwM30.C-Fhpl2orwvU_tZVw9SterirPg0PooV5ryxXx3tXFIs';

for (const [target, projectId] of Object.entries(portals)) {
  console.log(`Deploying ${target}...`);
  try {
    if (fs.existsSync('.vercel')) fs.rmSync('.vercel', { recursive: true, force: true });
    fs.mkdirSync('.vercel');
    fs.writeFileSync('.vercel/project.json', JSON.stringify({ orgId: VERCEL_ORG_ID, projectId }));
    
    // Add VERCEL_PROJECT_ID to .env so Vercel CLI reads it
    let tempEnv = originalEnv
      .replace(/VERCEL_ORG_ID=.*\n?/g, '')
      .replace(/VERCEL_PROJECT_ID=.*\n?/g, '')
      .replace(/VITE_SUPABASE_ANON_KEY=.*\n?/g, '')
      .replace(/VITE_SUPABASE_SERVICE_ROLE_KEY=.*\n?/g, '')
      .replace(/SUPABASE_SERVICE_ROLE_KEY=.*\n?/g, '');
    tempEnv += `\nVERCEL_PROJECT_ID=${projectId}\n`;
    tempEnv += `VITE_APP_TARGET=${target}\n`;
    tempEnv += `VITE_SUPABASE_URL=${supabaseUrl}\n`;
    tempEnv += `VITE_SUPABASE_ANON_KEY=${anonKey}\n`;
    fs.writeFileSync('.env', tempEnv);

    const dynamicConfig = {
        version: 2,
        cleanUrls: true,
        rewrites: [
          {
            source: "/api/(.*)",
            destination: "/api"
          },
          {
            source: "/(.*)",
            destination: "/index.html"
          }
        ]
    };
    fs.writeFileSync('vercel.json', JSON.stringify(dynamicConfig, null, 2));
    
    // Execute Vercel Deploy Output
    const childEnv = { ...process.env };
    delete childEnv.VERCEL_ORG_ID;
    delete childEnv.VERCEL_PROJECT_ID;
    
    const resendApiKey = process.env.RESEND_API_KEY || 're_59A5XXNn_NqgD5fVntXhWqWJ9pP361T7Z'; // Default to a standard trial key if not set
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    let extraEnvArgs = '';
    if (['admin', 'partners', 'fmcg'].includes(target)) {
        extraEnvArgs = `--env RESEND_API_KEY=${resendApiKey} --env RESEND_FROM_EMAIL=${resendFromEmail}`;
    }

    execSync(`npx vercel deploy . --prod --yes --force --no-wait --token=${VERCEL_TEAM_TOKEN} --scope=${VERCEL_ORG_ID} --build-env VITE_APP_TARGET=${target} --build-env VITE_SUPABASE_URL=${supabaseUrl} --build-env VITE_SUPABASE_ANON_KEY=${anonKey} --build-env UPSTASH_REDIS_REST_URL=${process.env.UPSTASH_REDIS_REST_URL} --build-env UPSTASH_REDIS_REST_TOKEN=${process.env.UPSTASH_REDIS_REST_TOKEN} --env SUPABASE_URL=${supabaseUrl} --env VITE_SUPABASE_URL=${supabaseUrl} --env VITE_SUPABASE_ANON_KEY=${anonKey} --env UPSTASH_REDIS_REST_URL=${process.env.UPSTASH_REDIS_REST_URL} --env UPSTASH_REDIS_REST_TOKEN=${process.env.UPSTASH_REDIS_REST_TOKEN} ${extraEnvArgs}`, { stdio: 'inherit', env: childEnv });

    
    console.log(`Successfully triggered ${target} redeployment on Vercel.`);
  } catch (e) {
    console.error(`Failed triggers for ${target}:`, e.message);
  }
}

// Restore .env
if (originalEnv) {
    fs.writeFileSync('.env', originalEnv);
} else {
    try {
        fs.unlinkSync('.env');
    } catch (e) {}
}
