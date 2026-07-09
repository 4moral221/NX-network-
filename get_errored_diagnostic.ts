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
  
  const r = await fetch(`https://api.vercel.com/v13/deployments/${landingD.uid}?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const detail = await r.json() as any;
  console.log("ReadyState:", detail.readyState || detail.state);
  console.log("ErrorMessage / Code / Reason:", detail.errorMessage, detail.errorCode, detail.error);
  if (detail.error) {
    console.log("Full error node:", JSON.stringify(detail.error, null, 2));
  }
  if (detail.checksState) {
    console.log("Checks State:", detail.checksState);
  }
}
check();
