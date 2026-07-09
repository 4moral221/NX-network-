const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
const projectId = 'prj_XnJz5A6skW6HCKEvAz6JPkqiUnO9'; // nx-network-landing

async function run() {
  const url = `https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json() as any;
  if (data.deployments) {
    console.log(`Total deployments found for landing: ${data.deployments.length}`);
    const states = {};
    data.deployments.forEach((d: any) => {
      states[d.state] = (states[d.state] || 0) + 1;
    });
    console.log("Deployment states:", states);
    
    const readyOnes = data.deployments.filter((d: any) => d.state === 'READY');
    console.log(`READY deployments count: ${readyOnes.length}`);
    readyOnes.slice(0, 5).forEach((d: any) => {
      console.log(`- READY: ${d.uid}, URL: https://${d.url}, Created: ${new Date(d.created).toLocaleString()}`);
    });
  } else {
    console.log(data);
  }
}
run();
