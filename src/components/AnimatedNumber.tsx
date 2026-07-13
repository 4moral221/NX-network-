import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";

export function AnimatedNumber({ 
  value, 
  decimals = 0, 
  className = "" 
}: { 
  value: number; 
  decimals?: number; 
  className?: string; 
}) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) =>
    current.toFixed(decimals)
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
