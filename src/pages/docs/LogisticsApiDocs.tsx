import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Copy, Check, Terminal, Shield, Key, 
  Layers, ChevronRight, Activity, AlertCircle, Play, 
  HelpCircle, Server, FileText, Webhook, RefreshCw
} from 'lucide-react';
import NXLogo from '../../components/NXLogo';

interface CodeExample {
  title: string;
  curl: string;
  javascript: string;
  python: string;
}

export default function LogisticsApiDocs() {
  const [activeTab, setActiveTab] = useState<'overview' | 'auth' | 'jobs' | 'deliveries' | 'earnings' | 'webhooks' | 'sandbox'>('overview');
  const [langTab, setLangTab] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Interactive simulator states
  const [simEndpoint, setSimEndpoint] = useState<string>('auth');
  const [simMethod, setSimMethod] = useState<'POST' | 'GET' | 'PATCH'>('POST');
  const [simBody, setSimBody] = useState<string>(
    JSON.stringify({ partner_id: "PARTNER-001", api_key: "nx_logistics_7718aa" }, null, 2)
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
          "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InBhcnRuZXItMDAxIiwicm9sZSI6ImxvZ2lzdGljcyJ9.signature_hash_99",
          "token_type": "Bearer",
          "expires_in": 3600
        });
      } else if (simEndpoint === 'jobs') {
        if (simMethod === 'GET') {
          setSimResponse([
            {
              "job_id": "JOB-2026-00123",
              "hub_id": "HUB-045",
              "pickup_location": {
                "name": "Mombasa Hub 1",
                "lat": -4.0435,
                "lng": 39.6682,
                "address": "Makupa, Mombasa"
              },
              "dropoffs": [
                {
                  "delivery_id": "DEL-77801",
                  "merchant_code": "M123456",
                  "shop_name": "Mama Sarah Duka",
                  "lat": -4.0500,
                  "lng": 39.6700,
                  "address": "Kisauni, Mombasa",
                  "items": [
                    { "sku": "PEMBE-2KG", "qty": 20 },
                    { "sku": "BROOKSIDE-500ML", "qty": 40 }
                  ]
                }
              ],
              "scheduled_window": {
                "start": "2026-07-14T08:00:00+03:00",
                "end": "2026-07-14T18:00:00+03:00"
              },
              "nx_reference": "NX-ORDER-78901",
              "status": "open",
              "created_at": "2026-07-13T10:00:00+03:00"
            }
          ]);
        } else {
          setSimResponse({
            "job_id": "JOB-2026-00123",
            "status": "assigned",
            "assigned_at": new Date().toISOString()
          });
        }
      } else if (simEndpoint === 'confirm') {
        setSimResponse({
          "delivery_id": "DEL-77801",
          "status": "delivered",
          "delivered_at": new Date().toISOString(),
          "nx_invoice": {
            "invoice_id": "INV-2026-7788",
            "invoice_total_kes": 12000,
            "nx_offset_kes": 4800,
            "cash_due_kes": 7200,
            "nx_balance_before_kes": 5000,
            "nx_balance_after_kes": 200,
            "settlement_cap_applied": 0.6
          }
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
      setSimBody(JSON.stringify({ partner_id: "PARTNER-001", api_key: "nx_logistics_7718aa" }, null, 2));
    } else if (endpoint === 'jobs') {
      setSimMethod('GET');
      setSimBody('');
    } else if (endpoint === 'accept') {
      setSimMethod('POST');
      setSimBody(JSON.stringify({ fleet_id: "FLEET-01", driver_id: "DRV-552", vehicle_plate: "KDA 123A" }, null, 2));
    } else if (endpoint === 'confirm') {
      setSimMethod('POST');
      setSimBody(JSON.stringify({
        merchant_code: "M123456",
        delivered_items: [
          { sku: "PEMBE-2KG", qty: 20 },
          { sku: "BROOKSIDE-500ML", qty: 40 }
        ],
        signature_code: "1234",
        proof_photo_url: "https://cdn.nx-network.com/proof/JOB-2026-00123-DEL-77801.jpg"
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
            className="flex items-center gap-1.5 hover:text-nx-paper transition-colors cursor-pointer"
          >
            {copiedText === examples.title ? (
              <>
                <Check className="w-3.5 h-3.5 text-nx-green" />
                <span className="text-nx-green">Copied!</span>
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

  // Auth snippets
  const authCode: CodeExample = {
    title: "auth",
    curl: `curl -X POST https://api.nx-network.com/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "partner_id": "PARTNER-001",
    "api_key": "your_api_key_here"
  }'`,
    javascript: `fetch('https://api.nx-network.com/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    partner_id: 'PARTNER-001',
    api_key: 'your_api_key_here'
  })
})
.then(res => res.json())
.then(data => console.log(data.access_token));`,
    python: `import requests

url = "https://api.nx-network.com/v1/auth/login"
payload = {
    "partner_id": "PARTNER-001",
    "api_key": "your_api_key_here"
}

response = requests.post(url, json=payload)
token = response.json().get("access_token")
print(token)`
  };

  // Jobs retrieval snippets
  const jobsCode: CodeExample = {
    title: "jobs",
    curl: `curl -X GET "https://api.nx-network.com/v1/jobs?status=open&region=Mombasa" \\
  -H "Authorization: Bearer <your_access_token>"`,
    javascript: `fetch('https://api.nx-network.com/v1/jobs?status=open&region=Mombasa', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
})
.then(res => res.json())
.then(jobs => console.log(jobs));`,
    python: `import requests

url = "https://api.nx-network.com/v1/jobs"
headers = {
    "Authorization": "Bearer " + access_token
}
params = {
    "status": "open",
    "region": "Mombasa"
}

response = requests.get(url, headers=headers, params=params)
jobs = response.json()
print(jobs)`
  };

  // Confirm delivery snippets
  const confirmCode: CodeExample = {
    title: "confirm",
    curl: `curl -X POST https://api.nx-network.com/v1/jobs/JOB-2026-00123/deliveries/DEL-77801/confirm \\
  -H "Authorization: Bearer <your_access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchant_code": "M123456",
    "delivered_items": [
      { "sku": "PEMBE-2KG", "qty": 20 },
      { "sku": "BROOKSIDE-500ML", "qty": 40 }
    ],
    "signature_code": "1234",
    "proof_photo_url": "https://cdn.nx-network.com/proof/photo.jpg"
  }'`,
    javascript: `fetch('https://api.nx-network.com/v1/jobs/JOB-2026-00123/deliveries/DEL-77801/confirm', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    merchant_code: 'M123456',
    delivered_items: [
      { sku: 'PEMBE-2KG', qty: 20 },
      { sku: 'BROOKSIDE-500ML', qty: 40 }
    ],
    signature_code: '1234',
    proof_photo_url: 'https://cdn.nx-network.com/proof/photo.jpg'
  })
})
.then(res => res.json())
.then(result => console.log(result));`,
    python: `import requests

url = "https://api.nx-network.com/v1/jobs/JOB-2026-00123/deliveries/DEL-77801/confirm"
headers = {
    "Authorization": "Bearer " + access_token,
    "Content-Type": "application/json"
}
payload = {
    "merchant_code": "M123456",
    "delivered_items": [
        { "sku": "PEMBE-2KG", "qty": 20 },
        { "sku": "BROOKSIDE-500ML", "qty": 40 }
    ],
    "signature_code": "1234",
    "proof_photo_url": "https://cdn.nx-network.com/proof/photo.jpg"
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
              Logistics API v1.2.0
            </span>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-nx-muted font-mono">
            <Server className="w-3.5 h-3.5 text-nx-green" />
            <span>Sandbox: https://sandbox.api.nx-network.com/v1</span>
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
                API Reference
              </h3>
            </div>
            
            <nav className="space-y-1">
              {[
                { id: 'overview', label: '1. Overview', icon: FileText },
                { id: 'auth', label: '2. Authentication', icon: Key },
                { id: 'jobs', label: '3. Delivery Jobs', icon: Terminal },
                { id: 'deliveries', label: '4. Dropoff Confirmation', icon: Shield },
                { id: 'earnings', label: '5. Earnings & Metrics', icon: Activity },
                { id: 'webhooks', label: '6. Webhooks', icon: Webhook },
                { id: 'sandbox', label: '7. Interactive Sandbox', icon: RefreshCw },
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
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${activeTab === item.id ? 'text-nx-amber' : 'text-nx-muted'}`} />
                      <span>{item.label}</span>
                    </div>
                    {activeTab === item.id && <ChevronRight className="w-3.5 h-3.5 text-nx-amber" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 p-4 bg-nx-card rounded-xl border border-nx-border space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono text-nx-amber uppercase font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Development Kit</span>
              </div>
              <p className="text-[11px] text-[#b5b3aa] leading-relaxed">
                Need automated scripts? Head over to our Interactive Sandbox tab to test live mockup calls directly inside this window.
              </p>
            </div>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="lg:col-span-9 bg-nx-card border border-nx-border rounded-2xl p-6 md:p-8 min-h-[600px] flex flex-col justify-between overflow-hidden">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* LANGUAGE SWITCHER FOR CODE EXAMPLES (ONLY IF APPLICABLE) */}
              {['auth', 'jobs', 'deliveries'].includes(activeTab) && (
                <div className="flex items-center justify-between border-b border-nx-border pb-4 mb-4">
                  <div className="text-xs font-mono font-bold text-nx-amber tracking-wider uppercase flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-nx-amber" />
                    <span>Client Code Generators</span>
                  </div>
                  <div className="flex bg-[#060810] border border-nx-border p-1 rounded-lg">
                    {(['curl', 'javascript', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLangTab(lang)}
                        className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md cursor-pointer transition-all ${
                          langTab === lang 
                            ? 'bg-nx-amber text-nx-ink font-bold shadow-md' 
                            : 'text-nx-muted hover:text-nx-paper'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* OVERVIEW SECTION */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="font-display text-3xl text-nx-paper tracking-wider uppercase">Logistics &amp; Delivery API</h1>
                    <p className="font-serif text-lg text-[#b5b3aa] leading-relaxed">
                      NX owns demand, software, and settlement, while trusted logistics and delivery partners handle last-mile fulfillment.
                    </p>
                  </div>

                  <div className="p-5 bg-nx-amber/5 border border-nx-amber/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-nx-amber text-xs font-mono uppercase font-bold">
                      <Shield className="w-4 h-4" />
                      <span>Ecosystem Architecture</span>
                    </div>
                    <p className="text-xs text-nx-paper/80 leading-relaxed">
                      This API provides an interface for partners to retrieve grouped delivery tasks (Jobs), claim them, track status milestones, and confirm dropoffs at individual duka merchants. 
                      <strong> When a delivery is confirmed, NX automatically processes customer balance-offsets, updates inventory ledgers, and books settlement commissions in real-time.</strong>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-mono text-sm text-nx-paper uppercase font-bold tracking-wider">Core Network Entities</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#060810] border border-nx-border rounded-xl">
                        <div className="text-xs font-mono text-nx-amber uppercase font-bold mb-1">Job (Grouped Delivery)</div>
                        <p className="text-[11px] text-nx-muted leading-relaxed">
                          A clustered routing task originating from a Mombasa Wholesaler Hub targeting multiple nearby dukas.
                        </p>
                      </div>
                      <div className="p-4 bg-[#060810] border border-nx-border rounded-xl">
                        <div className="text-xs font-mono text-nx-amber uppercase font-bold mb-1">Duka / Merchant</div>
                        <p className="text-[11px] text-nx-muted leading-relaxed">
                          The end storefront retailer identified by an alphanumeric code (e.g. <code className="text-nx-green">M123456</code>).
                        </p>
                      </div>
                      <div className="p-4 bg-[#060810] border border-nx-border rounded-xl">
                        <div className="text-xs font-mono text-nx-amber uppercase font-bold mb-1">Settlement Offset</div>
                        <p className="text-[11px] text-nx-muted leading-relaxed">
                          NX ledger deductions applied to the FMCG invoice, driven by customer-earned units, reducing cash requirements.
                        </p>
                      </div>
                      <div className="p-4 bg-[#060810] border border-nx-border rounded-xl">
                        <div className="text-xs font-mono text-nx-amber uppercase font-bold mb-1">SLA Trackers</div>
                        <p className="text-[11px] text-nx-muted leading-relaxed">
                          Performance telemetry (on-time rate, completion latency) utilized by NX routing engines to prioritize job dispatch.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-nx-border">
                    <h3 className="font-mono text-sm text-nx-paper uppercase font-bold tracking-wider">Getting Started Checklist</h3>
                    <ol className="space-y-2.5 text-xs text-[#b5b3aa] list-decimal pl-4">
                      <li>Request API credentials (<code>partner_id</code> and <code>api_key</code>) from the NX Partners Portal onboarding team.</li>
                      <li>Initiate security handshake with <code className="text-nx-green">POST /auth/login</code> to obtain your expiring JWT token.</li>
                      <li>Provide your signed <code className="text-nx-amber">Webhook URL</code> inside the Partners Portal to stream incoming job offers dynamically without high-frequency polling.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* AUTHENTICATION SECTION */}
              {activeTab === 'auth' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-mono text-xl text-nx-paper uppercase font-bold">Authentication</h2>
                    <p className="text-xs text-nx-muted leading-relaxed mt-1">
                      Authenticate request chains using securely dispatched bearer tokens. Bearer credentials expire every 60 minutes.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-[#060810] border border-nx-border rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="bg-nx-green/10 text-nx-green px-2 py-0.5 rounded font-bold uppercase">POST</span>
                        <span className="text-nx-paper font-bold">/auth/login</span>
                      </div>
                      <div className="text-[11px] text-[#b5b3aa]">
                        Generates a secure Bearer access token valid for API operations. Rate-limited to 5 failures per minute per IP.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-mono font-bold text-nx-paper">Request Payload Specifications</div>
                      <table className="w-full text-left text-xs border border-nx-border rounded-lg overflow-hidden font-mono">
                        <thead className="bg-[#0a0d1a] border-b border-nx-border">
                          <tr>
                            <th className="p-2.5 text-nx-amber">Field</th>
                            <th className="p-2.5 text-nx-amber">Type</th>
                            <th className="p-2.5 text-nx-amber">Presence</th>
                            <th className="p-2.5 text-nx-amber">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-nx-border/50">
                            <td className="p-2.5">partner_id</td>
                            <td className="p-2.5 text-nx-muted">string</td>
                            <td className="p-2.5 text-nx-green">Required</td>
                            <td className="p-2.5 text-nx-muted text-[11px]">Assigned identifier, e.g., "PARTNER-001"</td>
                          </tr>
                          <tr>
                            <td className="p-2.5">api_key</td>
                            <td className="p-2.5 text-nx-muted">string</td>
                            <td className="p-2.5 text-nx-green">Required</td>
                            <td className="p-2.5 text-nx-muted text-[11px]">Hex secret issued via portal</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono font-bold text-nx-paper">Code Implementation Example</div>
                      {renderCodeSnippet(authCode)}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-mono font-bold text-nx-paper">Expected Response (Status 200)</div>
                      <pre className="p-4 bg-[#060810] border border-nx-border rounded-xl font-mono text-[11px] text-nx-green overflow-x-auto leading-relaxed">
{`{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InBhcnRuZXItMDAxIiwicm9sZSI6ImxvZ2lzdGljcyJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* JOBS SECTION */}
              {activeTab === 'jobs' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-mono text-xl text-nx-paper uppercase font-bold">Jobs Dispatch</h2>
                    <p className="text-xs text-nx-muted leading-relaxed mt-1">
                      Inspect and pull open aggregated routing jobs, accept responsibilities, and update status logs.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-[#060810] border border-nx-border rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">GET</span>
                        <span className="text-nx-paper font-bold">/jobs</span>
                      </div>
                      <div className="text-[11px] text-[#b5b3aa]">
                        Lists open, assigned, or completed routing tasks based on query variables.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-mono font-bold text-nx-paper">Query Parameters</div>
                      <ul className="space-y-1.5 text-[11px] font-mono text-[#b5b3aa] bg-[#060810] p-3 rounded-lg border border-nx-border">
                        <li><span className="text-nx-amber">status</span>: <code className="text-nx-green">open | assigned | in_transit | completed | failed</code></li>
                        <li><span className="text-nx-amber">region</span>: Mombasa | Kisauni (optional)</li>
                        <li><span className="text-nx-amber">date_from / date_to</span>: ISO 8601 timestamps (optional)</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono font-bold text-nx-paper">Client Call Generator</div>
                      {renderCodeSnippet(jobsCode)}
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono font-bold text-nx-paper">Action: Accept Job (POST `/jobs/{"{job_id}"}/accept`)</div>
                      <p className="text-xs text-nx-muted leading-relaxed">
                        Claim an open aggregated routing task. Automatically transitions job state to <code className="text-nx-amber">assigned</code> inside NX ledger.
                      </p>
                      <pre className="p-4 bg-[#060810] border border-nx-border rounded-xl font-mono text-[11px] text-nx-amber overflow-x-auto">
{`// REQUEST BODY (POST /jobs/JOB-2026-00123/accept)
{
  "fleet_id": "FLEET-01",
  "driver_id": "DRV-552",
  "vehicle_plate": "KDA 123A"
}

// SUCCESS RESPONSE (Status 200)
{
  "job_id": "JOB-2026-00123",
  "status": "assigned",
  "assigned_at": "2026-07-13T10:05:00+03:00"
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* CONFIRMATIONS SECTION */}
              {activeTab === 'deliveries' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-mono text-xl text-nx-paper uppercase font-bold">Dropoff Confirmation &amp; Settlement</h2>
                    <p className="text-xs text-nx-muted leading-relaxed mt-1">
                      Confirm duka dropoff accomplishments to trigger instant restock offsets and invoice computation logic.
                    </p>
                  </div>

                  <div className="p-4 bg-nx-amber/5 border border-nx-amber/10 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-nx-amber">
                      <AlertCircle className="w-4 h-4" />
                      <span>Ledger Settlement Core</span>
                    </div>
                    <p className="text-[11px] text-[#b5b3aa] leading-relaxed">
                      This is where NX's software-centric clearing happens: the driver confirms delivery quantities, and NX translates the duka owner's accumulated loyalty balance directly into a partial restock discount. The remaining cash due is recalculated on-the-fly and stored securely.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-[#060810] border border-nx-border rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="bg-nx-green/10 text-nx-green px-2 py-0.5 rounded font-bold uppercase">POST</span>
                        <span className="text-nx-paper font-bold">/jobs/{"{job_id}"}/deliveries/{"{delivery_id}"}/confirm</span>
                      </div>
                      <div className="text-[11px] text-[#b5b3aa]">
                        Submits fulfillment verification details, locking delivery data, recalculating invoice balance, and applying offsets.
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono font-bold text-nx-paper">Fulfillment Handshake Code</div>
                      {renderCodeSnippet(confirmCode)}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-mono font-bold text-nx-paper">Recalculated Ledger Response (Status 200)</div>
                      <pre className="p-4 bg-[#060810] border border-nx-border rounded-xl font-mono text-[11px] text-[#00ff88] overflow-x-auto leading-relaxed">
{`{
  "delivery_id": "DEL-77801",
  "status": "delivered",
  "delivered_at": "2026-07-13T12:15:00+03:00",
  "nx_invoice": {
    "invoice_id": "INV-2026-7788",
    "invoice_total_kes": 12000,
    "nx_offset_kes": 4800,
    "cash_due_kes": 7200,
    "nx_balance_before_kes": 5000,
    "nx_balance_after_kes": 200,
    "settlement_cap_applied": 0.6
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* EARNINGS & SLAS */}
              {activeTab === 'earnings' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-mono text-xl text-nx-paper uppercase font-bold">Earnings &amp; Metrics</h2>
                    <p className="text-xs text-nx-muted leading-relaxed mt-1">
                      Monitor logistics commissions, performance metrics, and compliance scoreboards.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="text-xs font-mono font-bold text-nx-amber uppercase">GET /partners/earnings</div>
                      <p className="text-xs text-nx-muted leading-relaxed">
                        Reconcile partner commissions accumulated over periods.
                      </p>
                      <pre className="p-4 bg-[#060810] border border-nx-border rounded-xl font-mono text-[10px] text-nx-paper overflow-x-auto leading-normal">
{`// GET /partners/earnings?month=2026-07
{
  "partner_id": "PARTNER-001",
  "period": "2026-07",
  "jobs_completed": 320,
  "total_commission_kes": 185000,
  "average_commission_per_job_kes": 578
}`}
                      </pre>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono font-bold text-nx-amber uppercase">GET /partners/metrics</div>
                      <p className="text-xs text-nx-muted leading-relaxed">
                        Inspect service levels. High metrics prioritize routing assignment.
                      </p>
                      <pre className="p-4 bg-[#060810] border border-nx-border rounded-xl font-mono text-[10px] text-nx-paper overflow-x-auto leading-normal">
{`// GET /partners/metrics
{
  "partner_id": "PARTNER-001",
  "on_time_delivery_rate": 0.93,
  "average_job_completion_minutes": 145,
  "failed_jobs": 7,
  "average_dropoffs_per_job": 4.2
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* WEBHOOKS */}
              {activeTab === 'webhooks' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-mono text-xl text-nx-paper uppercase font-bold">Webhooks</h2>
                    <p className="text-xs text-nx-muted leading-relaxed mt-1">
                      Subscribe to system state triggers instead of polling.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-nx-amber/5 border border-nx-amber/10 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-nx-amber">
                        <Webhook className="w-4 h-4" />
                        <span>Security &amp; Signature Validation</span>
                      </div>
                      <p className="text-[11px] text-[#b5b3aa] leading-relaxed">
                        NX signs payloads via standard HMAC-SHA256 hash. The signature is attached inside the header: <code className="text-nx-green">X-NX-Signature</code>. Partners must hash raw body buffers using the assigned webhook secret and check equality before digesting contents.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-mono font-bold text-nx-paper">Payload Schema Example (delivery_job.created)</div>
                      <pre className="p-4 bg-[#060810] border border-nx-border rounded-xl font-mono text-[11px] text-nx-muted overflow-x-auto leading-normal">
{`{
  "event": "delivery_job.created",
  "sent_at": "2026-07-13T10:01:00+03:00",
  "job": {
    "job_id": "JOB-2026-00123",
    "hub_id": "HUB-045",
    "pickup_location": {
      "name": "Mombasa Hub 1",
      "lat": -4.0435,
      "lng": 39.6682,
      "address": "Makupa, Mombasa"
    },
    "dropoffs": [
      {
        "delivery_id": "DEL-77801",
        "merchant_code": "M123456",
        "shop_name": "Mama Sarah Duka",
        "lat": -4.05,
        "lng": 39.67,
        "items": [
          { "sku": "PEMBE-2KG", "qty": 20 }
        ]
      }
    ]
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE SANDBOX PLAYGROUND */}
              {activeTab === 'sandbox' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-mono text-xl text-nx-paper uppercase font-bold">Interactive API Playground</h2>
                    <p className="text-xs text-nx-muted leading-relaxed mt-1">
                      Execute simulated transactions against sandbox routers to inspect responses.
                    </p>
                  </div>

                  <div className="grid lg:grid-cols-12 gap-6 bg-[#060810] border border-nx-border rounded-2xl p-4 md:p-6">
                    <div className="lg:col-span-5 space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono uppercase text-nx-amber">Select Endpoint</label>
                        <select 
                          value={simEndpoint} 
                          onChange={(e) => changeSimEndpoint(e.target.value)}
                          className="w-full bg-[#0a0d1a] border border-nx-border rounded-lg p-2 text-xs font-mono text-nx-paper outline-none focus:border-nx-amber"
                        >
                          <option value="auth">POST /auth/login</option>
                          <option value="jobs">GET /jobs</option>
                          <option value="accept">POST /jobs/accept</option>
                          <option value="confirm">POST /deliveries/confirm</option>
                        </select>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                          <label className="block text-[10px] font-mono text-nx-muted uppercase">HTTP Method</label>
                          <div className="bg-[#0a0d1a] border border-nx-border rounded-lg p-2 text-xs font-mono font-bold text-nx-green text-center">
                            {simMethod}
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="block text-[10px] font-mono text-nx-muted uppercase">Target Server</label>
                          <div className="bg-[#0a0d1a] border border-nx-border rounded-lg p-2 text-[10px] font-mono text-nx-amber/80 text-center truncate">
                            sandbox-env
                          </div>
                        </div>
                      </div>

                      {simBody && (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-mono uppercase text-nx-amber">Payload Template</label>
                          <textarea 
                            rows={6}
                            value={simBody}
                            onChange={(e) => setSimBody(e.target.value)}
                            className="w-full bg-[#0a0d1a] border border-nx-border rounded-lg p-3 text-[11px] font-mono text-nx-paper outline-none focus:border-nx-amber resize-none"
                          />
                        </div>
                      )}

                      <button
                        onClick={runSimulatedRequest}
                        disabled={simLoading}
                        className="w-full py-3 bg-nx-green text-black font-mono text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-nx-green/90 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {simLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Dispatching Transaction...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 text-black fill-black" />
                            <span>Test Request</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="lg:col-span-7 flex flex-col justify-between border-l border-nx-border/55 pl-0 lg:pl-6 pt-6 lg:pt-0">
                      <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
                        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-nx-muted">
                          <span>Terminal Output</span>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-nx-green animate-pulse" />
                            Active
                          </span>
                        </div>
                        
                        <div className="flex-1 bg-black rounded-xl p-4 border border-nx-border font-mono text-xs overflow-auto flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="text-nx-muted"># Connecting to sandbox.api.nx-network.com/v1...</div>
                            {simLoading && <div className="text-nx-amber animate-pulse"># Handshake initiated... calculating settlement offsets...</div>}
                            
                            {simResponse && (
                              <pre className="text-[11px] text-[#00ff88] leading-normal whitespace-pre-wrap">
                                {JSON.stringify(simResponse, null, 2)}
                              </pre>
                            )}
                            
                            {!simLoading && !simResponse && (
                              <div className="text-[#555] text-center my-12">
                                Press "Test Request" to run sandbox logic.
                              </div>
                            )}
                          </div>
                          
                          <div className="text-[9px] text-[#444] text-right mt-4 select-none">
                            NX Core Sandbox v1.2.0
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer inside content panel */}
          <footer className="mt-12 pt-6 border-t border-nx-border text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-nx-muted font-mono">
            <span>© 2026 NX Network Ecosystem.</span>
            <div className="flex gap-4">
              <a href="#privacy" className="hover:text-nx-paper transition-colors">Security Policy</a>
              <span>•</span>
              <a href="#support" className="hover:text-nx-paper transition-colors">Developer Support</a>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}
