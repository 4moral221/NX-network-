import fs from 'fs';

const path = 'src/pages/pwa/MerchantDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("const [subPage, setSubPage] = useState(1);")) {
  content = content.replace(/const \[subMerchants, setSubMerchants\] = useState<any\[\]>\(\[\]\);/, "const [subMerchants, setSubMerchants] = useState<any[]>([]);\n  const [subPage, setSubPage] = useState(1);");
}

if (!content.includes("Sub-Merchant Directory")) {
  const directoryUI = `
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest text-nx-muted font-bold">Sub-Merchant Directory</h4>
              {subMerchants.length === 0 ? (
                <div className="text-center py-8 text-nx-muted text-xs border border-dashed border-nx-border rounded-xl">
                  No sub-merchants yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {subMerchants.slice((subPage - 1) * 3, subPage * 3).map((sub, i) => (
                    <div key={i} className="bg-nx-card border border-nx-border rounded-xl p-4 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-nx-paper font-bold">{sub.name || "Unnamed Shop"}</div>
                        <div className="text-[9px] text-nx-muted uppercase tracking-tighter">
                          Code: {sub.merchant_code} | {sub.location || 'Unknown location'}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-nx-amber font-bold">{sub.tier || 'BASIC'}</div>
                    </div>
                  ))}
                  
                  {subMerchants.length > 3 && (
                    <div className="flex justify-between items-center pt-2">
                      <button 
                        onClick={() => setSubPage(p => Math.max(1, p - 1))}
                        disabled={subPage === 1}
                        className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-nx-paper disabled:opacity-50 border border-nx-border rounded"
                      >
                        Prev
                      </button>
                      <span className="text-[9px] text-nx-muted uppercase font-mono">Page {subPage} of {Math.ceil(subMerchants.length / 3)}</span>
                      <button 
                        onClick={() => setSubPage(p => Math.min(Math.ceil(subMerchants.length / 3), p + 1))}
                        disabled={subPage >= Math.ceil(subMerchants.length / 3)}
                        className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-nx-paper disabled:opacity-50 border border-nx-border rounded"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
`;
  content = content.replace(/<h4 className="text-\[10px\] uppercase tracking-widest text-nx-muted font-bold">Recent Commissions<\/h4>/, directoryUI + "\n            <div className=\"space-y-4 mt-6\">\n              <h4 className=\"text-[10px] uppercase tracking-widest text-nx-muted font-bold\">Recent Commissions</h4>");
}

fs.writeFileSync(path, content);
console.log("MerchantDashboard modified.");
