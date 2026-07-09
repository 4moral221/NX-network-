const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function check() {
  const url = `https://api.vercel.com/v6/deployments?teamId=${teamId}&limit=10`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json() as any;
  if (data.deployments) {
    const latest = data.deployments.find((d: any) => d.name === 'nx-network-landing');
    if (latest) {
      console.log(`Latest Landing Deployment: ${latest.uid}`);
      console.log(`State: ${latest.state}`);
      console.log(`Created: ${new Date(latest.created).toLocaleTimeString()}`);
      console.log(`URL: https://${latest.url}`);
    } else {
      console.log("No landing deployment found in latest 10.");
    }
  } else {
    console.log(data);
  }
}
check();
