const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const route = `
app.post('/api/admin/db/update', requireAdmin, async (req, res) => {
  try {
    const { table, match, payload } = req.body;
    if (!table || !match || !payload) return res.status(400).json({ error: "Missing parameters" });
    const { data, error } = await supabase.from(table).update(payload).match(match).select();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error("Admin DB Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});
`;

code = code.replace(/app\.get\('\/api\/admin\/merchants'/, route + "\n  app.get('/api/admin/merchants'");
fs.writeFileSync('server.ts', code);
