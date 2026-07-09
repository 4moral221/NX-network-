const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
const projectId = 'prj_XnJz5A6skW6HCKEvAz6JPkqiUnO9'; // nx-network-landing

async function run() {
  const r = await fetch(`https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json() as any;
  console.log("Team ID:", data.accountId);
  console.log("Web Analytics ID:", data.webAnalytics?.id);
  console.log("Integrations:", JSON.stringify(data.integrations, null, 2));
  
  // Also get the list of integrations on the team if possible
  const url = `https://api.vercel.com/v1/integrations/search?teamId=${teamId}`;
  const r2 = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Search status:", r2.status);
  const data2 = await r2.json();
  console.log("Integrations search output:", JSON.stringify(data2, null, 2));
}
run();
