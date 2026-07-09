console.log("Checking all environment variable keys containing 'PASS', 'DB', 'URL', 'CONN', 'SECRET'...");
const keys = Object.keys(process.env).filter(k => 
  /pass|db|url|conn|secret/i.test(k)
);
for (const k of keys) {
  console.log(`${k} = ${process.env[k]}`);
}
