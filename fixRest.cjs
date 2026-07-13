const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminPortal.tsx', 'utf8');

code = code.replace(`      if (activeSection === 'txns') {
        const { data, error: tErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
        if (tErr) throw tErr;
        setTransactions(data || []);
      }`, `      // txns now loaded in overview-stats endpoint`);

code = code.replace(`      if (activeSection === 'fraud' || activeSection === 'overview') {
        const { data } = await supabase.from('fraud_logs').select('*').order('created_at', { ascending: false }).limit(50);
        setFraudLogs(data || []);
      }`, `      // fraud_logs now loaded in overview-stats endpoint`);

fs.writeFileSync('src/pages/admin/AdminPortal.tsx', code);
