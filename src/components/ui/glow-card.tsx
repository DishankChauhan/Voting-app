'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GlowEffect, GlowEffectProps } from './glow-effect';
import { GlowingEffect } from './glowing-effect';
import { motion } from 'framer-motion';

interface GlowCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  className?: string;
  glowProps?: GlowEffectProps;
}

export function GlowCard({
  title,
  description,
  icon,
  className,
  glowProps = {
    colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'],
    mode: 'breathe',
    blur: 'stronger',
  },
}: GlowCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-transparent bg-gray-900/50 p-6 backdrop-blur-sm",
        "transition-all duration-300 ease-in-out",
        "z-10",
        className
      )}
    >
      <div className="relative z-10">
        {icon && <div className="mb-4 text-indigo-400">{icon}</div>}
        <h3 className="mb-3 text-xl font-semibold text-indigo-400">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
      
      <GlowEffect {...glowProps} />
      <GlowingEffect 
        disabled={false} 
        glow={true} 
        blur={10}
        spread={40}
        borderWidth={2}
        variant="default"
        proximity={10}
      />
    </motion.div>
  );
} 