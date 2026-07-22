import { 
  LayoutDashboard, 
  Store, 
  ArrowLeftRight, 
  Package, 
  ShieldCheck, 
  Activity, 
  FileText, 
  Users, 
  Smartphone,
  History,
  ShieldAlert,
  Zap,
  Map as MapIcon,
  CreditCard,
  Radio,
  FileSearch,
  Search,
  Mail,
  LogOut
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import NXLogo from '../../../components/NXLogo';

interface SidebarProps {
  activeSection: string;
  onSetSection: (section: any) => void;
  adminRole: string;
  adminEmail?: string;
  stats: any;
  onLogout?: () => void;
}

export default function Sidebar({ activeSection, onSetSection, adminRole, adminEmail, stats, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'merchants', label: 'Merchants', icon: Store },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'txns', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'restock', label: 'Restock', icon: Package, badge: stats.pending_restock },
    { id: 'deliveries', label: 'Deliveries', icon: Package },
    { id: 'pools', label: 'Liquidity Pools', icon: Zap },
    { id: 'invoices', label: 'Invoices', icon: FileText, badge: stats.pending_invoices },
    { id: 'hub_payouts', label: 'Hub Payouts', icon: CreditCard },
    { id: 'applications', label: 'Applications', icon: Smartphone, badge: stats.apps },
    { id: 'waitlist', label: 'Waitlist & Subscribers', icon: Mail, badge: stats.subscribers },
    { id: 'map', label: 'Live Map', icon: MapIcon },
    { id: 'sim', label: 'USSD Interface', icon: Smartphone },
    { id: 'fraud', label: 'Fraud Logs', icon: ShieldAlert, badge: stats.fraud_alerts },
    { id: 'audit', label: 'Audit & Integrity', icon: FileSearch },
  ];

  const isMaster = adminEmail?.trim().toLowerCase() === 'formidablefoe254@gmail.com';

  if (adminRole === 'super_admin' || adminRole === 'ops' || adminRole === 'logistics_agent' || adminRole === 'treasury_manager' || isMaster) {
    if (!menuItems.find(i => i.id === 'fmcg')) {
      menuItems.push(
        { id: 'fmcg', label: 'FMCG Partners', icon: Radio, badge: stats.pending_fmcg }
      );
    }
  }

  if (adminRole === 'super_admin' || adminRole === 'ops' || isMaster) {
    if (!menuItems.find(i => i.id === 'broadcasts')) {
      menuItems.push(
        { id: 'broadcasts', label: 'Broadcasts', icon: Radio },
        { id: 'staff', label: 'Staff Management', icon: Users },
        { id: 'logs', label: 'System Logs', icon: History },
        { id: 'redis', label: 'Redis Cache', icon: Activity }
      );
    }
  }

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full border-r border-gray-800">
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div className="scale-75 origin-left w-full h-10 overflow-visible flex items-center">
            <NXLogo title="ADMIN" />
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSetSection(item.id)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative",
              activeSection === item.id 
                ? "bg-amber-500/10 text-amber-500 font-medium translate-x-1" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn(
                "w-5 h-5",
                activeSection === item.id ? "text-amber-500" : "text-gray-500 group-hover:text-gray-300"
              )} />
              <span>{item.label}</span>
            </div>
            {item.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                {item.badge}
              </span>
            )}
            {activeSection === item.id && (
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            )}
          </button>
        ))}
      </nav>
      {onLogout && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
