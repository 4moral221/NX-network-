console.log(Object.keys(process.env).filter(k => k.includes("VERCEL")).map(k => `${k}=${process.env[k]}`).join("\n"));
