import React from 'react';
import { cn } from '@/lib/utils';
import { IdeaStatus } from '@/types';
import { ideaStatusStyles } from '@/lib/ideaStatusStyles';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  status?: IdeaStatus;
}

export const Badge = ({ children, className, variant = 'default', status }: BadgeProps) => {
  const variants = {
    default: "bg-white/10 text-white border-transparent",
    outline: "border-white/20 text-zinc-300",
    secondary: "bg-zinc-800 text-zinc-400 border-transparent",
  };

  let style = variants[variant];
  if (status) {
    style = ideaStatusStyles[status].badge;
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
