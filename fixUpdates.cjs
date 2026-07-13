const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminPortal.tsx', 'utf8');

const regexTier = /const { error } = await supabase\.from\('users'\)\.update\(\{ franchise_tier: tier \}\)\.eq\('id', userId\);/g;
const replacementTier = `const res = await fetch('/api/admin/db/update', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'users', match: { id: userId }, payload: { franchise_tier: tier } })
      });
      if (!res.ok) throw new Error(await res.text());`;

code = code.replace(regexTier, replacementTier);

const regexSuspend = /const { error } = await supabase\.from\('users'\)\.update\(\{ status: 'suspended' \}\)\.eq\('id', userId\);/g;
const replacementSuspend = `const res = await fetch('/api/admin/db/update', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'users', match: { id: userId }, payload: { status: 'suspended' } })
      });
      if (!res.ok) throw new Error(await res.text());`;
code = code.replace(regexSuspend, replacementSuspend);

const regexActive = /const { error } = await supabase\.from\('users'\)\.update\(\{ status: 'active' \}\)\.eq\('id', userId\);/g;
const replacementActive = `const res = await fetch('/api/admin/db/update', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'users', match: { id: userId }, payload: { status: 'active' } })
      });
      if (!res.ok) throw new Error(await res.text());`;
code = code.replace(regexActive, replacementActive);

const regexAdmin = /const { error } = await supabase\.from\('users'\)\.update\(\{ is_admin: false \}\)\.eq\('id', s\.id\);/g;
const replacementAdmin = `const res = await fetch('/api/admin/db/update', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'users', match: { id: s.id }, payload: { is_admin: false } })
      });
      const error = !res.ok ? new Error(await res.text()) : null;`;
code = code.replace(regexAdmin, replacementAdmin);

fs.writeFileSync('src/pages/admin/AdminPortal.tsx', code);
