import React from 'react';
import { cn } from '@/lib/utils';
import { IdeaStatus } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  status?: IdeaStatus;
}

export const Badge = ({ children, className, variant = 'default', status }: BadgeProps) => {
  const statusStyles: Record<IdeaStatus, string> = {
    Idea: "bg-zinc-800 text-zinc-300 border-zinc-700",
    Script: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Filmed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Edited: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Ready: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Posted: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  const variants = {
    default: "bg-white/10 text-white border-transparent",
    outline: "border-white/20 text-zinc-300",
    secondary: "bg-zinc-800 text-zinc-400 border-transparent",
  };

  let style = variants[variant];
  if (status) {
    style = statusStyles[status];
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      style,
      className
    )}>
      {children}
    </span>
  );
};
