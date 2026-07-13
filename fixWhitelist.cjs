const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminPortal.tsx', 'utf8');

code = code.replace(`const { data: mData } = await supabase.from('users').select('phone').eq('role', 'merchant');
        setRegisteredPhones(mData?.map(m => m.phone) || []);`,
        `const response = await fetch('/api/admin/merchants', { headers: getAuthHeaders() });
        if (response.ok) {
           const merchants = await response.json();
           setRegisteredPhones(merchants.map(m => m.phone) || []);
        }`);

fs.writeFileSync('src/pages/admin/AdminPortal.tsx', code);
