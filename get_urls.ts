const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
async function getUrls() {
  const res = await fetch('https://api.vercel.com/v9/projects?teamId=' + teamId, { headers: { Authorization: 'Bearer ' + token } });
  const data = await res.json();
  if (data.projects) {
    data.projects.forEach((p: any) => console.log(`${p.name} (ID: ${p.id}): https://${p.name}.vercel.app`));
  } else {
    console.log(data);
  }
}
getUrls();
