const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminPortal.tsx', 'utf8');

const targetStr = `const { data: users } = await supabase.from('users').select('phone, merchant_code, role, nx_balance, name, franchise_tier').limit(20);`;
const replaceStr = `let users = [];
          const resUsers = await fetch('/api/admin/merchants', { headers: getAuthHeaders() });
          if (resUsers.ok) users = await resUsers.json();`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/pages/admin/AdminPortal.tsx', code);
