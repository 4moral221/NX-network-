
const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';

async function check() {
  const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
  const response = await fetch(`https://api.vercel.com/v9/projects`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json() as any;
  console.log(JSON.stringify(data, null, 2));
}
check();
