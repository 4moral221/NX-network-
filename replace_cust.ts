import fs from 'fs';

const path = 'src/pages/pwa/CustomerDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. imports
if(!content.includes("import { initDB } from './PwaApp';")) {
  content = content.replace(/import \{ TIER_CONFIG \} from '\.\.\/\.\.\/services\/ussd\/config';/, "import { TIER_CONFIG } from '../../services/ussd/config';\nimport { initDB } from './PwaApp';\nimport toast, { Toaster } from 'react-hot-toast';");
}

// 2. Allow any amount (remove % 5 !== 0 constraint)
content = content.replace(/\|\| numAmount % 5 !== 0/g, "");
content = content.replace(/Amount must end with 0 or 5 \(e\.g\. 50, 45, 100\)/g, "Amount must be valid.");

// 3. navigator.geolocation
if(!content.includes("navigator.geolocation.getCurrentPosition")) {
  const fetchNearby = `
    // Fetch "Nearby" Merchants
    const fetchMerchants = async () => {
      const { data: merchants } = await supabase
        .from('users')
        .select('name, merchant_code, location')
        .eq('role', 'merchant')
        .limit(10);
      
      if (merchants) {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              // Simulated distance calculation based on coords could go here
              const withDistance = merchants.map(m => ({
                ...m,
                distance: Math.floor(Math.random() * 800 + 50) 
              })).sort((a, b) => a.distance - b.distance);
              setNearbyMerchants(withDistance);
            },
            () => {
              // Fallback
              const withDistance = merchants.map(m => ({ ...m, distance: Math.floor(Math.random() * 800 + 50) })).sort((a, b) => a.distance - b.distance);
              setNearbyMerchants(withDistance);
            }
          );
        } else {
          const withDistance = merchants.map(m => ({ ...m, distance: Math.floor(Math.random() * 800 + 50) })).sort((a, b) => a.distance - b.distance);
          setNearbyMerchants(withDistance);
        }
      }
    };
    fetchMerchants();
`;
  
  content = content.replace(/const \{ data: merchants \} = await supabase\s*\.from\('users'\)\s*\.select\('name, merchant_code, location'\)\s*\.eq\('role', 'merchant'\)\s*\.limit\(10\);\s*if \(merchants\) \{\s*\/\/ Add mock distance for creativity - now in meters\s*const withDistance = merchants.map\(m => \(\{\s*\.\.\.m,\s*distance: Math.floor\(Math.random\(\) \* 800 \+ 50\) \/\/ 50m to 850m\s*\}\)\)\.sort\(\(a, b\) => a\.distance - b\.distance\);\s*setNearbyMerchants\(withDistance\);\s*\}/, fetchNearby);
}

// 4. offline tracking
if(!content.includes("if (!navigator.onLine)")) {
  const offlineSave = `
      if (!navigator.onLine) {
        const db = await initDB();
        await db.add('offlineTasks', {
           type: 'PAYMENT',
           payload: { merchantCode: merchantCode.toUpperCase(), amount: numAmount, phone: user.phone },
           timestamp: Date.now()
        });
        toast.error("Offline: Payment saved locally. Will sync when online.");
        setPayStatus('idle');
        setIsPayModalOpen(false);
        return;
      }
`;
  content = content.replace(/try \{\s*\/\/ 1\. Find merchant/, "try {" + offlineSave + "      // 1. Find merchant");
}

fs.writeFileSync(path, content);
console.log("CustomerDashboard Modified.");
