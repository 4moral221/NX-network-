import * as dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function listProjects() {
  console.log('Fetching projects...');
  const res = await fetch('https://api.supabase.com/v1/projects', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    }
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log('Projects:', data.map((p: any) => ({ id: p.id, name: p.name })));
  } else {
    console.error('Error fetching projects:', await res.text());
  }
}

listProjects().catch(console.error);
