const token = process.env.VERCEL_TOKEN;

async function fetchIt(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  console.log(`\nGET ${url}`);
  console.log(`Status: ${res.status}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

async function run() {
  await fetchIt('https://api.vercel.com/v9/projects?teamId=team_zEeC9fTESHnDu1Qe6FF4xyBA');
  await fetchIt('https://api.vercel.com/v9/projects?slug=alexs-projects-fdff01ca');
  await fetchIt('https://api.vercel.com/v9/projects?团队的slug可能不对所以我们试一下这个=1');
}
run();
