import { useState, useEffect, useRef, RefObject } from 'react';
import { Smartphone, Send, RotateCcw, Terminal, ChevronUp, ChevronDown, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LogEntry {
  type: 'DIAL' | 'IN' | 'CON' | 'END' | 'ERR';
  content: string;
  extra?: string;
  timestamp: string;
}

export default function UssdSimulator() {
  const [sessionId, setSessionId] = useState('');
  const [phone, setPhone] = useState('254712345678');
  const [ussdText, setUssdText] = useState('');
  const [reply, setReply] = useState('');
  const [screen, setScreen] = useState('Dial *384*6180# to begin.');
  const [status, setStatus] = useState<'idle' | 'active' | 'ended' | 'error'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [ussdMode, setUssdMode] = useState<'local' | 'edge'>('local');
  const [textParts, setTextParts] = useState<string[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const scrollElement = (ref: RefObject<HTMLDivElement | null>, direction: 'up' | 'down' | 'bottom') => {
    if (ref.current) {
      const container = ref.current;
      const step = 300;
      
      if (direction === 'bottom') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else if (direction === 'up') {
        container.scrollBy({ top: -step, behavior: 'smooth' });
      } else {
        container.scrollBy({ top: step, behavior: 'smooth' });
      }
    }
  };

  const addLog = (type: LogEntry['type'], content: string, extra?: string) => {
    const entry: LogEntry = {
      type,
      content,
      extra,
      timestamp: new Date().toLocaleTimeString('en-KE', { hour12: false })
    };
    setLogs(prev => [...prev, entry]);
  };

  const reset = () => {
    setSessionId('');
    setTextParts([]);
    setUssdText('');
    setReply('');
    setScreen('Dial *384*6180# to begin.');
    setStatus('idle');
    setLoading(false);
  };

  const dial = async () => {
    if (!phone) return;
    reset();
    const newSessionId = 'SIM-' + Date.now();
    setSessionId(newSessionId);
    setStatus('active');
    addLog('DIAL', 'Dialling *384*6180#', `session: ${newSessionId}`);
    
    await callUssd('');
  };

  const callUssd = async (text: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sessionId: sessionId || 'SIM-' + Date.now(),
        phoneNumber: phone,
        serviceCode: '*384*6180#',
        text,
        ussdMode
      });

      let url = '/api/ussd';
      let headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      if (ussdMode === 'edge') {
        addLog('DIAL', `Calling Live Edge Function (through secure server proxy): ${url}`, `text="${text}"`);
      } else {
        addLog('DIAL', `Calling Local Server: ${url}`, `text="${text}"`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        let msg = `Server returned ${response.status}: ${errorText || 'No error message'}`;
        
        if (response.status === 404) {
          msg += "\n\nTip: The Edge Function might not be deployed yet.";
        }
        
        throw new Error(msg);
      }

      const raw = await response.text();
      handleResponse(raw);
    } catch (err: any) {
      addLog('ERR', err.message);
      setScreen('Error: ' + err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('CON')) {
      const msg = trimmed.replace('CON', '').trim();
      addLog('CON', msg);
      setScreen(msg);
      setStatus('active');
    } else if (trimmed.startsWith('END')) {
      const msg = trimmed.replace('END', '').trim();
      addLog('END', msg);
      setScreen(msg);
      setStatus('ended');
    } else {
      const errorMsg = trimmed || 'Empty response from server';
      addLog('ERR', 'Invalid response: ' + errorMsg);
      setScreen('Error: ' + errorMsg);
      setStatus('error');
    }
  };

  const sendReply = async () => {
    if (status !== 'active' || !reply || loading) return;
    
    const newParts = [...textParts, reply];
    setTextParts(newParts);
    const fullText = newParts.join('*');
    
    addLog('IN', reply, `text="${fullText}"`);
    setReply('');
    await callUssd(fullText);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[650px_1fr] gap-12 items-start">
      {/* Phone Mockup */}
      <div className="flex flex-col items-center">
        {/* Server Toggle */}
        <div className="mb-6 w-full max-w-[600px] bg-[#1a1a2e] border-2 border-[#2a2a3e] rounded-2xl p-2 flex gap-2 shadow-xl">
          <button 
            onClick={() => setUssdMode('local')}
            className={cn(
              "flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3",
              ussdMode === 'local' ? "bg-[#00ff88] text-black shadow-[0_0_20px_rgba(0,255,136,0.4)]" : "text-[#666] hover:text-[#999]"
            )}
          >
            <Terminal className="w-5 h-5" /> Local Server
          </button>
          <button 
            onClick={() => setUssdMode('edge')}
            className={cn(
              "flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3",
              ussdMode === 'edge' ? "bg-[#00ff88] text-black shadow-[0_0_20px_rgba(0,255,136,0.4)]" : "text-[#666] hover:text-[#999]"
            )}
          >
            <Zap className="w-5 h-5" /> Live Server
          </button>
        </div>

        <div className="relative w-[600px] h-[1100px] bg-[#080810] rounded-[4rem] border-[12px] border-[#1a1a2e] shadow-[0_0_80px_rgba(0,255,136,0.1),inset_0_0_40px_rgba(0,0,0,0.6)] p-10 flex flex-col overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-[#1a1a2e] rounded-b-3xl z-20" />
          
          {/* Screen */}
          <div className="flex-1 bg-[#050510] rounded-[2.5rem] border border-[#0f0f1e] overflow-hidden flex flex-col relative">
            {/* Status Bar */}
            <div className="h-12 px-8 flex items-center justify-between text-[11px] font-mono text-[#444] bg-[#03030a] border-b border-[#0a0a1a]">
              <span>Safaricom</span>
              <div className="flex items-center gap-1">
                <div className="flex items-end gap-0.5 h-2">
                  <div className="w-0.5 h-1 bg-[#444]" />
                  <div className="w-0.5 h-1.5 bg-[#444]" />
                  <div className="w-0.5 h-2 bg-[#00ff88]" />
                  <div className="w-0.5 h-2.5 bg-[#00ff88]" />
                </div>
                <span>*384*6180#</span>
              </div>
            </div>

            {/* USSD Dialog */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="text-center mb-4">
                <div className="text-[10px] font-mono text-[#00ff88]/30 tracking-widest uppercase">NX Network</div>
              </div>
              
              <div className="flex-1 relative overflow-hidden flex flex-col">
                <div 
                  ref={screenRef}
                  className="flex-1 font-mono text-sm text-[#c8d8c8] leading-relaxed whitespace-pre-wrap break-words overflow-y-auto pr-1 scroll-smooth touch-pan-y [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  {screen}
                </div>
              </div>

              {status === 'active' && (
                <div className="mt-4 pt-4 border-t border-[#0f0f1e] space-y-3">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="Enter reply..."
                    className="w-full bg-[#0a0a18] border border-[#1a1a2e] text-[#c8d8c8] font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-[#00ff88] transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={sendReply}
                    disabled={loading || !reply}
                    className="w-full bg-[#00ff88] text-black font-mono text-xs font-bold py-2 rounded hover:bg-[#00cc6a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-3 h-3" /> Send
                  </button>
                </div>
              )}

              {status === 'ended' && (
                <div className="mt-4 pt-4 border-t border-[#0f0f1e]">
                  <button
                    onClick={reset}
                    className="w-full bg-[#1a1a2e] text-[#c8d8c8] font-mono text-xs py-2 rounded hover:bg-[#2a2a3e] transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3 h-3" /> Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Home Indicator */}
          <div className="h-1 w-16 bg-[#1a1a2e] rounded-full mx-auto mt-4" />
        </div>

        {/* External Scroll Controls */}
        <div className="mt-6 w-full max-w-[600px] bg-[#1a1a2e] border-2 border-[#2a2a3e] rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00ff88] text-black text-[9px] font-bold px-3 py-0.5 rounded-full uppercase tracking-tighter">
            Navigation Pad
          </div>
          
          <div className="flex flex-col gap-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => scrollElement(screenRef, 'up')}
                className="flex flex-col items-center justify-center gap-1 py-4 bg-[#0a0a18] hover:bg-[#00ff88]/10 border border-[#2a2a3e] hover:border-[#00ff88]/50 rounded-xl text-[#c8d8c8] transition-all active:scale-90 group"
              >
                <ChevronUp className="w-5 h-5 text-[#00ff88] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] uppercase font-bold tracking-widest opacity-50 group-hover:opacity-100">Up</span>
              </button>
              <button 
                onClick={() => scrollElement(screenRef, 'down')}
                className="flex flex-col items-center justify-center gap-1 py-4 bg-[#0a0a18] hover:bg-[#00ff88]/10 border border-[#2a2a3e] hover:border-[#00ff88]/50 rounded-xl text-[#c8d8c8] transition-all active:scale-90 group"
              >
                <ChevronDown className="w-5 h-5 text-[#00ff88] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] uppercase font-bold tracking-widest opacity-50 group-hover:opacity-100">Down</span>
              </button>
            </div>
            
            <button 
              onClick={() => scrollElement(screenRef, 'bottom')}
              className="w-full py-3 bg-[#00ff88] text-black rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 hover:bg-[#00cc6a] shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            >
              Jump to Bottom
            </button>
          </div>
        </div>
      </div>

      {/* Controls & Logs */}
      <div className="space-y-6">
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#666]">Controls</h3>
            <div className="flex items-center gap-2 px-3 py-1 border border-[#1e1e1e] rounded-full bg-[#0a0a0a]">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === 'idle' ? "bg-[#666]" :
                status === 'active' ? "bg-[#00ff88] animate-pulse" :
                status === 'ended' ? "bg-[#ffb547]" : "bg-[#ff4757]"
              )} />
              <span className="text-[10px] font-mono uppercase text-[#666]">{status}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#666]">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1e1e1e] text-[#e8e8e8] font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-[#00ff88]"
                placeholder="254712345678"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#666]">Network Status</label>
              <div className="flex items-center gap-2 h-8 px-3 bg-[#0a0a0a] border border-[#1e1e1e] rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_5px_#00ff88]" />
                <span className="text-[10px] font-mono text-[#00ff88]">CONNECTED TO LIVE</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={dial}
              disabled={status === 'active' || loading}
              className="w-full bg-[#00ff88] text-black font-mono text-xs font-bold py-2 rounded hover:bg-[#00cc6a] transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Dial *384*6180#
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-[#1e1e1e]">
            <div className="text-[10px] uppercase tracking-widest text-[#666] mb-3">Quick Presets</div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'New User', val: '254700000003' },
                { label: 'Account Recovery', val: '254700000004' },
                { label: 'Merchant Hub', val: '254700000002' },
                { label: 'Pay Merchant', val: '254722222222' }
              ].map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPhone(p.val)}
                  className="px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] font-mono text-[#666] hover:text-[#00ff88] hover:border-[#00ff88] transition-all rounded"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#666]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#666]">Session Log</h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => scrollElement(scrollRef, 'up')}
                className="p-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/40 hover:text-white transition-colors"
                title="Scroll Up"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button 
                onClick={() => scrollElement(scrollRef, 'down')}
                className="p-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-white/40 hover:text-white transition-colors"
                title="Scroll Down"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="w-px h-3 bg-white/10 mx-1" />
              <button
                onClick={() => setLogs([])}
                className="text-[10px] font-mono text-[#666] hover:text-[#e8e8e8]"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-[#444] italic">No session activity...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={cn(
                  "pl-3 border-l-2 py-1",
                  log.type === 'DIAL' ? "border-[#4d9fff]" :
                  log.type === 'IN' ? "border-[#ffb547]" :
                  log.type === 'CON' ? "border-[#00ff88]" :
                  log.type === 'END' ? "border-[#666]" : "border-[#ff4757]"
                )}>
                  <div className="flex items-center gap-3 text-[10px] mb-1">
                    <span className={cn(
                      "font-bold",
                      log.type === 'DIAL' ? "text-[#4d9fff]" :
                      log.type === 'IN' ? "text-[#ffb547]" :
                      log.type === 'CON' ? "text-[#00ff88]" :
                      log.type === 'END' ? "text-[#666]" : "text-[#ff4757]"
                    )}>{log.type}</span>
                    <span className="text-[#444]">{log.timestamp}</span>
                    {log.extra && <span className="text-[#444]">{log.extra}</span>}
                  </div>
                  <div className="text-[#aaa] whitespace-pre-wrap">{log.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
