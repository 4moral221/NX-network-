import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-nx-card border border-nx-ember/40 shadow-[0_0_20px_rgba(255,92,108,0.1)] px-5 py-2.5 rounded-full backdrop-blur-md text-xs font-bold uppercase tracking-wider text-nx-ember"
        >
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
