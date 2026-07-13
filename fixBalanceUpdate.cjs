const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminPortal.tsx', 'utf8');

const regex = /await supabase\.from\('users'\)\.update\(\{ nx_balance: actualBalance \}\)\.eq\('phone', u\.phone\);/g;
const replacement = `await fetch('/api/admin/db/update', {
                                     method: 'POST',
                                     headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                                     body: JSON.stringify({ table: 'users', match: { phone: u.phone }, payload: { nx_balance: actualBalance } })
                                   });`;
code = code.replace(regex, replacement);

fs.writeFileSync('src/pages/admin/AdminPortal.tsx', code);
