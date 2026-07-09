import fs from 'fs';

const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function check() {
  const p1 = await (await fetch(`https://api.vercel.com/v9/projects/nx-admin?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  
  const p2 = await (await fetch(`https://api.vercel.com/v9/projects/nx-network-landing?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  
  const output: string[] = [];
  const keys = Array.from(new Set([...Object.keys(p1), ...Object.keys(p2)])).sort();
  for (const k of keys) {
    if (JSON.stringify(p1[k]) !== JSON.stringify(p2[k])) {
      output.push(`=== Key: [${k}] ===`);
      output.push(`nx-admin:`);
      output.push(JSON.stringify(p1[k], null, 2));
      output.push(`nx-landing:`);
      output.push(JSON.stringify(p2[k], null, 2));
      output.push(`\n`);
    }
  }
  fs.writeFileSync('project_diff.txt', output.join('\n'));
}
check();
