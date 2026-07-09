import { execSync } from "child_process";
import "dotenv/config";

try {
  const output = execSync(
    'npx vercel logs --project nx-network-admin nx-network-admin.vercel.app --token=vcp_2AFsqIB9f9xrPJ2T7FIeIqVpXf5AuOas1Fg6Uk13YQDTcHHSOv0DIyAn --scope team_zEeC9fTESHnDu1Qe6FF4xyBA | head -n 40', 
    { env: { ...process.env, VERCEL_ORG_ID: "team_zEeC9fTESHnDu1Qe6FF4xyBA", VERCEL_PROJECT_ID: "prj_JpldBwlqpU9Bpeb46MbKfNuZDC7C" } }
  ).toString();
  console.log(output);
} catch (e: any) {
  console.log("Error:", e.message);
  if (e.stdout) console.log("STDOUT:", e.stdout.toString());
  if (e.stderr) console.log("STDERR:", e.stderr.toString());
}

