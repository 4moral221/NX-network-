import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Map as MapIcon, 
  List, 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  Wallet,
  LogOut,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import NXLogo from '../../components/NXLogo';

// Note: Leaflet requires CSS to be imported. 
// We'll add it to index.css or use a CDN link in the component.

export default function ControlCenter() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    txCount: 0,
    merchants: 0,
    volume: 0,
    issued: 0,
    redeemed: 0,
    expired: 0,
    fees: 0,
    tps: 0
  });
  const [feed, setFeed] = useState<any[]>([]);
  const [topMerchants, setTopMerchants] = useState<any[]>([]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchControlData();
      
      // Real-time subscription
      const channel = supabase
        .channel('public:control')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
          setFeed(prev => [payload.new, ...prev].slice(0, 20));
          fetchControlData(); // Refresh stats on new txn
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
          fetchControlData(); // Refresh stats on user changes (merchants)
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isLoggedIn]);

  const fetchControlData = async () => {
    try {
      // 1. Stats
      const { count: mCount } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'merchant');
      const { data: txns } = await supabase.from('transactions').select('*').in('status', ['confirmed', 'completed']);
      
      const volume = txns?.reduce((acc, curr) => acc + Number(curr.amount || curr.amount_ksh || 0), 0) || 0;
      const redeemed = txns?.reduce((acc, curr) => acc + Number(curr.nx_redeemed), 0) || 0;
      const fees = (txns?.length || 0) * 2;

      const { data: ledger } = await supabase.from('ledger_entries').select('amount').eq('entry_type', 'credit');
      const issued = ledger?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setStats({
        txCount: txns?.length || 0,
        merchants: Number(mCount) || 0,
        volume,
        issued,
        redeemed,
        expired: 0, // Placeholder
        fees,
        tps: 0 // Placeholder
      });

      // 2. Feed
      const { data: recent } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setFeed(recent || []);

      // 3. Top Merchants
      if (txns) {
        const mVolumes: Record<string, number> = {};
        txns.forEach(t => {
          mVolumes[t.merchant_code] = (mVolumes[t.merchant_code] || 0) + Number(t.amount || t.amount_ksh || 0);
        });
        const sorted = Object.entries(mVolumes)
          .map(([code, vol]) => ({ code, vol }))
          .sort((a, b) => b.vol - a.vol)
          .slice(0, 10);
        setTopMerchants(sorted);
      }
    } catch (e) {
      console.error('Control data fetch error:', e);
    }
  };

  const handleLogin = () => {
    if (loginData.email === 'formidablefoe254@gmail.com' && loginData.password === '12111@gram') {
      setIsLoggedIn(true);
    } else {
      setError('Invalid credentials.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#080a0e] flex items-center justify-center p-6 font-mono selection:bg-[#00e5ff] selection:text-black">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0d1117] border border-[#242d3d] border-t-2 border-t-[#00e5ff] p-10 w-full max-w-md shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="scale-90 origin-left">
              <NXLogo title="Control Center" />
            </div>
            <div className="border-l border-[#242d3d] pl-4">
              <p className="text-xs text-[#5a6e8a] uppercase tracking-widest">Authenticated Access</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <input 
              type="email" 
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              placeholder="formidablefoe254@gmail.com"
              className="w-full bg-[#0b0f16] border border-[#242d3d] text-[#c8d6e8] px-4 py-3 text-sm focus:outline-none focus:border-[#00e5ff] transition-colors"
            />
            <input 
              type="password" 
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-[#0b0f16] border border-[#242d3d] text-[#c8d6e8] px-4 py-3 text-sm focus:outline-none focus:border-[#00e5ff] transition-colors"
            />
            <button 
              onClick={handleLogin}
              className="w-full bg-[#00e5ff] text-black font-bold py-3 text-xs uppercase tracking-widest hover:opacity-90 transition-opacity mt-4"
            >
              Sign In
            </button>
            {error && <div className="text-red-500 text-[10px] mt-2">{error}</div>}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#080a0e] text-[#c8d6e8] font-sans flex flex-col overflow-hidden selection:bg-[#00e5ff] selection:text-black">
      {/* Header */}
      <header className="h-14 bg-[#0d1117] border-b border-[#1c2230] flex items-stretch shrink-0">
        <div className="flex items-center gap-3 px-6 border-r border-[#1c2230] min-w-[200px]">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#FF5E00] to-[#FF9100] flex items-center justify-center text-black font-bold text-xs">NX</div>
          <div>
            <div className="text-sm font-bold text-[#00e5ff] font-mono">NX //</div>
            <div className="text-[9px] text-[#3d4f6a] uppercase tracking-widest font-mono">Control Center</div>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-x-auto no-scrollbar">
          {[
            { label: 'Txns Today', val: stats.txCount, color: 'text-white' },
            { label: 'Active Merchants', val: stats.merchants, color: 'text-white' },
            { label: 'Daily Volume', val: `KSH ${stats.volume.toLocaleString()}`, color: 'text-[#00e5ff]' },
            { label: 'NX Issued', val: stats.issued.toLocaleString(), color: 'text-[#39ff6e]' },
            { label: 'NX Redeemed', val: stats.redeemed.toLocaleString(), color: 'text-[#ff8c42]' },
            { label: 'Fee Revenue', val: `${stats.fees} NX`, color: 'text-[#FF5E00]' },
            { label: 'TPS (60s)', val: stats.tps.toFixed(2), color: 'text-white' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col justify-center px-6 border-r border-[#1c2230] min-w-[140px]">
              <div className="text-[8px] uppercase tracking-widest text-[#3d4f6a] mb-1 font-mono">{stat.label}</div>
              <div className={cn("text-lg font-bold font-mono", stat.color)}>{stat.val}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 px-6 border-l border-[#1c2230]">
          <div className="flex items-center gap-2 text-[10px] text-[#39ff6e] font-mono tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-[#39ff6e] animate-pulse shadow-[0_0_8px_#39ff6e]" />
            LIVE
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="text-[#3d4f6a] hover:text-[#ff3d57] transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Map Placeholder & Chart */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 bg-[#040609] relative overflow-hidden">
            {/* Map Placeholder */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#1c2230 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-12 h-12 text-[#1c2230] mx-auto mb-4" />
                <div className="text-[#3d4f6a] font-mono text-xs uppercase tracking-[0.3em]">Geospatial Engine Offline</div>
                <div className="text-[10px] text-[#1c2230] mt-2 font-mono">Simulating Nairobi Cluster...</div>
              </div>
            </div>
            
            {/* Map UI */}
            <div className="absolute top-4 left-4 flex gap-2">
              <button className="bg-[#080a0e]/80 border border-[#242d3d] text-[#00e5ff] px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono backdrop-blur-sm">Heatmap</button>
              <button className="bg-[#080a0e]/80 border border-[#242d3d] text-[#5a6e8a] px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono backdrop-blur-sm">Markers</button>
            </div>
          </div>

          {/* Bottom Chart Strip */}
          <div className="h-32 bg-[#0d1117] border-t border-[#1c2230] p-4 flex items-end gap-1">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="flex-1 bg-[#00e5ff]/10 border-t border-[#00e5ff]/30 hover:bg-[#00e5ff]/30 transition-colors" 
                   style={{ height: `${Math.random() * 80 + 10}%` }} />
            ))}
          </div>
        </div>

        {/* Right: Leaderboard & Feed */}
        <aside className="w-72 bg-[#0d1117] border-l border-[#1c2230] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#1c2230] flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#3d4f6a] font-mono">Top Merchants</span>
            <span className="bg-[#1c2230] text-[#5a6e8a] text-[9px] px-2 py-0.5 font-mono">10</span>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {topMerchants.length === 0 ? (
              <div className="p-10 text-center text-[10px] text-[#3d4f6a] font-mono">No merchant data</div>
            ) : (
              topMerchants.map((m, i) => (
                <div key={i} className="p-4 border-b border-[#1c2230] hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium truncate pr-4">{m.code}</span>
                    <span className="text-[10px] text-[#39ff6e] font-mono">KSH {m.vol.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-[#1c2230] rounded-full overflow-hidden">
                    <div className="h-full bg-linear-to-r from-[#00e5ff] to-[#39ff6e]" style={{ width: `${(m.vol/topMerchants[0].vol)*100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="h-64 border-t border-[#1c2230] flex flex-col">
            <div className="p-4 border-b border-[#1c2230] flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#3d4f6a] font-mono">Live Feed</span>
              <Activity className="w-3 h-3 text-[#39ff6e]" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence initial={false}>
                {feed.length === 0 ? (
                  <div className="p-10 text-center text-[10px] text-[#3d4f6a] font-mono">Waiting for transactions...</div>
                ) : (
                  feed.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      className="p-3 border-b border-[#1c2230] grid grid-cols-[auto_1fr_auto] gap-3 items-center"
                    >
                      <span className="text-[9px] text-[#3d4f6a] font-mono">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className="text-[11px] truncate">{item.merchant_code}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-[#00e5ff] font-mono block">KSH {item.amount_ksh}</span>
                        <span className="text-[9px] text-[#39ff6e] font-mono">-{item.nx_redeemed} NX</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="h-8 bg-[#060809] border-t border-[#1c2230] px-4 flex items-center justify-between text-[9px] text-[#3d4f6a] font-mono tracking-widest uppercase">
        <span>NX Network · Kenya · Trading Margin System</span>
        <span>{new Date().toLocaleTimeString()}</span>
        <span className="text-[#39ff6e]">System Nominal</span>
      </footer>
    </div>
  );
}
