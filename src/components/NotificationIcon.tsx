import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Check, Trash2, X, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning';
}

const DEFAULT_NOTIFICATIONS: Record<string, Notification[]> = {
  admin: [
    {
      id: 'admin-1',
      title: 'Platform System Updated',
      body: 'Operational engine upgraded to Enterprise Node v2.4.0.',
      time: '10m ago',
      read: false,
      type: 'info'
    },
    {
      id: 'admin-2',
      title: 'Restock Velocity Node Spark',
      body: 'Nairobi Region experiencing surge in consumer duka restocks.',
      time: '2h ago',
      read: false,
      type: 'success'
    }
  ],
  fmcg: [
    {
      id: 'fmcg-1',
      title: 'Retailer Whitelist Requested',
      body: 'A local retailer has requested whitelisting for direct factory margins.',
      time: '5m ago',
      read: false,
      type: 'warning'
    },
    {
      id: 'fmcg-2',
      title: 'Pool Distribution Completed',
      body: 'Brand margin handshake executed for active Unilever dispatches.',
      time: '1h ago',
      read: false,
      type: 'success'
    }
  ],
  merchant: [
    {
      id: 'merchant-1',
      title: 'FMCG Pool Margin Dispatched',
      body: 'Accumulated franchise brand margins are ready to settle to your wallet.',
      time: '15m ago',
      read: false,
      type: 'success'
    },
    {
      id: 'merchant-2',
      title: 'Smart Stock Recommendation',
      body: 'Sugar and cooking oil supplies are low. Auto-generate a restock order.',
      time: '3h ago',
      read: false,
      type: 'info'
    }
  ],
  partner: [
    {
      id: 'partner-1',
      title: 'AI Compilation Complete',
      body: 'Nairobi West sub-county restock bids compiled with 98% route accuracy.',
      time: '8m ago',
      read: false,
      type: 'success'
    },
    {
      id: 'partner-2',
      title: 'Franchise Tier Level Up',
      body: 'Certified Partner Tier: HUB approved for central hub node.',
      time: '4h ago',
      read: false,
      type: 'info'
    }
  ],
  pwa: [
    {
      id: 'pwa-1',
      title: 'Welcome to NX Network!',
      body: 'Earn high-yield NX loyalty tokens at any certified local duka.',
      time: '20m ago',
      read: false,
      type: 'success'
    },
    {
      id: 'pwa-2',
      title: 'Bonus Reward Multiplier',
      body: 'Refer an adjacent duka shop or customer to earn bonus rewards.',
      time: '1d ago',
      read: false,
      type: 'info'
    }
  ],
  default: [
    {
      id: 'def-1',
      title: 'NX Network Active',
      body: 'Connect with brands, local dukas, and earn loyalty points.',
      time: '5m ago',
      read: false,
      type: 'success'
    }
  ]
};

export default function NotificationIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect current role based on route
  const getRole = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('admin')) return 'admin';
    if (path.includes('fmcg')) return 'fmcg';
    if (path.includes('merchant')) return 'merchant';
    if (path.includes('partner')) return 'partner';
    if (path.includes('pwa')) return 'pwa';
    return 'default';
  };

  const role = getRole();
  const storageKey = `nx_notifications_${role}`;

  // Load notifications from local storage or set defaults
  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        setNotifications(JSON.parse(cached));
      } catch (e) {
        setNotifications(DEFAULT_NOTIFICATIONS[role] || DEFAULT_NOTIFICATIONS.default);
      }
    } else {
      const defaults = DEFAULT_NOTIFICATIONS[role] || DEFAULT_NOTIFICATIONS.default;
      setNotifications(defaults);
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    }
  }, [role, storageKey]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const markAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const renderIcon = (type?: 'info' | 'success' | 'warning') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-nx-green shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-nx-ember shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-nx-amber shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-nx-muted hover:text-nx-paper transition-colors focus:outline-none focus:ring-0 cursor-pointer"
        aria-label="Toggle notifications"
      >
        <Bell className="w-5 h-5" />
        
        {/* Only display unread badge when there is at least one unread notification */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-1.5 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-nx-amber text-[9px] font-mono font-bold text-nx-ink border border-nx-card"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 rounded-xl bg-nx-card border border-nx-border shadow-2xl z-50 overflow-hidden font-sans text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-nx-border bg-nx-card2">
              <span className="text-[10px] uppercase tracking-wider text-nx-muted font-bold font-mono">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] uppercase tracking-wider text-nx-amber hover:underline font-bold font-mono cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-nx-border/50 bg-nx-card">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    className={`flex gap-3 p-4 transition-colors relative ${n.read ? 'opacity-60 hover:bg-nx-card2/30' : 'bg-nx-card2/50 hover:bg-nx-card2'}`}
                  >
                    {renderIcon(n.type)}
                    <div className="flex-1 min-w-0 pr-12">
                      <p className={`text-xs text-nx-paper leading-snug font-semibold ${n.read ? 'font-normal' : ''}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-nx-muted mt-1 leading-relaxed">
                        {n.body}
                      </p>
                      <span className="text-[9px] text-nx-muted font-mono block mt-1.5">
                        {n.time}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      {!n.read && (
                        <button 
                          onClick={(e) => markAsRead(n.id, e)}
                          title="Mark as read"
                          className="p-1 hover:bg-nx-card rounded text-nx-muted hover:text-nx-green transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => removeNotification(n.id, e)}
                        title="Dismiss"
                        className="p-1 hover:bg-nx-card rounded text-nx-muted hover:text-nx-ember transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <BellOff className="w-8 h-8 text-nx-muted opacity-40 mb-3" />
                  <p className="text-xs text-nx-paper font-semibold">
                    All caught up!
                  </p>
                  <p className="text-[11px] text-nx-muted mt-1">
                    You have no active notifications.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
