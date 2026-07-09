const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
const projectId = 'prj_XnJz5A6skW6HCKEvAz6JPkqiUnO9'; // nx-network-landing

async function run() {
  const url = `https://api.vercel.com/v9/projects/${projectId}/link?teamId=${teamId}`;
  console.log(`Sending DELETE request to unlink git repository from: ${projectId}`);
  const r = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Response status: ${r.status}`);
  const data = await r.json();
  console.log("Unlink result:", JSON.stringify(data, null, 2));
}
run();
