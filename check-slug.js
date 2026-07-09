
import https from 'https';

const token = process.env.VERCEL_TEAM_TOKEN;
const slug = "alexs-projects-fdff01ca";

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Checking slug: ${slug}`);
  const team = await fetch(`https://api.vercel.com/v2/teams/${slug}`);
  console.log(JSON.stringify(team, null, 2));
  
  if (team.id) {
    console.log(`Found team ID: ${team.id}`);
    const projects = await fetch(`https://api.vercel.com/v9/projects?teamId=${team.id}`);
    console.log(JSON.stringify(projects, null, 2));
  }
}

run();
