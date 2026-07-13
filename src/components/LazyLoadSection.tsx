import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

interface LazyLoadSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
}

export const LazyLoadSection: React.FC<LazyLoadSectionProps> = ({
  children,
  className = '',
  id,
  delay = 0,
  direction = 'up',
  duration = 0.8,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const getDirectionOffset = () => {
    switch (direction) {
      case 'up':
        return { y: 35 };
      case 'down':
        return { y: -35 };
      case 'left':
        return { x: 35 };
      case 'right':
        return { x: -35 };
      case 'none':
      default:
        return {};
    }
  };

  const initialStyles = {
    opacity: 0,
    ...getDirectionOffset(),
  };

  const animateStyles = {
    opacity: isInView ? 1 : 0,
    x: isInView ? 0 : (getDirectionOffset().x || 0),
    y: isInView ? 0 : (getDirectionOffset().y || 0),
  };

  return (
    <div ref={ref} id={id} className={className}>
      <motion.div
        initial={initialStyles}
        animate={animateStyles}
        transition={{
          duration: duration,
          delay: delay,
          ease: [0.16, 1, 0.3, 1], // Premium Apple-style ease-out
        }}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </div>
  );
};
