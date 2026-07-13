const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminPortal.tsx', 'utf8');

const targetStr = `      if (activeSection === 'overview' || activeSection === 'treasury' || activeSection === 'merchants' || activeSection === 'staff') {
        const { count: mCount, error: mErr } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'merchant');
        if (mErr) throw mErr;
        
        const { count: cCount, error: cErr } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer');
        if (cErr) throw cErr;
        
        const { count: tCount, error: tErr } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'completed', 'awaiting_merchant']);
        if (tErr) throw tErr;

        setStats({
          merchants: mCount || 0,
          customers: cCount || 0,
          txns: tCount || 0,
          pending_restock: restockRequests?.filter(r => r.status === 'pending').length || 0,
          pending_invoices: invoices?.filter(i => i.status === 'pending').length || 0,
          apps: applications?.filter(a => a.status === 'pending').length || 0,
          pending_fmcg: fmcgPartners?.filter(f => f.status === 'pending').length || 0,
          fraud_alerts: fraudLogs?.filter(f => f.status === 'unresolved').length || 0
        });

        const { data: recentTxns } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
        const { data: recentApps } = await supabase.from('merchant_applications').select('*').order('applied_at', { ascending: false }).limit(20);
        setTransactions(recentTxns || []);
        setApplications(recentApps || []);
      }`;

const replacementStr = `      if (activeSection === 'overview' || activeSection === 'treasury' || activeSection === 'merchants' || activeSection === 'staff' || activeSection === 'txns') {
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

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/pages/admin/AdminPortal.tsx', code);
