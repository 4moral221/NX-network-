
import https from 'https';

const tokens = [
  { name: 'VERCEL_TOKEN', value: process.env.VERCEL_TOKEN },
  { name: 'VERCEL_TEAM_TOKEN', value: process.env.VERCEL_TEAM_TOKEN }
];

function fetch(url, token) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Parse Error', data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  for (const { name, value } of tokens) {
    console.log(`\n=== Testing ${name} ===`);
    if (!value) {
      console.log('Not set');
      continue;
    }
    
    console.log('User info:');
    const user = await fetch('https://api.vercel.com/v2/user', value);
    console.log(JSON.stringify(user, null, 2));
    
    console.log('\nTeams:');
    const teams = await fetch('https://api.vercel.com/v2/teams', value);
    console.log(JSON.stringify(teams, null, 2));

    if (user.user && user.user.defaultTeamId) {
        console.log(`\nProjects for defaultTeamId (${user.user.defaultTeamId}):`);
        const projects = await fetch(`https://api.vercel.com/v9/projects?teamId=${user.user.defaultTeamId}`, value);
        console.log(JSON.stringify(projects, null, 2));
    }
    
    console.log('\nProjects (no teamId):');
    const projectsNoTeam = await fetch('https://api.vercel.com/v9/projects', value);
    console.log(JSON.stringify(projectsNoTeam, null, 2));
  }
}

run();
