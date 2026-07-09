const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function check() {
  const p1 = await (await fetch(`https://api.vercel.com/v9/projects/nx-admin/domains?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  
  const p2 = await (await fetch(`https://api.vercel.com/v9/projects/nx-network-landing/domains?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })).json();
  
  console.log("=== nx-admin DOMAINS ===");
  console.log(JSON.stringify(p1, null, 2));
  
  console.log("=== nx-network-landing DOMAINS ===");
  console.log(JSON.stringify(p2, null, 2));
}
check();
