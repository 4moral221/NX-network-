const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
const projectId = 'prj_XnJz5A6skW6HCKEvAz6JPkqiUnO9'; // nx-network-landing

async function run() {
  const url = `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json() as any;
  if (!data.deployments) {
    console.log(data);
    return;
  }

  // Deployments are in reverse chronological order
  console.log("Timeline of recent 20 deployments:");
  for (let i = 0; i < 20 && i < data.deployments.length; i++) {
    const d = data.deployments[i];
    console.log(`${i}: UID: ${d.uid}, State: ${d.state}, Created: ${new Date(d.created).toLocaleString()}, Creator: ${d.creator.username}`);
  }
}
run();
