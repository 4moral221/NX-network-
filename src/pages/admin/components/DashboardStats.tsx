import { 
  Store, 
  Users, 
  ArrowLeftRight, 
  CreditCard,
  Zap,
  TrendingUp,
  AlertTriangle,
  Smartphone
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

interface DashboardStatsProps {
  stats: any;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    { label: 'Total Volume', value: `KSH ${stats.volume.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Network Revenue', value: `KSH ${stats.revenue.toLocaleString()}`, icon: CreditCard, color: 'text-[#00ff88]', bg: 'bg-[#00ff88]/10' },
    { label: 'Active Merchants', value: stats.merchants.toLocaleString(), icon: Store, color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/10' },
    { label: 'Total Customers', value: stats.customers.toLocaleString(), icon: Users, color: 'text-[#a29bfe]', bg: 'bg-[#a29bfe]/10' },
    { label: 'Pool Solvency', value: `${stats.customerPool.toLocaleString()} NX`, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Merchant Balances', value: `${stats.merchantBalance.toLocaleString()} NX`, icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Confirmed Txns', value: stats.txns.toLocaleString(), icon: ArrowLeftRight, color: 'text-[#ff7675]', bg: 'bg-[#ff7675]/10' },
    { label: 'Fraud Alerts', value: stats.fraud_alerts.toLocaleString(), icon: AlertTriangle, color: 'text-[#ff4757]', bg: 'bg-[#ff4757]/10' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl hover:bg-white/[0.05] transition-all group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 font-bold">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
            </div>
            <div className={cn("p-3 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-lg", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className={cn("h-full", stat.color.replace('text-', 'bg-'))} style={{ width: '40%' }} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
