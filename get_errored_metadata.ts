const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function check() {
  const deploymentsRes = await fetch(`https://api.vercel.com/v6/deployments?teamId=${teamId}&limit=30`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await deploymentsRes.json() as any;
  const landingD = data.deployments ? data.deployments.find((d: any) => d.name === 'nx-network-landing' && d.state === 'ERROR') : null;
  if (!landingD) {
    console.log("No errored landing deployment found in recent list.");
    return;
  }
  
  console.log(`Landing deployment id: ${landingD.uid}`);
  const r = await fetch(`https://api.vercel.com/v13/deployments/${landingD.uid}?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log(`Status: ${r.status}`);
  const detail = await r.json();
  console.log(JSON.stringify(detail, null, 2));
}
check();
