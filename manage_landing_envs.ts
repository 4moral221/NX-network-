const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
const projectId = 'prj_XnJz5A6skW6HCKEvAz6JPkqiUnO9'; // nx-network-landing

async function run() {
  const r = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json() as any;
  if (!data.envs) {
    console.log(data);
    return;
  }

  for (const env of data.envs) {
    console.log(`Deleting env: ${env.key} (ID: ${env.id})`);
    const delRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${env.id}?teamId=${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Delete status: ${delRes.status}`);
  }
}
run();
