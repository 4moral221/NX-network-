const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function check() {
  const res = await fetch(`https://api.vercel.com/v9/projects?teamId=${teamId}&limit=50`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json() as any;
  if (data.projects) {
    console.log(`Found ${data.projects.length} projects:`);
    data.projects.forEach((p: any) => {
      console.log(`- Project: ${p.name}`);
      console.log(`  Build Command: ${p.buildCommand}`);
      console.log(`  Output Directory: ${p.outputDirectory}`);
      console.log(`  Framework: ${p.framework}`);
      console.log(`  Install Command: ${p.installCommand}`);
    });
  } else {
    console.log(data);
  }
}
check();
