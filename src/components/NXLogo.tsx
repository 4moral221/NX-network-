import React from 'react';

export default function NXLogo({ title, className = "", size = "md" }: { title?: string, className?: string, size?: "sm" | "md" | "lg" }) {
  const textSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl sm:text-4xl"
  };

  const titleSizeClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm"
  };

  return (
    <div className={`flex items-center gap-2 group ${className}`}>
      <div className="flex items-baseline gap-2">
        <span className={`font-display font-black tracking-[0.15em] text-[#e8a020] transition-colors duration-300 group-hover:text-white ${textSizes[size]}`}>
          NX
        </span>
        {title && (
          <span className={`font-mono uppercase tracking-widest text-white/40 font-medium ${titleSizeClasses[size]}`}>
            {title}
          </span>
        )}
      </div>
    </div>
  );
}

