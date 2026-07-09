import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://balrpczytusvzzquzqob.supabase.co';
const token = process.env.SUPABASE_ACCESS_TOKEN;

async function testProject() {
  const ref = url.split('://')[1].split('.')[0];
  console.log('Testing Project Ref:', ref);
  
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Project Access OK:', data.name);
  } else {
    console.error('Project Access FAILED:', response.status, await response.text());
  }
}

testProject();
