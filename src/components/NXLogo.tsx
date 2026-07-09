import React from 'react';

export default function NXLogo({ title, className = "", size = "md" }: { title?: string, className?: string, size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-xl",
    lg: "w-12 h-12 sm:w-16 sm:h-16 text-2xl sm:text-3xl"
  };

  const titleSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 group ${className}`}>
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden shadow-[0_0_0_1.5px_#FF5E00] shrink-0`}>
        <div className="absolute inset-0 bg-[#0a0a0a] [clip-path:polygon(0%_38%,100%_18%,100%_62%,0%_82%)] animate-[slabB_6s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 bg-[#FF5E00] [clip-path:polygon(0%_80%,100%_60%,100%_65%,0%_85%)] animate-[strS_4s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 flex items-center justify-center font-display font-bold">
          <span className="text-[#0a0a0a] relative z-10 animate-[nP_5s_ease-in-out_infinite]">N</span>
          <span className="text-[#f5f0e8] relative z-10 animate-[xP_5.5s_ease-in-out_infinite]">X</span>
        </div>
        <div className="absolute w-1 h-1 rounded-full bg-[#FF5E00] bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 z-20 animate-[dP_3s_ease-in-out_infinite]"></div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <span className={`font-display tracking-[0.2em] text-[#e8a020] ${size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>NX</span>
        {title && <span className={`font-mono uppercase tracking-widest text-white/50 ${titleSizeClasses[size]}`}>{title}</span>}
      </div>
    </div>
  );
}
