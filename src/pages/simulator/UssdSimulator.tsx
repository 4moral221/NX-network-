import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, RotateCcw, Smartphone, Wifi, Signal, Terminal, Shield, Phone, Globe, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'react-hot-toast';

interface LogEntry {
  type: 'DIAL' | 'IN' | 'CON' | 'END' | 'ERR';
  content: string;
  time: string;
  extra?: string;
}

export default function UssdSimulator() {
  const defaultFnUrl = '/api/ussd';
  
  const [fnUrl, setFnUrl] = useState(defaultFnUrl);
  const [phone, setPhone] = useState('254700000002');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [textParts, setTextParts] = useState<string[]>([]);
  const [screen, setScreen] = useState('Dial *384*6180# to begin a session.');
  const [input, setInput] = useState('');
  const [isEnd, setIsEnd] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'active' | 'ended' | 'error'>('idle');
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const logBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const testScenarios = [
    { label: 'New Customer', phone: '254700000001' },
    { label: 'Basic Merchant', phone: '254711111111' },
    { label: 'Hub Merchant (Overdue)', phone: '254722222222' },
  ];

  useEffect(() => {
    if (logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
    }
  }, [logs]);

  // Focus input automatically after sending, on screen changes
  useEffect(() => {
    if (!isEnd && isActive && !loading) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isEnd, isActive, loading]);

  const addLog = (type: LogEntry['type'], content: string, extra?: string) => {
    const entry: LogEntry = {
      type,
      content,
      time: new Date().toLocaleTimeString('en-KE', { hour12: false }),
      extra
    };
    setLogs(prev => [...prev, entry]);
  };

  const handlePhoneChange = (val: string) => {
    let cleanVal = val.replace(/[^\d+]/g, '');
    if (cleanVal.startsWith('0')) {
      cleanVal = '254' + cleanVal.substring(1);
    }
    setPhone(cleanVal);
  };

  const computeHMAC = async (secret: string, body: string) => {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const simCall = async (text: string) => {
    if (!fnUrl) {
      addLog('ERR', 'No USSD Endpoint URL set.');
      setErrorBanner('Configuration Fail: No USSD endpoint URL has been provided.');
      return null;
    }

    setLoading(true);
    setErrorBanner(null);

    const params = {
      sessionId,
      phoneNumber: phone,
      text: text,
      ussdMode: 'local_only'
    };

    // Auto-proxy any direct Supabase calls to avoid browser CORS errors and handle nx-ussd mapping
    let finalUrl = fnUrl;
    if (fnUrl.includes('supabase.co') || fnUrl.includes('supabase.com')) {
      params.ussdMode = 'edge';
      finalUrl = '/api/ussd';
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (secret) {
      try {
        headers['X-AT-Signature'] = await computeHMAC(secret, JSON.stringify(params));
      } catch (e: any) {
        addLog('ERR', 'HMAC signature verification failed: ' + e.message);
      }
    }

    try {
      const res = await fetch(finalUrl, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify(params) 
      });
      const txt = await res.text();
      setLoading(false);
      if (!res.ok && !txt.startsWith('CON') && !txt.startsWith('END')) {
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      return txt.trim();
    } catch (e: any) {
      setLoading(false);
      return 'ERR:' + e.message;
    }
  };

  const handleDial = async () => {
    if (!phone) {
      addLog('ERR', 'Invalid dial session. Simulated phone number is missing.');
      toast.error('Please enter a valid phone number', { id: 'ussd-dial-phone-err' });
      return;
    }

    const newSessionId = 'SIM-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    setSessionId(newSessionId);
    setTextParts([]);
    setIsActive(true);
    setIsEnd(false);
    setStatus('active');
    setLogs([]);
    setErrorBanner(null);

    addLog('DIAL', `Dialling service code *384*6180# as mobile subscriber ${phone}`, `session: ${newSessionId}`);
    
    const raw = await simCall('');
    handleResponse(raw || '');
  };

  const handleSend = async () => {
    if (!isActive || isEnd || !input || loading) return;

    const currentInput = input;
    setInput('');
    const newParts = [...textParts, currentInput];
    setTextParts(newParts);
    const textParam = newParts.join('*');

    addLog('IN', currentInput, `text="${textParam}"`);
    const raw = await simCall(textParam);
    handleResponse(raw || '');
  };

  const handleResponse = (raw: string) => {
    if (!raw) {
      addLog('ERR', 'Critical USSD timeout: Empty return from gateway.');
      setStatus('error');
      setErrorBanner('Critical USSD timeout: Received empty return value from the server endpoint.');
      return;
    }

    if (raw.startsWith('ERR:')) {
      const msg = raw.slice(4);
      addLog('ERR', msg);
      setStatus('error');
      setErrorBanner(`Routing Error: Unable to complete USSD loop. ${msg}`);
      setScreen(`⚠ Connection error.\nCheck function URL and try again.\n\n${msg}`);
      setIsEnd(true);
      return;
    }

    const cleanRaw = raw.trim();
    if (cleanRaw.toUpperCase().startsWith('CON')) {
      const msg = cleanRaw.slice(3).replace(/^\s+/, '');
      addLog('CON', msg);
      setScreen(msg);
    } else if (cleanRaw.toUpperCase().startsWith('END')) {
      const msg = cleanRaw.slice(3).replace(/^\s+/, '');
      addLog('END', msg);
      setScreen(msg);
      setIsEnd(true);
      setStatus('ended');
    } else {
      addLog('END', cleanRaw);
      setScreen(cleanRaw);
      setIsEnd(true);
      setStatus('ended');
    }
  };

  const reset = () => {
    setScreen('Dial *384*6180# to begin a session.');
    setTextParts([]);
    setIsEnd(true);
    setIsActive(false);
    setStatus('idle');
    setLogs([]);
    setErrorBanner(null);
  };

  const handleScenarioChange = (scenarioPhone: string) => {
    setPhone(scenarioPhone);
    // Auto reset state on scenario switch but keep log records if desired or clear
    setTextParts([]);
    setIsEnd(true);
    setIsActive(false);
    setStatus('idle');
    setErrorBanner(null);
    setScreen(`Scenario phone changed to ${scenarioPhone}. Dial to start.`);
    toast.success(`Selected Scenario: Phone ${scenarioPhone}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] p-4 md:p-12 font-sans selection:bg-[#00e676] selection:text-black">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e1e1e] pb-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#00e676]">USSD Interface</h1>
            <p className="text-xs text-[#666] uppercase tracking-[0.2em] mt-1">Sandbox Environment v5.0 | Help: 0781550151</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-wider",
              status === 'active' ? "bg-[#0d1a10] border-[#00e676] text-[#00e676]" : "bg-[#111] border-[#1e1e1e] text-[#666]"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", status === 'active' ? "bg-[#00e676] animate-pulse" : "bg-[#666]")} />
              {status}
            </div>
            <button 
              onClick={reset} 
              aria-label="Reset simulation"
              className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] px-4 py-2 rounded text-xs hover:border-[#00e676] active:scale-95 transition-all text-neutral-300"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </header>

        {/* Dynamic Warning Feedback Banner */}
        <AnimatePresence>
          {errorBanner && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-xs"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold">Execution Error: </span>
                {errorBanner}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-[1fr_320px_1fr] gap-6 items-start">
          {/* Config Panel */}
          <div className="space-y-6">
            <div className="bg-[#111] border border-[#1e1e1e] p-6 rounded-xl">
              <div className="flex items-center gap-2 text-[#00e676] text-[10px] font-bold uppercase tracking-widest mb-6">
                <Terminal className="w-3.5 h-3.5" /> Config
              </div>
              <div className="space-y-5">
                <div>
                  <label htmlFor="fnUrl" className="block text-[9px] text-[#666] uppercase tracking-widest mb-2">USSD Endpoint URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#333]" />
                    <input 
                      id="fnUrl"
                      type="text" 
                      value={fnUrl}
                      onChange={(e) => setFnUrl(e.target.value)}
                      placeholder="https://xxxx.supabase.co/functions/v1/..."
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-xs pl-9 pr-4 py-2.5 rounded focus:outline-none focus:border-[#00e676] font-mono text-neutral-300"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="simPhone" className="block text-[9px] text-[#666] uppercase tracking-widest mb-2">Phone Number (Simulated)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#333]" />
                    <input 
                      id="simPhone"
                      type="text" 
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="e.g. 254712345678"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-xs pl-9 pr-4 py-2.5 rounded focus:outline-none focus:border-[#00e676] font-mono text-neutral-300"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="simSecret" className="block text-[9px] text-[#666] uppercase tracking-widest mb-2">Webhook Secret (Optional)</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#333]" />
                    <input 
                      id="simSecret"
                      type={showSecret ? "text" : "password"} 
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder="Leave blank for sandbox"
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-xs pl-9 pr-[38px] py-2.5 rounded focus:outline-none focus:border-[#00e676] font-mono text-neutral-300"
                    />
                    <button
                      type="button"
                      aria-label={showSecret ? "Hide secret" : "Show secret"}
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleDial}
                  disabled={loading}
                  aria-label="Initiate USSD Call"
                  className="w-full bg-[#00e676] text-black font-bold py-3 rounded text-xs uppercase tracking-widest hover:bg-[#00c853] active:scale-98 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(0,230,118,0.15)] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Dial *384*6180#
                </button>
              </div>
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] p-6 rounded-xl">
              <div className="text-[9px] text-[#666] uppercase tracking-widest mb-4 font-bold">Test Scenarios</div>
              <div className="grid grid-cols-1 gap-2">
                {testScenarios.map(s => (
                  <button 
                    key={s.label}
                    onClick={() => handleScenarioChange(s.phone)}
                    className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] px-4 py-2.5 rounded hover:border-[#00e676] hover:text-[#00e676] transition-all group"
                  >
                    <span>{s.label}</span>
                    <span className="text-[#444] group-hover:text-[#00e676]/50 font-mono">{s.phone}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] p-6 rounded-xl">
              <div className="text-[9px] text-[#666] uppercase tracking-widest mb-4 font-bold">Quick Shortcuts</div>
              <div className="flex flex-wrap gap-2">
                {['1', '2', '3', '4', '0', '00'].map(val => (
                  <button 
                    key={val}
                    onClick={() => setInput(val)}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] px-3 py-1.5 rounded hover:border-[#00e676] hover:text-[#00e676] transition-all font-mono"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="relative mx-auto w-full max-w-[320px]">
            <div className="bg-[#0f0f0f] border-2 border-[#2a2a2a] rounded-[48px] p-4 pt-10 pb-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0f0f0f] rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-[#1a1a1a] rounded-full" />
              </div>
              
              <div className="bg-black rounded-[32px] h-[480px] w-full flex flex-col overflow-hidden border border-[#1a1a1a] relative">
                {/* Status Bar */}
                <div className="flex justify-between items-center px-6 py-3 bg-[#050505] text-[9px] text-[#888] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span>NX NET</span>
                    <Wifi className="w-2.5 h-2.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Signal className="w-2.5 h-2.5" />
                    <span>12:45</span>
                  </div>
                </div>

                {/* USSD Screen */}
                <div className="flex-1 p-6 flex flex-col overflow-hidden">
                  <div className="text-[10px] shrink-0 text-[#333] text-center uppercase tracking-[0.3em] mb-6 font-mono">NX NETWORK</div>
                  <div 
                    aria-live="polite"
                    className="flex-1 overflow-y-auto text-[13px] text-[#e0e0e0] leading-relaxed whitespace-pre-wrap font-mono touch-pan-y pb-2 pr-1 custom-scrollbar"
                  >
                    {loading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#00e676] animate-spin" />
                      </div>
                    ) : (
                      screen
                    )}
                  </div>
                  
                  {!isEnd && (
                    <div className="mt-4 pt-4 shrink-0 border-t border-[#1a1a1a] flex gap-2">
                      <input 
                        ref={inputRef}
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Reply..."
                        disabled={loading}
                        aria-label="USSD reply input"
                        className="flex-1 bg-[#111] border border-[#2a2a2a] text-[#e0e0e0] px-4 py-2.5 text-xs rounded-lg focus:outline-none focus:border-[#00e676] font-mono placeholder-neutral-700"
                        autoFocus
                      />
                      <button 
                        onClick={handleSend}
                        disabled={loading}
                        aria-label="Send USSD code"
                        className="bg-[#00e676] text-black px-4 py-2.5 text-xs font-bold rounded-lg hover:bg-[#00c853] transition-all disabled:opacity-50 font-mono shrink-0 active:scale-95 flex items-center justify-center"
                      >
                        Enter
                      </button>
                    </div>
                  )}
                  
                  {isEnd && isActive && (
                    <button 
                      onClick={reset}
                      className="shrink-0 mt-4 w-full border border-[#2a2a2a] text-[#666] py-3 text-[10px] uppercase tracking-widest hover:text-white hover:border-white transition-all rounded-lg"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
              
              <div className="w-16 h-1 bg-[#2a2a2a] rounded-full mx-auto mt-8" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[#00e676]/5 blur-[100px] rounded-full -z-10" />
          </div>

          {/* Session Log */}
          <div className="bg-[#111] border border-[#1e1e1e] rounded-xl flex flex-col h-[600px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1e1e1e] flex justify-between items-center bg-[#161616]">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#666]">Session Log</h3>
              <button onClick={() => setLogs([])} className="text-[9px] text-[#444] hover:text-[#00e676] transition-colors uppercase tracking-widest">Clear</button>
            </div>
            <div ref={logBodyRef} className="flex-1 p-6 space-y-4 overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-[#1e1e1e]">
              {logs.length === 0 ? (
                <div className="text-[10px] text-[#333] text-center py-20">No active session</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={cn(
                    "pl-3 border-l-2 py-1",
                    log.type === 'DIAL' ? "border-[#448aff]" :
                    log.type === 'IN' ? "border-[#ffc107]" :
                    log.type === 'CON' ? "border-[#00e676]" :
                    log.type === 'END' ? "border-[#666]" : "border-[#ff5252]"
                  )}>
                    <div className="flex items-center gap-3 text-[9px] mb-1">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded font-bold",
                        log.type === 'DIAL' ? "bg-[#448aff]/10 text-[#448aff]" :
                        log.type === 'IN' ? "bg-[#ffc107]/10 text-[#ffc107]" :
                        log.type === 'CON' ? "bg-[#00e676]/10 text-[#00e676]" :
                        log.type === 'END' ? "bg-[#666]/10 text-[#666]" : "bg-[#ff5252]/10 text-[#ff5252]"
                      )}>{log.type}</span>
                      <span className="text-[#333]">{log.time}</span>
                      {log.extra && <span className="text-[#444] truncate">{log.extra}</span>}
                    </div>
                    <div className="text-[11px] text-[#ccc] leading-relaxed break-words whitespace-pre-wrap">{log.content}</div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 bg-[#0d0d0d] border-t border-[#1e1e1e]">
              <div className="text-[9px] text-[#444] uppercase tracking-widest mb-2">Session ID</div>
              <div className="text-[10px] font-mono text-[#666] truncate">{sessionId || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
