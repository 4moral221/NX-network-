import "dotenv/config";

const token = process.env.VERCEL_TEAM_TOKEN;
const teamId = "team_zEeC9fTESHnDu1Qe6FF4xyBA";

async function run() {
  console.log("Creating project via REST API...");
  const name = `nx-admin-test-${Date.now()}`;
  try {
    const res = await fetch(`https://api.vercel.com/v10/projects?teamId=${teamId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        framework: "vite"
      })
    });
    const data = await res.json() as any;
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

run();
