

const projects = [
  'nx-network-admin',
  'nx-network-landing',
  'nx-network-pwa',
  'nx-network-merchant',
  'nx-network-fmcg'
];

const envs = {
  VITE_SUPABASE_URL: "https://balrpczytusvzzquzqob.supabase.co",
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  VITE_FMCG_PORTAL_URL: "https://nx-network-fmcg.vercel.app"
};

const token = process.env.VERCEL_TEAM_TOKEN;

if (!token) {
  console.error("VERCEL_TEAM_TOKEN is missing");
  process.exit(1);
}

async function deploy() {
  const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';
  for (const project of projects) {
    console.log(`Working on project: ${project}`);
    
    // Fetch existing envs
    const getRes = await fetch(`https://api.vercel.com/v9/projects/${project}/env?teamId=${teamId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getBody = await getRes.json() as any;
    const existingEnvs = getBody.envs || [];

    for (const [key, value] of Object.entries(envs)) {
      // Find and delete existing
      const existing = existingEnvs.filter((e: any) => e.key === key);
      for (const e of existing) {
        await fetch(`https://api.vercel.com/v9/projects/${project}/env/${e.id}?teamId=${teamId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      console.log(`Adding ${key} to ${project}...`);
      try {
        const response = await fetch(`https://api.vercel.com/v10/projects/${project}/env?teamId=${teamId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            key: key,
            value: value,
            type: 'encrypted',
            target: ['production', 'preview', 'development']
          })
        });

        const data = await response.json() as any;
        if (response.ok) {
          console.log(`Successfully added ${key} to ${project}`);
        } else {
          console.error(`Failed to add ${key} to ${project}:`, data.error?.message || data);
        }
      } catch (e) {
        console.error(`Error for ${project}:`, e.message);
      }
    }
  }
}

deploy();
