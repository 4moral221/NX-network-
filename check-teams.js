
import https from 'https';

const token = process.env.VERCEL_TEAM_TOKEN;

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
  try {
    console.log('--- USER INFO ---');
    const user = await fetch('https://api.vercel.com/v2/user');
    console.log(JSON.stringify(user, null, 2));

    const teamId = user.user.defaultTeamId;
    console.log('\n--- TEAM DETAILS ---');
    const teamDetails = await fetch(`https://api.vercel.com/v2/teams/${teamId}`);
    console.log(JSON.stringify(teamDetails, null, 2));

    console.log('\n--- PROJECTS (Team) ---');
    const teamProjects = await fetch(`https://api.vercel.com/v9/projects?teamId=${teamId}`);
    console.log(JSON.stringify(teamProjects, null, 2));

    console.log('\n--- PROJECTS (Personal) ---');
    const personalProjects = await fetch(`https://api.vercel.com/v9/projects`);
    console.log(JSON.stringify(personalProjects, null, 2));
  } catch (e) {
    console.error(e);
  }
}

run();
