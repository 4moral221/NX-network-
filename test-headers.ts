import "dotenv/config";

const token = process.env.VERCEL_TEAM_TOKEN;

async function run() {
  console.log("Fetching /v2/user headers...");
  try {
    const res = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("Status:", res.status);
    console.log("Headers:");
    for (const [key, value] of res.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

run();
