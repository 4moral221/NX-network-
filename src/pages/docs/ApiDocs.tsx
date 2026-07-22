import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NXLogo from '../../components/NXLogo';

export default function ApiDocs() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#030407] font-sans selection:bg-nx-amber/30 selection:text-white flex flex-col relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Core grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />
        
        {/* Subtle radial glow for depth */}
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-nx-amber/5 rounded-full blur-[150px] opacity-30" />
        <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] opacity-20" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030407]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:opacity-80 transition-opacity flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <ArrowLeft className="w-4 h-4 text-nx-muted group-hover:text-nx-paper transition-colors" />
              </div>
            </Link>
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <NXLogo />
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-nx-paper">Developer APIs</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative z-10 pt-32 pb-24 px-6">
        <div id="developer-api" className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.4em] text-nx-green mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] shadow-[0_0_8px_rgba(62,207,142,0.8)] animate-pulse shrink-0" />
            For developers &amp; partners
          </div>
          <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-none tracking-tight text-nx-paper mb-6 uppercase">
            Plug into the network.
          </h2>
          <p className="text-base text-nx-muted max-w-xl leading-relaxed mb-16">
            Two APIs give partners direct access to merchant demand and transaction data — the same infrastructure powering NX Network's duka operations across Kenya.
          </p>

          <div className="grid gap-8 md:grid-cols-2">

            {/* LOGISTICS API */}
            <div className="bg-[#0a0d14] border border-nx-border rounded-xl overflow-hidden hover:border-[#3ecf8e]/30 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center gap-2 px-6 py-4 bg-[#0a0d14] border-b border-nx-border">
                  <span className="w-2.5 h-2.5 rounded-full bg-nx-border group-hover:bg-red-500/50 transition-colors" />
                  <span className="w-2.5 h-2.5 rounded-full bg-nx-border group-hover:bg-amber-500/50 transition-colors" />
                  <span className="w-2.5 h-2.5 rounded-full bg-nx-border group-hover:bg-green-500/50 transition-colors" />
                  <span className="font-mono text-xs text-nx-muted ml-2">logistics-api</span>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-baseline justify-between flex-wrap gap-3">
                    <span className="font-serif text-2xl text-nx-paper font-semibold tracking-tight">Logistics API</span>
                    <span className="font-mono text-[10px] text-[#3ecf8e] bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest">● live</span>
                  </div>
                  <p className="text-xs text-[#b5b3aa] leading-relaxed">
                    Aggregated restock demand from merchant clusters, batched by SKU and location. Built for FMCG partners and distributors who need real-time visibility into what informal retail actually needs, before it runs out.
                  </p>

                  <div className="flex items-center gap-3 font-mono text-xs bg-black/60 border border-nx-border rounded-lg p-3.5 overflow-x-auto">
                    <span className="font-bold text-[#3ecf8e] shrink-0">GET</span>
                    <span className="text-nx-paper whitespace-nowrap">/v1/logistics/demand-board</span>
                  </div>

                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-nx-muted mb-2">Query params</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-nx-border">
                            <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-nx-muted font-bold">Param</th>
                            <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-nx-muted font-bold">Type</th>
                            <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-nx-muted font-bold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-nx-border/30 text-[#b5b3aa]">
                          <tr>
                            <td className="py-2.5 pr-2"><code className="font-mono text-[11px] text-nx-paper bg-white/5 px-1.5 py-0.5 rounded border border-white/10">region</code></td>
                            <td className="py-2.5 pr-2 text-[11px]">string</td>
                            <td className="py-2.5 text-nx-muted">Filter by county or cluster code</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 pr-2"><code className="font-mono text-[11px] text-nx-paper bg-white/5 px-1.5 py-0.5 rounded border border-white/10">sku_category</code></td>
                            <td className="py-2.5 pr-2 text-[11px]">string</td>
                            <td className="py-2.5 text-nx-muted">Optional — filter demand by product category</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 pr-2"><code className="font-mono text-[11px] text-nx-paper bg-white/5 px-1.5 py-0.5 rounded border border-white/10">min_batch_size</code></td>
                            <td className="py-2.5 pr-2 text-[11px]">integer</td>
                            <td className="py-2.5 text-nx-muted">Only return batches at or above this unit threshold</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-nx-muted mb-2">Sample response</div>
                    <pre className="bg-black/80 border border-nx-border rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto text-[#b5b5b1]">
                      <code>
                        <span className="text-nx-muted">{"// 200 OK\n"}</span>
                        {"{\n"}
                        <span className="text-blue-400">{"  \"region\""}</span>{": \"mombasa-central\",\n"}
                        <span className="text-blue-400">{"  \"batches\""}</span>{": [\n"}
                        {"    {\n"}
                        <span className="text-blue-400">{"      \"sku\""}</span>{": \"cooking-oil-2l\",\n"}
                        <span className="text-blue-400">{"      \"merchant_count\""}</span>{": "}<span className="text-nx-amber">34</span>{",\n"}
                        <span className="text-blue-400">{"      \"total_units\""}</span>{": "}<span className="text-nx-amber">612</span>{",\n"}
                        <span className="text-blue-400">{"      \"status\""}</span>{": \"open\"\n"}
                        {"    }\n"}
                        {"  ]\n"}
                        {"}\n"}
                      </code>
                    </pre>
                  </div>

                  <div className="pt-4 border-t border-nx-border/50 flex justify-between items-center flex-wrap gap-2 mt-auto">
                    <span className="text-[10px] font-mono uppercase text-nx-muted">Jobs &amp; Unit Economics included</span>
                    <Link to="/docs/logistics" className="text-xs font-mono font-bold text-[#3ecf8e] hover:text-[#57d9a0] flex items-center gap-1.5 transition-colors">
                      Explore Logistics Docs →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* SALES ANALYTICS API */}
            <div className="bg-[#0a0d14] border border-nx-border rounded-xl overflow-hidden hover:border-[#3ecf8e]/30 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center gap-2 px-6 py-4 bg-[#0a0d14] border-b border-nx-border">
                  <span className="w-2.5 h-2.5 rounded-full bg-nx-border group-hover:bg-red-500/50 transition-colors" />
                  <span className="w-2.5 h-2.5 rounded-full bg-nx-border group-hover:bg-amber-500/50 transition-colors" />
                  <span className="w-2.5 h-2.5 rounded-full bg-nx-border group-hover:bg-green-500/50 transition-colors" />
                  <span className="font-mono text-xs text-nx-muted ml-2">sales-analytics-api</span>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-baseline justify-between flex-wrap gap-3">
                    <span className="font-serif text-2xl text-nx-paper font-semibold tracking-tight">Sales Analytics API</span>
                    <span className="font-mono text-[10px] text-[#3ecf8e] bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 px-2.5 py-0.5 rounded-full uppercase tracking-widest">● live</span>
                  </div>
                  <p className="text-xs text-[#b5b3aa] leading-relaxed">
                    Transaction-level insight across the merchant network — volume, NX issuance, and margin trends. Built for partners who need to understand demand patterns, not just fulfill them.
                  </p>

                  <div className="flex items-center gap-3 font-mono text-xs bg-black/60 border border-nx-border rounded-lg p-3.5 overflow-x-auto">
                    <span className="font-bold text-[#3ecf8e] shrink-0">GET</span>
                    <span className="text-nx-paper whitespace-nowrap">/v1/analytics/sales-summary</span>
                  </div>

                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-nx-muted mb-2">Query params</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-nx-border">
                            <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-nx-muted font-bold">Param</th>
                            <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-nx-muted font-bold">Type</th>
                            <th className="pb-2 font-mono text-[9px] uppercase tracking-widest text-nx-muted font-bold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-nx-border/30 text-[#b5b3aa]">
                          <tr>
                            <td className="py-2.5 pr-2"><code className="font-mono text-[11px] text-nx-paper bg-white/5 px-1.5 py-0.5 rounded border border-white/10">partner_id</code><span className="text-amber-500 font-mono text-[9px] ml-1">req</span></td>
                            <td className="py-2.5 pr-2 text-[11px]">string</td>
                            <td className="py-2.5 text-nx-muted">Issued with your credentials</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 pr-2"><code className="font-mono text-[11px] text-nx-paper bg-white/5 px-1.5 py-0.5 rounded border border-white/10">date_from</code></td>
                            <td className="py-2.5 pr-2 text-[11px]">date</td>
                            <td className="py-2.5 text-nx-muted">ISO 8601 — defaults to last 30d</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 pr-2"><code className="font-mono text-[11px] text-nx-paper bg-white/5 px-1.5 py-0.5 rounded border border-white/10">date_to</code></td>
                            <td className="py-2.5 pr-2 text-[11px]">date</td>
                            <td className="py-2.5 text-nx-muted">ISO 8601</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 pr-2"><code className="font-mono text-[11px] text-nx-paper bg-white/5 px-1.5 py-0.5 rounded border border-white/10">group_by</code></td>
                            <td className="py-2.5 pr-2 text-[11px]">string</td>
                            <td className="py-2.5 text-nx-muted">One of <code className="font-mono text-[10px] bg-white/5 px-1 rounded border border-white/10">region</code>, <code className="font-mono text-[10px] bg-white/5 px-1 rounded border border-white/10">tier</code>, <code className="font-mono text-[10px] bg-white/5 px-1 rounded border border-white/10">sku</code></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-nx-border/50 flex justify-between items-center flex-wrap gap-2 mt-auto">
                    <span className="text-[10px] font-mono uppercase text-nx-muted">Top Movers &amp; Market Penetration included</span>
                    <Link to="/docs/sales-analytics" className="text-xs font-mono font-bold text-[#3ecf8e] hover:text-[#57d9a0] flex items-center gap-1.5 transition-colors">
                      Explore Analytics Docs →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
