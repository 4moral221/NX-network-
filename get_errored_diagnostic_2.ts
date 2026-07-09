const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
const deployId = 'dpl_EP7evw5GXqwpvPje91sJ54WyePxe';

async function check() {
  const r = await fetch(`https://api.vercel.com/v13/deployments/${deployId}?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const detail = await r.json() as any;
  console.log("State:", detail.state || detail.readyState);
  console.log("ErrorMessage / Code / Reason:", detail.errorMessage, detail.errorCode, detail.error);
  if (detail.error) {
    console.log("Full error node:", JSON.stringify(detail.error, null, 2));
  }
}
check();
