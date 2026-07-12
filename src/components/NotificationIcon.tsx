import React from 'react';
import { Bell } from 'lucide-react';

export default function NotificationIcon() {
  return (
    <button className="relative p-2 text-nx-muted hover:text-white transition-colors focus:outline-none focus:ring-0">
      <Bell className="w-5 h-5" />
      <span className="absolute top-1.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-nx-amber text-[10px] font-bold text-black border-2 border-nx-card2">
        3
      </span>
    </button>
  );
}
