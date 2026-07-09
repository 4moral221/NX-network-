import https from 'https';

const token = process.env.VERCEL_TOKEN || 'vcp_6GPaUnX6ipxzyQoG3d53Hh1v4yCL2CKodiMfRWGtf59RkYODGD13IY5b';

function patchUser(body) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.vercel.com/v2/user', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Patching defaultTeamId to null...');
  const res = await patchUser({ defaultTeamId: null });
  console.log('Result:', JSON.stringify(res, null, 2));
}

run();
