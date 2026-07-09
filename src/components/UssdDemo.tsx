import { useState, useEffect } from 'react';
import { Send, Smartphone, Wifi, Signal } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export default function UssdDemo() {
  const [phoneNumber, setPhoneNumber] = useState('254712345678');
  const [sessionId] = useState(() => 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [textParts, setTextParts] = useState<string[]>([]);
  const [screen, setScreen] = useState('Dial *384*6180# to test the network.');
  const [input, setInput] = useState('');
  const [isEnd, setIsEnd] = useState(true);
  const [loading, setLoading] = useState(false);

  const callUssd = async (text: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ussd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
          text
        })
      });
      
      const simulatedResponse = await response.text();
      handleResponse(simulatedResponse);
    } catch (err) {
      console.error('USSD call error:', err);
      handleResponse('END Connection Lost.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = (raw: string) => {
    if (raw.startsWith('CON ')) {
      setScreen(raw.slice(4));
      setIsEnd(false);
    } else if (raw.startsWith('END ')) {
      setScreen(raw.slice(4));
      setIsEnd(true);
    } else {
      setScreen(raw);
      setIsEnd(true);
    }
  };

  const handleDial = () => {
    setTextParts([]);
    setScreen('Contacting NX Network...');
    callUssd('');
  };

  const handleSend = () => {
    if (!input || isEnd) return;
    const newParts = [...textParts, input];
    setTextParts(newParts);
    setInput('');
    callUssd(newParts.join('*'));
  };

  return (
    <div className="ussd-simulator-dark w-[280px] bg-[#0a0a0a] border-4 border-[#1a1a1a] rounded-[3rem] p-4 shadow-2xl relative">
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
        <div className="flex-1 p-8 flex flex-col">
          <div className="text-[10px] text-nx-amber/30 text-center uppercase tracking-[0.4em] mb-10 font-mono">NX Ecosystem</div>
          
          <div className="flex-1 font-mono text-sm leading-relaxed text-[#c8e6c8] whitespace-pre-wrap">
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
                className="bg-nx-amber text-nx-ink p-2.5 rounded-lg hover:bg-white transition-colors"
              >
                <Send className="w-4 h-4" />
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
  );
}
