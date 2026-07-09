const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function run() {
  const dSuccess = await (await fetch(`https://api.vercel.com/v13/deployments/dpl_26JKGW5U3k4r6ZDHcUDU1TJuWJzh?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })).json() as any;

  const dFail = await (await fetch(`https://api.vercel.com/v13/deployments/dpl_E3iYTiuJZ1Z8HfhRPQiaHyakm4B1?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })).json() as any;

  console.log("=== COMPARING DEPLOYMENT CONFIGURATIONS ===");
  const keys = Array.from(new Set([...Object.keys(dSuccess), ...Object.keys(dFail)])).sort();
  for (const k of keys) {
    if (["id", "url", "createdAt", "readyState", "readyAt", "buildingAt", "inspectorUrl", "meta", "routes", "alias", "gitRepo", "aliasAssignedAt"].includes(k)) continue;
    if (JSON.stringify(dSuccess[k]) !== JSON.stringify(dFail[k])) {
      console.log(`Key [${k}]:`);
      console.log(`  Success: ${JSON.stringify(dSuccess[k])}`);
      console.log(`  Fail:    ${JSON.stringify(dFail[k])}`);
    }
  }
}
run();
