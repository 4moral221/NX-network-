const token = 'vcp_2AFsqIB9f9xrPJ2T7FIeIqVpXf5AuOas1Fg6Uk13YQDTcHHSOv0DIyAn';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function run() {
  try {
    const url = `https://api.vercel.com/v9/projects?teamId=${teamId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json() as any;
    
    if (data.projects) {
      console.log(`\n✅ Success! Found ${data.projects.length} projects with cloudshell token.`);
      for (const p of data.projects) {
        console.log(`\n===========================================`);
        console.log(`Project: ${p.name} (ID: ${p.id})`);
        console.log(`===========================================`);

        const envRes = await fetch(`https://api.vercel.com/v10/projects/${p.id}/env?teamId=${teamId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const envData = await envRes.json() as any;
        if (envData.envs) {
          for (const env of envData.envs) {
            const valRes = await fetch(`https://api.vercel.com/v10/projects/${p.id}/env/${env.id}?teamId=${teamId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const valData = await valRes.json() as any;
            console.log(`* ${env.key} = ${valData.value}`);
          }
        }
      }
    } else {
      console.log(`❌ Failed:`, data);
    }
  } catch (e: any) {
    console.error(`Error:`, e.message);
  }
}

run();
