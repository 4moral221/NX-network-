console.log(Object.keys(process.env).filter(k => k.includes("SUPA") || k.includes("RESEND")).map(k => `${k}=${process.env[k]}`).join("\n"));
