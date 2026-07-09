const token = process.env.VERCEL_TOKEN;

async function checkTeam() {
  const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
  const url = `https://api.vercel.com/v2/teams/${teamId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
checkTeam();
