import "dotenv/config";

const token = process.env.VERCEL_TEAM_TOKEN;

async function run() {
  console.log("Fetching /v1/teams/alexs-projects-fdff01ca...");
  try {
    const res = await fetch("https://api.vercel.com/v1/teams/alexs-projects-fdff01ca", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

run();
