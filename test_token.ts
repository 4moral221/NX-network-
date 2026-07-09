const token = process.env.VERCEL_TOKEN;
console.log("Token starts with:", token ? token.substring(0, 4) : "null");

async function checkUser() {
  const response = await fetch(`https://api.vercel.com/v2/user`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json() as any;
  console.log("User:", JSON.stringify(data, null, 2));
}
checkUser();
