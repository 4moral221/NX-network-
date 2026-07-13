const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const route = `
app.get('/api/admin/overview-stats', requireAdmin, async (req, res) => {
  try {
    const { count: mCount, error: mErr } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'merchant');
    if (mErr) throw mErr;
    
    const { count: cCount, error: cErr } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer');
    if (cErr) throw cErr;
    
    const { count: tCount, error: tErr } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'completed', 'awaiting_merchant']);
    if (tErr) throw tErr;

    const { data: recentTxns, error: rErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
    const { data: recentApps, error: aErr } = await supabase.from('merchant_applications').select('*').order('applied_at', { ascending: false }).limit(20);
    const { data: fraudLogs, error: fErr } = await supabase.from('fraud_logs').select('*').order('created_at', { ascending: false }).limit(50);

    res.json({
      mCount: mCount || 0,
      cCount: cCount || 0,
      tCount: tCount || 0,
      recentTxns: recentTxns || [],
      recentApps: recentApps || [],
      fraudLogs: fraudLogs || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
`;

code = code.replace(/app\.get\('\/api\/admin\/merchants'/, route + "\n  app.get('/api/admin/merchants'");
fs.writeFileSync('server.ts', code);
