import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function checkHealth() {
  console.log("Checking DB Connection...");
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'SELECT 1 as health_check;' })
    });
    if (res.ok) {
      console.log("DB Connection OK.");
    } else {
      console.error("DB Error:", await res.text());
    }
  } catch (e) {
    console.error("Network error checking DB.", e);
  }
}

checkHealth();
