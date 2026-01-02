
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "" }) => {
  return (
    <div className={`glass rounded-2xl p-6 transition-all duration-300 hover:bg-white/5 ${className}`}>
      {children}
    </div>
  );
};
