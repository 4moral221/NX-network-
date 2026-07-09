import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'restock_invoices';
`;

async function check() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (res.ok) {
    const data = await res.json();
    console.log('Columns:', JSON.stringify(data, null, 2));
  } else {
    console.error('Error fetching columns:', await res.text());
  }
}
check();
