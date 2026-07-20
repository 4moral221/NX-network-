import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Copy, Check, Terminal, Shield, Key, 
  Layers, ChevronRight, Activity, AlertCircle, Play, 
  HelpCircle, Server, FileText, BarChart3, Database, Send
} from 'lucide-react';
import NXLogo from '../../components/NXLogo';

interface CodeExample {
  title: string;
  curl: string;
  javascript: string;
  python: string;
}

export default function SalesAnalyticsApiDocs() {
  const [activeTab, setActiveTab] = useState<'overview' | 'auth' | 'velocity' | 'duka-trends' | 'campaigns' | 'sandbox' | 'economics'>('overview');
  const [langTab, setLangTab] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Interactive simulator states
  const [simEndpoint, setSimEndpoint] = useState<string>('auth');
  const [simMethod, setSimMethod] = useState<'POST' | 'GET'>('POST');
  const [simBody, setSimBody] = useState<string>(
    JSON.stringify({ partner_id: "FMCG-UNILEVER", api_key: "nx_analytics_a619dd" }, null, 2)
  );
  const [simResponse, setSimResponse] = useState<any>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const runSimulatedRequest = () => {
    setSimLoading(true);
    setSimResponse(null);
    setTimeout(() => {
      setSimLoading(false);
      if (simEndpoint === 'auth') {
        setSimResponse({
          "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZtY2ctdW5pbGV2ZXIiLCJyb2xlIjoiYW5hbHl0aWNzIn0.signature_hash_88",
          "token_type": "Bearer",
          "expires_in": 3600
        });
      } else if (simEndpoint === 'velocity') {
        setSimResponse({
          "brand_id": "UNILEVER-KE",
          "period": "weekly_snapshot",
          "week_ending": "2026-07-18",
          "skus": [
            {
              "sku": "ROYCO-MCHUZI-MIX-200G",
              "units_sold": 14205,
              "velocity_change_pct": 12.4,
              "market_share_pct": 38.5,
              "avg_shelf_price_kes": 115,
              "stockout_risk_score": 0.08
            },
            {
              "sku": "BLUEBAND-MARGARINE-250G",
              "units_sold": 9840,
              "velocity_change_pct": -2.1,
              "market_share_pct": 54.2,
              "avg_shelf_price_kes": 180,
              "stockout_risk_score": 0.15
            }
          ]
        });
      } else if (simEndpoint === 'duka-trends') {
        setSimResponse({
          "region": "Nairobi East",
          "monitored_dukas_count": 482,
          "active_orders_pool_count": 188,
          "hotspots": [
            { "location": "Kayole", "dukas_active": 140, "demand_velocity_score": 9.4, "top_category": "Cooking Oils" },
            { "location": "Dandora", "dukas_active": 95, "demand_velocity_score": 8.1, "top_category": "Maize Flour" }
          ],
          "switching_alerts": [
            {
              "trigger_sku": "COMPETITOR-FAT-1KG",
              "switching_to_sku": "KIMBO-FAT-1KG",
              "estimated_conversion_rate": 0.18,
              "reason": "Competitor out-of-stock at regional distributor"
            }
          ]
        });
      } else if (simEndpoint === 'campaign') {
        setSimResponse({
          "campaign_id": "CAMP-2026-X09",
          "status": "scheduled",
          "estimated_duka_reach": 1250,
          "budget_allocated_kes": 50000,
          "nx_token_discount_subsidy": 0.15,
          "target_segment": "Certified Dukas (BASIC & CERTIFIED Tiers)",
          "approved_by_network": true
        });
      } else {
        setSimResponse({
          "error": {
            "code": "ENDPOINT_NOT_IMPLEMENTED",
            "message": "Interactive simulation for this endpoint is pending."
          }
        });
      }
    }, 850);
  };

  const changeSimEndpoint = (endpoint: string) => {
    setSimEndpoint(endpoint);
    setSimResponse(null);
    if (endpoint === 'auth') {
      setSimMethod('POST');
      setSimBody(JSON.stringify({ partner_id: "FMCG-UNILEVER", api_key: "nx_analytics_a619dd" }, null, 2));
    } else if (endpoint === 'velocity') {
      setSimMethod('GET');
      setSimBody('');
    } else if (endpoint === 'duka-trends') {
      setSimMethod('GET');
      setSimBody('');
    } else if (endpoint === 'campaign') {
      setSimMethod('POST');
      setSimBody(JSON.stringify({
        sku: "ROYCO-MCHUZI-MIX-200G",
        discount_per_unit_kes: 12,
        max_duration_weeks: 4,
        target_regions: ["Nairobi East", "Mombasa Main"],
        merchant_tier_eligible: ["BASIC", "CERTIFIED"]
      }, null, 2));
    }
  };

  const renderCodeSnippet = (examples: CodeExample) => {
    const code = langTab === 'curl' 
      ? examples.curl 
      : langTab === 'javascript' 
        ? examples.javascript 
        : examples.python;

    return (
      <div className="relative group bg-[#060810] rounded-xl border border-nx-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-[#0a0d1a] border-b border-nx-border text-xs text-nx-muted font-mono">
          <span>{langTab === 'curl' ? 'SHELL / cURL' : langTab === 'javascript' ? 'JAVASCRIPT (FETCH)' : 'PYTHON (REQUESTS)'}</span>
          <button 
            onClick={() => handleCopy(code, examples.title)}
            className="flex items-center gap-1.5 hover:text-nx-paper transition-colors cursor-pointer text-left bg-transparent border-none p-0 focus:outline-hidden"
          >
            {copiedText === examples.title ? (
              <>
                <Check className="w-3.5 h-3.5 text-nx-green" />
                <span className="text-nx-green font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-[11px] md:text-xs font-mono text-[#00ff88] leading-relaxed max-h-[350px]">
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  const authCode: CodeExample = {
    title: "auth",
    curl: `curl -X POST https://api.nxnetwork.company/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "partner_id": "FMCG-UNILEVER",
    "api_key": "your_api_key_here"
  }'`,
    javascript: `fetch('https://api.nxnetwork.company/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    partner_id: 'FMCG-UNILEVER',
    api_key: 'your_api_key_here'
  })
})
.then(res => res.json())
.then(data => console.log(data.access_token));`,
    python: `import requests

url = "https://api.nxnetwork.company/v1/auth/login"
payload = {
    "partner_id": "FMCG-UNILEVER",
    "api_key": "your_api_key_here"
}

response = requests.post(url, json=payload)
token = response.json().get("access_token")
print(token)`
  };

  const salesSummaryCode: CodeExample = {
    title: "sales-summary",
    curl: `curl -X GET "https://api.nxnetwork.company/v1/analytics/sales-summary?partner_id=PARTNER-001&group_by=region" \\
  -H "Authorization: Bearer <your_access_token>"`,
    javascript: `fetch('https://api.nxnetwork.company/v1/analytics/sales-summary?partner_id=PARTNER-001&group_by=region', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
})
.then(res => res.json())
.then(data => console.log(data));`,
    python: `import requests

url = "https://api.nxnetwork.company/v1/analytics/sales-summary"
headers = {
    "Authorization": "Bearer " + access_token
}
params = {
    "partner_id": "PARTNER-001",
    "group_by": "region"
}

response = requests.get(url, headers=headers, params=params)
print(response.json())`
  };

  const velocityCode: CodeExample = {
    title: "velocity",
    curl: `curl -X GET "https://api.nxnetwork.company/v1/analytics/sku-velocity?brand_id=UNILEVER-KE&period=weekly" \\
  -H "Authorization: Bearer <your_access_token>"`,
    javascript: `fetch('https://api.nxnetwork.company/v1/analytics/sku-velocity?brand_id=UNILEVER-KE&period=weekly', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
})
.then(res => res.json())
.then(data => console.log(data.skus));`,
    python: `import requests

url = "https://api.nxnetwork.company/v1/analytics/sku-velocity"
headers = {
    "Authorization": "Bearer " + access_token
}
params = {
    "brand_id": "UNILEVER-KE",
    "period": "weekly"
}

response = requests.get(url, headers=headers, params=params)
print(response.json())`
  };

  const dukaTrendsCode: CodeExample = {
    title: "duka-trends",
    curl: `curl -X GET "https://api.nxnetwork.company/v1/analytics/duka-trends?region=NairobiEast" \\
  -H "Authorization: Bearer <your_access_token>"`,
    javascript: `fetch('https://api.nxnetwork.company/v1/analytics/duka-trends?region=NairobiEast', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
})
.then(res => res.json())
.then(data => console.log(data.hotspots));`,
    python: `import requests

url = "https://api.nxnetwork.company/v1/analytics/duka-trends"
headers = {
    "Authorization": "Bearer " + access_token
}
params = {
    "region": "NairobiEast"
}

response = requests.get(url, headers=headers, params=params)
print(response.json())`
  };

  const campaignCode: CodeExample = {
    title: "campaign",
    curl: `curl -X POST https://api.nxnetwork.company/v1/campaigns/promotion \\
  -H "Authorization: Bearer <your_access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sku": "ROYCO-MCHUZI-MIX-200G",
    "discount_per_unit_kes": 12,
    "max_duration_weeks": 4,
    "target_regions": ["Nairobi East"],
    "merchant_tier_eligible": ["BASIC", "CERTIFIED"]
  }'`,
    javascript: `fetch('https://api.nxnetwork.company/v1/campaigns/promotion', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sku: 'ROYCO-MCHUZI-MIX-200G',
    discount_per_unit_kes: 12,
    max_duration_weeks: 4,
    target_regions: ['Nairobi East'],
    merchant_tier_eligible: ['BASIC', 'CERTIFIED']
  })
})
.then(res => res.json())
.then(result => console.log(result));`,
    python: `import requests

url = "https://api.nxnetwork.company/v1/campaigns/promotion"
headers = {
    "Authorization": "Bearer " + access_token,
    "Content-Type": "application/json"
}
payload = {
    "sku": "ROYCO-MCHUZI-MIX-200G",
    "discount_per_unit_kes": 12,
    "max_duration_weeks": 4,
    "target_regions": ["Nairobi East"],
    "merchant_tier_eligible": ["BASIC", "CERTIFIED"]
}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`
  };

  return (
    <div className="min-h-screen bg-nx-ink text-nx-paper flex flex-col antialiased">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 bg-nx-ink/90 backdrop-blur border-b border-nx-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-nx-muted hover:text-nx-paper transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase">Exit Docs</span>
            </Link>
            <div className="h-4 w-px bg-nx-border" />
            <NXLogo className="h-5 text-nx-paper" />
            <span className="text-[10px] font-mono bg-nx-amber/10 text-nx-amber border border-nx-amber/20 px-2 py-0.5 rounded uppercase tracking-wider">
              Sales Analytics API v1.0.0
            </span>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-nx-muted font-mono">
            <Server className="w-3.5 h-3.5 text-nx-green" />
            <span>Sandbox: https://sandbox.api.nxnetwork.company/v1</span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid lg:grid-cols-12 gap-8 p-6 md:p-8">
        
        {/* Left Sidebar Menu */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="sticky top-24">
            <div className="mb-4">
              <h3 className="text-[10px] font-mono tracking-[0.2em] text-nx-amber uppercase font-bold px-3">
                Analytics API
              </h3>
            </div>
            
            <nav className="space-y-1">
              {[
                { id: 'overview', label: '1. Overview', icon: FileText },
                { id: 'economics', label: '2. Market & Economics', icon: Layers },
                { id: 'auth', label: '3. Authentication', icon: Key },
                { id: 'velocity', label: '4. SKU velocity', icon: BarChart3 },
                { id: 'duka-trends', label: '5. Duka Trends', icon: Database },
                { id: 'campaigns', label: '6. Brand Campaigns', icon: Shield },
                { id: 'sandbox', label: '7. Interactive Sandbox', icon: Terminal },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-nx-amber/10 text-nx-amber border border-nx-amber/20 font-bold' 
                        : 'text-nx-muted hover:text-nx-paper hover:bg-nx-card/50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </span>
                    <ChevronRight className={`w-3 h-3 transition-transform ${activeTab === item.id ? 'translate-x-0.5' : 'opacity-0'}`} />
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 p-4 bg-nx-card/40 border border-nx-border rounded-xl">
              <h4 className="text-[10px] font-mono text-nx-amber uppercase tracking-widest mb-2 font-bold">API Security</h4>
              <p className="text-[11px] text-nx-muted leading-relaxed">
                All requests require modern Bearer Authentication. User credentials and PIN codes are hardened against brute-force attacks using compute-intensive Argon2id and bcrypt cryptographic hashing.
              </p>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="lg:col-span-9 space-y-10 min-w-0">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-nx-paper uppercase">Sales &amp; Demand Analytics</h1>
                <p className="text-sm text-nx-muted max-w-3xl leading-relaxed">
                  The NX Sales &amp; Demand Analytics API enables leading FMCG brands to directly hook into high-velocity last-mile demand telemetry. By monitoring real-time orders aggregated across thousands of dukas, you gain uncompromised transparency into consumer velocity before it passes through traditional distributor channels.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-nx-card p-6 border border-nx-border rounded-xl">
                  <div className="text-nx-amber font-mono text-xs mb-2">◇ REAL-TIME TELEMETRY</div>
                  <p className="text-xs text-nx-muted leading-relaxed">
                    Track weekly sell-through rates, average customer cart sizes, and out-of-stock trends on localized shop levels in real time.
                  </p>
                </div>
                <div className="bg-nx-card p-6 border border-nx-border rounded-xl">
                  <div className="text-nx-amber font-mono text-xs mb-2">◇ TARGETED INCENTIVIZATION</div>
                  <p className="text-xs text-nx-muted leading-relaxed">
                    Directly launch regional promotions, subsidizing merchant restocks via the NX Loyalty pool structure to boost your specific SKU market share.
                  </p>
                </div>
              </div>

              <div className="bg-nx-amber/5 border border-nx-amber/20 rounded-xl p-6 space-y-3">
                <h3 className="font-display text-sm text-nx-amber font-semibold uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Compliance &amp; Anonymization
                </h3>
                <p className="text-xs text-[#b5b3aa] leading-relaxed">
                  All transaction analytics are aggregated at regional and retail group levels to maintain complete customer privacy and comply with the Kenya Data Protection Act. Kiosk location mapping is provided purely for logistical optimization and brand performance tracking.
                </p>
              </div>
            </motion.div>
          )}

          {/* Market & Economics Tab */}
          {activeTab === 'economics' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-nx-paper uppercase">Market Sizing &amp; Unit Economics</h1>
                <p className="text-sm text-nx-muted max-w-3xl leading-relaxed">
                  Informal retail dominates FMCG sales in East Africa. NX digitizes and aggregates this immense offline footprint, driving direct last-mile efficiency.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* TAM / SAM */}
                <div className="bg-nx-card p-6 border border-nx-border rounded-xl space-y-6">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-nx-amber font-bold block mb-1">AGGREGATED TAM &amp; SAM</span>
                    <h3 className="font-display text-lg text-nx-paper uppercase font-extrabold tracking-tight">Market Opportunity</h3>
                  </div>

                  <div className="space-y-4">
                    {/* TAM */}
                    <div className="border border-nx-border/50 bg-[#0f0e0c]/40 p-4 rounded-lg flex gap-4 items-start">
                      <div className="font-display text-3xl font-black text-nx-amber shrink-0">70%+</div>
                      <div>
                        <h4 className="font-sans font-bold text-[10px] text-nx-paper mb-0.5 tracking-wider uppercase">TOTAL ADDRESSABLE MARKET (TAM)</h4>
                        <p className="text-[11px] text-nx-muted leading-relaxed">
                          Over <strong>70% of Kenya's daily FMCG consumer spend</strong> is transacted through informal retail kiosks (dukas and tabletop vendors). Across <strong>250,000+ active shops</strong>, this represents a massive <strong>$20B+ annual market</strong> operating completely offline.
                        </p>
                      </div>
                    </div>

                    {/* SAM */}
                    <div className="border border-nx-border/50 bg-[#0f0e0c]/40 p-4 rounded-lg flex gap-4 items-start">
                      <div className="font-display text-3xl font-black text-nx-green shrink-0">80k</div>
                      <div>
                        <h4 className="font-sans font-bold text-[10px] text-nx-paper mb-0.5 tracking-wider uppercase">SERVICEABLE ADDRESSABLE MARKET (SAM)</h4>
                        <p className="text-[11px] text-nx-muted leading-relaxed">
                          Our target focuses on <strong>80,000+ urban &amp; semi-urban dukas</strong> in key Kenyan cities. Aggregating order flows at scale establishes an addressable order pipeline of over <strong>$1.2 Billion annually</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unit Economics Monthly Model */}
                <div className="bg-nx-card p-6 border border-nx-border rounded-xl space-y-6">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-nx-green font-bold block mb-1">PER DUKA MONTHLY MODEL</span>
                    <h3 className="font-display text-lg text-nx-paper uppercase font-extrabold tracking-tight">Unit Economics Scenario</h3>
                  </div>

                  <div className="p-4 border border-nx-border/50 bg-[#0f0e0c]/40 rounded-lg space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-nx-paper uppercase border-b border-nx-border/30 pb-1.5">
                      <span>Metric / Dimension</span>
                      <span>Value (KES / Mo)</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-nx-muted">
                      <span>Duka Monthly Restock Volume</span>
                      <span className="font-mono text-nx-paper font-semibold">KES 30,000</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-nx-muted">
                      <span>NX Base Trading Spread / Margin (6.0%)</span>
                      <span className="font-mono text-nx-paper font-semibold">KES 1,800</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-[#b5b3aa] pl-3 border-l border-nx-border">
                      <span>↳ Loyalty Pool Allocation (70%)</span>
                      <span className="font-mono text-nx-green font-medium">KES 1,260</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-[#b5b3aa] pl-3 border-l border-nx-border">
                      <span>↳ Net Platform Commission (30%)</span>
                      <span className="font-mono text-nx-amber font-semibold">KES 540</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-nx-muted border-t border-nx-border/30 pt-1.5">
                      <span>Direct Cash Restock Savings (Cashback)</span>
                      <span className="font-mono text-nx-green font-semibold">KES 1,260+</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-[#0e0d0b] border border-nx-border p-3 rounded-lg">
                      <div className="font-display text-xl text-nx-green font-black">+35%</div>
                      <div className="text-[8px] uppercase tracking-wider text-nx-muted mt-0.5">Campaign SKU Uplift</div>
                    </div>
                    <div className="bg-[#0e0d0b] border border-nx-border p-3 rounded-lg">
                      <div className="font-display text-xl text-nx-amber font-black">+15%</div>
                      <div className="text-[8px] uppercase tracking-wider text-nx-muted mt-0.5">Merchant Retention</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-nx-green/5 border border-nx-green/20 rounded-xl">
                <p className="text-xs text-[#b5b3aa] leading-relaxed">
                  <strong className="text-nx-green uppercase tracking-wider block mb-1 font-mono text-[10px]">Ecosystem Loyalty Feedback Loop</strong>
                  Platform revenue is entirely non-extractive and derived directly from real trading volume spreads. By returning 70% of bulk order margin gains back to duka merchants as immediate invoice cashback offsets, we create a powerful and sustainable loyalty loop that naturally captures localized market share.
                </p>
              </div>
            </motion.div>
          )}

          {/* Authentication Tab */}
          {activeTab === 'auth' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-nx-paper uppercase">Authentication</h1>
                <p className="text-sm text-nx-muted">
                  Generate secure JWT tokens to authenticate subsequent requests. Pass your partner credentials as JSON payloads.
                </p>
              </div>

              <div className="bg-[#100d0c] border border-[#ffaa00]/10 p-4 rounded-xl text-xs text-nx-amber/90 leading-relaxed font-mono">
                POST https://api.nxnetwork.company/v1/auth/login
              </div>

              {/* Code selector */}
              <div className="space-y-4">
                <div className="flex gap-2 border-b border-nx-border">
                  {(['curl', 'javascript', 'python'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLangTab(lang)}
                      className={`px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                        langTab === lang ? 'border-nx-amber text-nx-amber font-bold' : 'border-transparent text-nx-muted hover:text-nx-paper'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
                {renderCodeSnippet(authCode)}
              </div>
            </motion.div>
          )}

          {/* SKU Velocity Tab */}
          {activeTab === 'velocity' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-nx-paper uppercase">Sales Summary &amp; Velocity</h1>
                <p className="text-sm text-nx-muted">
                  Fetch transactional summaries and regional velocity metrics to monitor product performance across the duka network.
                </p>
              </div>

              {/* SALES SUMMARY ENDPOINT */}
              <div className="space-y-4">
                <div className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="bg-[#ffaa00]/10 text-nx-amber px-2 py-0.5 rounded font-bold uppercase">GET</span>
                    <span className="text-nx-paper font-bold">/v1/analytics/sales-summary</span>
                  </div>
                  <p className="text-xs text-nx-muted leading-relaxed">
                    Transaction-level insight across the merchant network — volume, NX issuance, and margin trends. Built for partners who need to understand aggregated sales metrics.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-nx-paper">Query Parameters</div>
                  <table className="w-full text-left text-xs border border-nx-border rounded-lg overflow-hidden font-mono">
                    <thead className="bg-[#0a0d1a] border-b border-nx-border">
                      <tr>
                        <th className="p-2.5 text-nx-amber">Parameter</th>
                        <th className="p-2.5 text-nx-amber">Type</th>
                        <th className="p-2.5 text-nx-amber">Presence</th>
                        <th className="p-2.5 text-nx-amber">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-nx-border/50">
                        <td className="p-2.5">partner_id</td>
                        <td className="p-2.5 text-nx-muted">string</td>
                        <td className="p-2.5 text-nx-green">Required</td>
                        <td className="p-2.5 text-nx-muted text-[11px]">Issued with your FMCG partner credentials</td>
                      </tr>
                      <tr className="border-b border-nx-border/50">
                        <td className="p-2.5">date_from</td>
                        <td className="p-2.5 text-nx-muted">date</td>
                        <td className="p-2.5 text-nx-amber">Optional</td>
                        <td className="p-2.5 text-nx-muted text-[11px]">ISO 8601 — defaults to last 30 days</td>
                      </tr>
                      <tr className="border-b border-nx-border/50">
                        <td className="p-2.5">date_to</td>
                        <td className="p-2.5 text-nx-muted">date</td>
                        <td className="p-2.5 text-nx-amber">Optional</td>
                        <td className="p-2.5 text-nx-muted text-[11px]">ISO 8601</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">group_by</td>
                        <td className="p-2.5 text-nx-muted">string</td>
                        <td className="p-2.5 text-nx-amber">Optional</td>
                        <td className="p-2.5 text-nx-muted text-[11px]">One of <code className="text-nx-green">region | tier | sku</code></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2 border-b border-nx-border">
                    {(['curl', 'javascript', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLangTab(lang)}
                        className={`px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                          langTab === lang ? 'border-nx-amber text-nx-amber font-bold' : 'border-transparent text-nx-muted hover:text-nx-paper'
                        }`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {renderCodeSnippet(salesSummaryCode)}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-nx-paper">Expected Response (Status 200)</div>
                  <pre className="p-4 bg-[#060810] border border-nx-border rounded-xl font-mono text-[11px] text-nx-green overflow-x-auto leading-relaxed">
{`{
  "period": "2026-06-19 / 2026-07-19",
  "total_transactions": 18420,
  "nx_issued": 214300,
  "by_tier": {
    "basic": 0.60,
    "certified": 0.65,
    "hub": 0.70
  }
}`}
                  </pre>
                </div>
              </div>

              <div className="my-10 border-t border-nx-border/40" />

              {/* SKU VELOCITY ENDPOINT */}
              <div className="space-y-4">
                <div className="p-4 bg-[#0a0d1a] border border-nx-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="bg-[#ffaa00]/10 text-nx-amber px-2 py-0.5 rounded font-bold uppercase">GET</span>
                    <span className="text-nx-paper font-bold">/v1/analytics/sku-velocity</span>
                  </div>
                  <p className="text-xs text-nx-muted leading-relaxed">
                    Fetch live weekly units sold, velocity metrics, average pricing, and regional stockout risk markers for your specified brand SKUs.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2 border-b border-nx-border">
                    {(['curl', 'javascript', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLangTab(lang)}
                        className={`px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                          langTab === lang ? 'border-nx-amber text-nx-amber font-bold' : 'border-transparent text-nx-muted hover:text-nx-paper'
                        }`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {renderCodeSnippet(velocityCode)}
                </div>
              </div>
            </motion.div>
          )}

          {/* Duka Trends Tab */}
          {activeTab === 'duka-trends' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-nx-paper uppercase">Duka Activity Trends</h1>
                <p className="text-sm text-nx-muted">
                  Get high-velocity hotspot insights, highlighting areas of high demand, regional switching patterns, and real-time competitor stocking issues.
                </p>
              </div>

              <div className="bg-[#100d0c] border border-[#ffaa00]/10 p-4 rounded-xl text-xs text-nx-amber/90 leading-relaxed font-mono">
                GET https://api.nxnetwork.company/v1/analytics/duka-trends?region=NairobiEast
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 border-b border-nx-border">
                  {(['curl', 'javascript', 'python'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLangTab(lang)}
                      className={`px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                        langTab === lang ? 'border-nx-amber text-nx-amber font-bold' : 'border-transparent text-nx-muted hover:text-nx-paper'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
                {renderCodeSnippet(dukaTrendsCode)}
              </div>
            </motion.div>
          )}

          {/* Brand Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-nx-paper uppercase">Launch Brand Campaigns</h1>
                <p className="text-sm text-nx-muted">
                  Inject campaign budget to lower invoice restock costs for local dukas. Under the NX Loyalty loop, this automatically boosts your product restock volume while directly lowering merchants' cash requirements.
                </p>
              </div>

              <div className="bg-[#100d0c] border border-[#ffaa00]/10 p-4 rounded-xl text-xs text-nx-amber/90 leading-relaxed font-mono">
                POST https://api.nxnetwork.company/v1/campaigns/promotion
              </div>

              <div className="space-y-4">
                <div className="flex gap-2 border-b border-nx-border">
                  {(['curl', 'javascript', 'python'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLangTab(lang)}
                      className={`px-3 py-2 text-xs font-mono border-b-2 transition-all cursor-pointer ${
                        langTab === lang ? 'border-nx-amber text-nx-amber font-bold' : 'border-transparent text-nx-muted hover:text-nx-paper'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
                {renderCodeSnippet(campaignCode)}
              </div>
            </motion.div>
          )}

          {/* Sandbox Tab */}
          {activeTab === 'sandbox' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-nx-paper uppercase">Interactive Sandbox Simulator</h1>
                <p className="text-sm text-nx-muted">
                  Test your integrations right from your browser. Toggle endpoints below, view the mock JSON body payload, and execute live API simulations.
                </p>
              </div>

              <div className="grid md:grid-cols-12 gap-6 bg-nx-card p-6 border border-nx-border rounded-xl">
                {/* Left controls */}
                <div className="md:col-span-5 space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-nx-amber mb-2">Select Endpoint</label>
                    <div className="space-y-2">
                      {[
                        { id: 'auth', label: 'POST /v1/auth/login', desc: 'Secure Partner Authentication' },
                        { id: 'velocity', label: 'GET /v1/analytics/sku-velocity', desc: 'Monitor live SKU Sell-through rate' },
                        { id: 'duka-trends', label: 'GET /v1/analytics/duka-trends', desc: 'Fetch geo-located hotspots' },
                        { id: 'campaign', label: 'POST /v1/campaigns/promotion', desc: 'Launch discount promo campaign' },
                      ].map((ep) => (
                        <button
                          key={ep.id}
                          onClick={() => changeSimEndpoint(ep.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                            simEndpoint === ep.id 
                              ? 'bg-nx-amber/5 border-nx-amber/40 text-nx-amber' 
                              : 'bg-nx-ink/40 border-nx-border/50 text-nx-muted hover:text-nx-paper'
                          }`}
                        >
                          <div className="text-xs font-mono font-bold">{ep.label}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">{ep.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {simMethod === 'POST' && (
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-nx-amber mb-2">Request Body (JSON)</label>
                      <textarea
                        value={simBody}
                        onChange={(e) => setSimBody(e.target.value)}
                        className="w-full h-32 bg-nx-ink/80 border border-nx-border rounded-lg p-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-nx-amber/60"
                      />
                    </div>
                  )}

                  <button
                    onClick={runSimulatedRequest}
                    disabled={simLoading}
                    className="w-full bg-nx-amber text-nx-ink font-bold text-xs font-mono py-3 rounded-lg hover:bg-nx-amber/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                  >
                    {simLoading ? (
                      <>
                        <span className="animate-spin">⌛</span>
                        <span>SIMULATING REQUEST...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-nx-ink" />
                        <span>RUN SIMULATION</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right response preview */}
                <div className="md:col-span-7 flex flex-col min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-nx-amber mb-2">API Response</div>
                  <div className="flex-1 bg-nx-ink rounded-lg border border-nx-border p-4 font-mono text-[11px] overflow-y-auto min-h-[300px] max-h-[450px]">
                    {simResponse ? (
                      <pre className="text-nx-green leading-relaxed">
                        <code>{JSON.stringify(simResponse, null, 2)}</code>
                      </pre>
                    ) : simLoading ? (
                      <div className="h-full flex flex-col items-center justify-center text-nx-muted text-xs">
                        <span className="animate-spin mb-2">⏳</span>
                        <span>Executing secure call...</span>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-nx-muted text-xs text-center">
                        <Send className="w-8 h-8 opacity-40 mb-2 text-nx-amber" />
                        <span>Ready to simulate request.<br/>Click "RUN SIMULATION" to execute mock query.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </main>

      </div>
    </div>
  );
}
