import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';

const VERCEL_TEAM_TOKEN = 'vcp_6GPaUnX6ipxzyQoG3d53Hh1v4yCL2CKodiMfRWGtf59RkYODGD13IY5b';
const VERCEL_ORG_ID = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

const portals = {
  landing: "prj_zeO2RO4kwXAitTBgRfk6eieLD7a3"
};

try {
  if (fs.existsSync('.vercel')) fs.rmSync('.vercel', { recursive: true, force: true });
  
  execSync(`npx vercel pull --yes --environment=production --token=${VERCEL_TEAM_TOKEN}`, {
      env: { ...process.env, VERCEL_ORG_ID, VERCEL_PROJECT_ID: portals.landing },
      stdio: 'inherit'
  });
  console.log("Pulled successfully");
} catch(e) {
  console.error("Error pulling", e.message);
}
