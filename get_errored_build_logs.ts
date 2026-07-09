const token = 'vcp_3qGfbaV9e6iLRJEEERF0iG8MteiLydCkZM4iiNEvf6vPZGzqVt2iBlVB';
const teamId = 'team_zEeC9fTESHnDu1Qe6FF4xyBA';

async function check() {
  const deploymentsRes = await fetch(`https://api.vercel.com/v6/deployments?teamId=${teamId}&limit=30`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await deploymentsRes.json() as any;
  const landingD = data.deployments ? data.deployments.find((d: any) => d.name === 'nx-network-landing' && d.state === 'ERROR') : null;
  if (!landingD) {
    console.log("No errored landing deployment found in recent list.");
    return;
  }
  
  console.log(`Landing deployment id: ${landingD.uid}`);
  const r = await fetch(`https://api.vercel.com/v2/deployments/${landingD.uid}/events?teamId=${teamId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (r.status !== 200) {
    console.log(`HTTP Status: ${r.status}`);
    console.log(await r.text());
    return;
  }

  // Read response stream as text and parse lines/NDJSON if that's what's returned,
  // since events API sometimes returns NDJSON or an array depending on parameters.
  const text = await r.text();
  console.log("Response text sample (first 1000 chars):", text.slice(0, 1000));
  
  try {
    const list = JSON.parse(text);
    console.log(`Parsed JSON, found ${list.length} events.`);
    list.slice(-30).forEach((item: any) => {
      console.log(`[${item.type}] ${item.text}`);
    });
  } catch (e) {
    console.log("Failed to parse as simple JSON array. Splitting by newlines as NDJSON...");
    const lines = text.trim().split("\n");
    console.log(`Found ${lines.length} lines.`);
    lines.slice(-30).forEach((line, idx) => {
      try {
        const item = JSON.parse(line);
        console.log(`[${item.type || 'log'}] ${item.text}`);
      } catch (err) {
        console.log(`Line ${idx}: ${line}`);
      }
    });
  }
}
check();
