import dotenv from "dotenv";
dotenv.config();

console.log("Analyzing environment keys...");
const keys = Object.keys(process.env).sort();
for (const key of keys) {
  if (key.includes("DB") || key.includes("POSTGRES") || key.includes("DATABASE") || key.includes("PASS") || key.includes("SECRET") || key.includes("CONN") || key.includes("PORT") || key.includes("SUPABASE") || key.includes("VITE")) {
    console.log(`- ${key}: ${process.env[key] ? "DEFINED" : "UNDEFINED"} (Length: ${process.env[key]?.length || 0})`);
  }
}
