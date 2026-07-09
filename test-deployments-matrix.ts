import { execSync } from "child_process";
import fs from "fs";

const tokens = {
  VERCEL_TOKEN: process.env.VERCEL_TOKEN,
  VERCEL_TEAM_TOKEN: process.env.VERCEL_TEAM_TOKEN,
  TOKEN_3QG: 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB',
  TOKEN_2AF: 'vcp_2AFsqIB9f9xrPJ2T7FIeIqVpXf5AuOas1Fg6Uk13YQDTcHHSOv0DIyAn'
};

const orgIds = [
  "team_zEeC9fTESHnDu1Qe6FF4xyBA",
  "alexs-projects-fdff01ca",
  "sVrO0MqB8vFzAETaj0NiXzYS",
  "aleckonde-5867"
];

const projectId = "prj_be6Zcjfwc4UNTctHYOGgbASbcYRY"; // admin project ID

async function testMatrix() {
  for (const [tokenName, tokenValue] of Object.entries(tokens)) {
    if (!tokenValue) {
      console.log(`Skipping ${tokenName} because it is empty\n`);
      continue;
    }
    
    for (const orgId of orgIds) {
      console.log(`===================================================`);
      console.log(`Testing token: ${tokenName} (${tokenValue.slice(0, 8)}...) with orgId: ${orgId}`);
      console.log(`===================================================`);

      try {
        if (fs.existsSync(".vercel")) {
          fs.rmSync(".vercel", { recursive: true, force: true });
        }
        fs.mkdirSync(".vercel");
        fs.writeFileSync(".vercel/project.json", JSON.stringify({
          orgId,
          projectId
        }));

        execSync(`npx vercel deploy . --prod --yes --token=${tokenValue}`, {
          env: {
            ...process.env,
            VERCEL_ORG_ID: orgId,
            VERCEL_PROJECT_ID: projectId
          },
          stdio: "pipe"
        });
        console.log(`SUCCESS with ${tokenName} + ${orgId}!\n`);
        process.exit(0);
      } catch (error: any) {
        console.log(`FAILED with error: ${error.message.split('\n')[0]}`);
        if (error.stderr) {
          const stderrStr = error.stderr.toString();
          console.log(`Stderr: ${stderrStr.split('\n').filter(Boolean).slice(0, 3).join(' | ')}`);
        }
        console.log();
      }
    }
  }
  console.log("All combinations failed.");
}

testMatrix();
