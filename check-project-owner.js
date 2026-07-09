
import https from 'https';

const token = process.env.VERCEL_TEAM_TOKEN;
const projectId = "prj_be6Zcjfwc4UNTctHYOGgbASbcYRY";

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
  console.log(`Checking project: ${projectId}`);
  const project = await fetch(`https://api.vercel.com/v9/projects/${projectId}`);
  console.log(JSON.stringify(project, null, 2));
}

run();
