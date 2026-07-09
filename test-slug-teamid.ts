import "dotenv/config";

const tokens = {
  VERCEL_TOKEN: process.env.VERCEL_TOKEN,
  VERCEL_TEAM_TOKEN: process.env.VERCEL_TEAM_TOKEN
};

async function run() {
  for (const [name, token] of Object.entries(tokens)) {
    console.log(`\n=================== Testing ${name} ===================`);
    try {
      const url = `https://api.vercel.com/v9/projects?teamId=alexs-projects-fdff01ca`;
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      console.log("Status:", res.status);
      const data = await res.json() as any;
      console.log("Projects found:", data.projects ? data.projects.map((p: any) => ({ id: p.id, name: p.name })) : data);
    } catch (e: any) {
      console.error("Error:", e.message);
    }
  }
}

run();
