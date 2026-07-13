const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminPortal.tsx', 'utf8');

const regex = /if \(activeSection === 'overview' \|\| activeSection === 'treasury' \|\| activeSection === 'merchants' \|\| activeSection === 'staff'\) \{[\s\S]*?setApplications\(recentApps \|\| \[\]\);\n\s*\}/;

const replacementStr = `if (activeSection === 'overview' || activeSection === 'treasury' || activeSection === 'merchants' || activeSection === 'staff' || activeSection === 'txns') {
        const response = await fetch('/api/admin/overview-stats', { headers: getAuthHeaders() });
        if (response.ok) {
          const data = await response.json();
          setStats({
            merchants: data.mCount || 0,
            customers: data.cCount || 0,
            txns: data.tCount || 0,
            pending_restock: restockRequests?.filter(r => r.status === 'pending').length || 0,
            pending_invoices: invoices?.filter(i => i.status === 'pending').length || 0,
            apps: applications?.filter(a => a.status === 'pending').length || 0,
            pending_fmcg: fmcgPartners?.filter(f => f.status === 'pending').length || 0,
            fraud_alerts: data.fraudLogs?.filter(f => f.status === 'unresolved').length || 0
          });
          setTransactions(data.recentTxns || []);
          setApplications(data.recentApps || []);
          if (activeSection === 'fraud' || activeSection === 'overview') {
            setFraudLogs(data.fraudLogs || []);
          }
        }
      }`;

code = code.replace(regex, replacementStr);
fs.writeFileSync('src/pages/admin/AdminPortal.tsx', code);
