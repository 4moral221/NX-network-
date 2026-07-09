import dotenv from "dotenv";
dotenv.config();
console.log("SUPABASE_ACCESS_TOKEN is present:", !!process.env.SUPABASE_ACCESS_TOKEN);
