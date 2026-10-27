import type { IdeaStatus } from '@/types';

export const ideaStatusStyles: Record<IdeaStatus, { icon: string; badge: string }> = {
  Idea: { icon: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  Script: { icon: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  Filmed: { icon: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  Edited: { icon: 'text-violet-400', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  Ready: { icon: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  Posted: { icon: 'text-cyan-400', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
};
