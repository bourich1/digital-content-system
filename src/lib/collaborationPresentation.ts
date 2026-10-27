import type { Collaboration, CollaborationStatus } from '@/types';
export const collaborationStages: Record<CollaborationStatus, { label: string; color: string }> = {
  new: { label: 'New', color: '#a1a1aa' }, negotiation: { label: 'Negotiation', color: '#fbbf24' }, accepted: { label: 'Accepted', color: '#60a5fa' }, filming: { label: 'Filming', color: '#fb923c' }, editing: { label: 'Editing', color: '#a78bfa' }, scheduled: { label: 'Scheduled', color: '#22d3ee' }, posted: { label: 'Posted', color: '#34d399' }, completed: { label: 'Completed', color: '#86efac' },
};
export function remainingBudget(collab: Collaboration) { return Math.max(0, Number(collab.budget || 0) - Number(collab.paid_amount || 0)); }
export function deadline(collab: Collaboration, now = new Date()) {
  if (!collab.posting_date) return { label: 'No posting date', tone: 'muted' };
  const date = new Date(collab.posting_date); if (Number.isNaN(date.getTime())) return { label: 'No posting date', tone: 'muted' };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  const done = ['posted', 'completed'].includes(collab.status);
  return { label: done ? `Published · ${date.toLocaleDateString()}` : days < 0 ? `Overdue · ${Math.abs(days)}d` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Publish · ${date.toLocaleDateString()}`, tone: done ? 'muted' : days < 0 ? 'overdue' : days <= 7 ? 'soon' : 'muted' };
}
