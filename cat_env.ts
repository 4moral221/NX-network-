import "dotenv/config";
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY ? "HAS_KEY" : "NO_KEY");
