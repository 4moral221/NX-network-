import * as fs from 'fs';
import * as path from 'path';

function scanDir(dir: string) {
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!item.includes('node_modules')) {
        scanDir(full);
      }
    } else {
      console.log(`File: ${full}`);
      if (item.includes('url') || item.includes('password') || item.includes('db') || item.includes('credential')) {
        console.log(`--- Content of ${full} ---`);
        console.log(fs.readFileSync(full, 'utf8'));
      }
    }
  }
}

console.log("Scanning /supabase folder recursively...");
try {
  scanDir('supabase');
} catch (e: any) {
  console.log("Error:", e.message);
}
