// Test with user scope rather than team scope
const tokens = [
  'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB',
  'vcp_6GPaUnX6ipxzyQoG3d53Hh1v4yCL2CKodiMfRWGtf59RkYODGD13IY5b',
  'vcp_0xZ1YR3avAqhQkCqCSuPM8aW3ibfDYL4FLk3iW2bQjaaYjGxnd0gZBQo'
];

async function run() {
  for (const token of tokens) {
    console.log(`\n--- Testing token: ${token.slice(0, 10)}... ---`);
    try {
      const res = await fetch(`https://api.vercel.com/v9/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json() as any;
      if (data.projects) {
        console.log(`✅ Success! Found ${data.projects.length} projects:`);
        for (const p of data.projects) {
          console.log(`  - Project: ${p.name} (ID: ${p.id})`);
          
          // Get Envs
          const envRes = await fetch(`https://api.vercel.com/v10/projects/${p.id}/env`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const envData = await envRes.json() as any;
          if (envData.envs) {
            for (const env of envData.envs) {
              console.log(`    * ${env.key} (ID: ${env.id})`);
              if (env.key.includes("DATABASE") || env.key.includes("PASSWORD") || env.key.includes("POSTGRES") || env.key.includes("SECRET") || env.key.includes("SUPA")) {
                const valRes = await fetch(`https://api.vercel.com/v10/projects/${p.id}/env/${env.id}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`      Value:`, await valRes.json());
              }
            }
          }
        }
        break; // Stop if we found a valid token
      } else {
        console.log(`❌ Failed or no projects:`, data);
      }
    } catch (e: any) {
      console.error(`Error with token:`, e.message);
    }
  }
}

run();
