const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function check() {
  const url = `https://api.vercel.com/v6/deployments?teamId=${teamId}&limit=30`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json() as any;
  if (data.deployments) {
    console.log("Recent deployments:");
    data.deployments.forEach((d: any) => {
      console.log(`- Project: ${d.name}, State: ${d.state}, Created: ${new Date(d.created).toLocaleTimeString()}, URL: https://${d.url}`);
    });
  } else {
    console.log(data);
  }
}
check();
