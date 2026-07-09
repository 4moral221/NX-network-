const token = process.env.VERCEL_TOKEN;
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function listDeployments() {
  try {
    const res = await fetch(`https://api.vercel.com/v6/deployments?teamId=${teamId}&limit=30`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json() as any;
    if (!data.deployments) {
      console.log("No deployments found or error:", data);
      return;
    }
    console.log("Found", data.deployments.length, "deployments:");
    for (const d of data.deployments) {
      console.log(`- Project: ${d.name} (${d.uid}), State: ${d.state}, Created At: ${new Date(d.created).toISOString()}, URL: ${d.url}`);
    }
  } catch (err: any) {
    console.error("Error listing deployments:", err.message);
  }
}
listDeployments();
