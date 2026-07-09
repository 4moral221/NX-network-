import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://balrpczytusvzzquzqob.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTUwMDMsImV4cCI6MjA4ODczMTAwM30.C-Fhpl2orwvU_tZVw9SterirPg0PooV5ryxXx3tXFIs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function signUpTestUser() {
  const { data, error } = await supabase.auth.signUp({
    email: "formidablefoe254@gmail.com",
    password: "Password123!",
    options: {
      data: {
        company_name: "Test Partner Setup",
        phone: "0711000000",
        name: "Test Partner Setup"
      }
    }
  });

  if (error) {
    console.error("Error signing up:", error);
  } else {
    console.log("Signup successful!");
    console.log("User:", data.user);
    console.log("Please check formidablefoe254@gmail.com for the verification email.");
  }
}

signUpTestUser();
