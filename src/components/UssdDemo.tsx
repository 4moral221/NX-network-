import { useState } from 'react';
import { Smartphone, Wifi, Signal, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

export default function UssdDemo() {
  const [phoneNumber, setPhoneNumber] = useState('254712345678');
  const [textParts, setTextParts] = useState<string[]>([]);
  const [screen, setScreen] = useState('Dial *384*6180# to test the network.');
  const [input, setInput] = useState('');
  const [isEnd, setIsEnd] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const callUssd = async (parts: string[], activeSessionId = sessionId) => {
    setLoading(true);
    try {
      const text = parts.join('*');
      const response = await fetch('/api/ussd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          phoneNumber: phoneNumber,
          text: text,
          ussdMode: 'local_only'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.text();
      handleResponse(raw.trim());
    } catch (err: any) {
      console.error('USSD call error:', err);
      handleResponse('END Connection lost or error occurred:\n' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = (raw: string) => {
    const cleanRaw = raw.trim();
    if (cleanRaw.toUpperCase().startsWith('CON')) {
      const msg = cleanRaw.slice(3).replace(/^\s+/, '');
      setScreen(msg);
      setIsEnd(false);
    } else if (cleanRaw.toUpperCase().startsWith('END')) {
      const msg = cleanRaw.slice(3).replace(/^\s+/, '');
      setScreen(msg);
      setIsEnd(true);
    } else {
      setScreen(cleanRaw);
      setIsEnd(true);
    }
  };

  const handleDial = () => {
    const newSessionId = 'DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    setSessionId(newSessionId);
    setTextParts([]);
    setScreen('Contacting NX Network...');
    callUssd([], newSessionId);
  };

  const handleSend = () => {
    if (!input || isEnd) return;
    const newParts = [...textParts, input];
    setTextParts(newParts);
    setInput('');
    callUssd(newParts);
  };

  return (
    <div className="flex flex-col xl:flex-row items-center justify-center gap-8">
      <div className="ussd-simulator-dark w-[280px] shrink-0 bg-[#0a0a0a] border-4 border-[#1a1a1a] rounded-[3rem] p-4 shadow-2xl relative">
        <style>{`
        /* Keep simulator strictly dark across theme switches */
        .ussd-simulator-dark,
        .ussd-simulator-dark * {
          --nx-ink: #111110 !important;
          --nx-paper: #eceae2 !important;
          --nx-amber: #ffb547 !important;
          --nx-ember: #ff5c6c !important;
          --nx-green: #10b981 !important;
          --nx-muted: #b5b3aa !important;
          --nx-border: #2b2b28 !important;
          --nx-card: #181817 !important;
          --nx-card2: #20201f !important;
        }

        html.light .ussd-simulator-dark,
        html.light .ussd-simulator-dark.bg-\\[\\#0a0a0a\\] {
          background-color: #0a0a0a !important;
          border-color: #1a1a1a !important;
        }

        html.light .ussd-simulator-dark .bg-black {
          background-color: #000000 !important;
        }

        html.light .ussd-simulator-dark .bg-\\[\\#050505\\] {
          background-color: #050505 !important;
        }

        html.light .ussd-simulator-dark .bg-\\[\\#0a0a0a\\] {
          background-color: #0a0a0a !important;
        }

        html.light .ussd-simulator-dark .bg-nx-ink {
          background-color: #111110 !important;
        }

        html.light .ussd-simulator-dark .bg-nx-amber {
          background-color: #ffb547 !important;
        }

        html.light .ussd-simulator-dark .text-nx-amber {
          color: #ffb547 !important;
        }

        html.light .ussd-simulator-dark .text-nx-paper {
          color: #eceae2 !important;
        }

        html.light .ussd-simulator-dark .text-nx-muted {
          color: #b5b3aa !important;
        }

        html.light .ussd-simulator-dark .text-nx-ink {
          color: #111110 !important;
        }

        html.light .ussd-simulator-dark .text-\\[\\#c8e6c8\\] {
          color: #c8e6c8 !important;
        }

        html.light .ussd-simulator-dark .border-nx-border\\/50 {
          border-color: rgba(43, 43, 40, 0.5) !important;
        }

        html.light .ussd-simulator-dark .border-nx-border\\/30 {
          border-color: rgba(43, 43, 40, 0.3) !important;
        }

        html.light .ussd-simulator-dark select option {
          background-color: #111110 !important;
          color: #eceae2 !important;
        }
      `}</style>
      {/* Speaker */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-24 bg-[#0a0a0a] rounded-b-2xl border-x border-b border-[#1a1a1a] z-20 flex items-center justify-center">
        <div className="w-10 h-1 bg-[#1a1a1a] rounded-full" />
      </div>

      <div className="bg-black rounded-[2rem] h-[520px] flex flex-col overflow-hidden border border-[#1a1a1a] relative">
        {/* Status Bar */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#050505] text-[10px] text-nx-muted font-mono">
          <div className="flex items-center gap-1.5">
            <span>NX NET</span>
            <Wifi className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3" />
            <span>12:45</span>
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 min-h-0 p-8 flex flex-col overflow-hidden">
          <div className="text-[10px] text-nx-amber/30 text-center uppercase tracking-[0.4em] mb-4 font-mono">NX Ecosystem</div>
          
          <div className="flex-1 font-mono text-sm leading-relaxed text-[#c8e6c8] whitespace-pre-wrap overflow-y-auto pr-1 custom-scrollbar">
            {screen}
          </div>

          {!isEnd ? (
            <div className="mt-6 pt-6 border-t border-nx-border/30 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Reply..."
                className="flex-1 bg-nx-ink border border-nx-border/50 text-nx-paper px-4 py-2.5 text-xs rounded-lg focus:outline-none focus:border-nx-amber font-mono"
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="bg-nx-amber text-nx-ink px-4 py-2.5 text-xs font-bold rounded-lg hover:bg-white transition-all font-mono shrink-0 active:scale-95 flex items-center justify-center"
              >
                Enter
              </button>
            </div>
          ) : (
            <div className="mt-6 pt-6 border-t border-nx-border/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] uppercase tracking-widest text-nx-muted shrink-0">Test As:</span>
                <select 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-transparent text-[10px] text-nx-amber border-none focus:ring-0 cursor-pointer"
                >
                  <option value="254712345678" className="bg-nx-ink text-nx-paper">New User</option>
                  <option value="254700000002" className="bg-nx-ink text-nx-paper">Certified Merchant</option>
                </select>
              </div>
              <button 
                onClick={handleDial}
                disabled={loading}
                className="w-full bg-nx-amber text-nx-ink py-4 rounded-xl font-display text-xs tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" /> DIAL *384*6180#
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Home Button */}
      <div className="w-16 h-1.5 bg-[#1a1a1a] rounded-full mx-auto mt-8" />
      </div>

      {/* Animated Mockup Notice */}
      <div className="flex flex-col gap-4 shrink-0 w-[280px]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="text-[9px] text-[#ffb547]/90 border border-[#ffb547]/20 bg-[#ffb547]/5 rounded-lg py-1.5 px-3 text-center font-mono flex items-center justify-center gap-1.5 select-none"
        >
          <span className="w-1.5 h-1.5 bg-[#ffb547] rounded-full animate-pulse" />
          SIMULATED SANDBOX
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="bg-[#ffb547]/5 border border-[#ffb547]/20 rounded-2xl p-4 text-center shadow-lg hover:border-[#ffb547]/30 transition-all group"
        >
          <div className="flex items-center justify-center gap-1.5 text-[#ffb547] font-display text-[10px] tracking-widest uppercase mb-1.5 font-bold">
            <AlertCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> 
            MOCKUP ACCOUNT NOTICE
          </div>
          <p className="text-[11px] text-[#b5b3aa] leading-relaxed">
            The registration flow and accounts created inside this simulator are <strong className="text-nx-paper font-semibold">fully virtual mockups</strong>. No real user records, national IDs, or cellular accounts are affected.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
