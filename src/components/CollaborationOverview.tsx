import React from 'react';
import { Eye, Edit2, Trash2, Handshake, CalendarDays, ArrowUpRight, Sparkles, MessageSquare, BadgeCheck, Clapperboard, Scissors, Send, CircleCheck, Clock3 } from 'lucide-react';
import type { Collaboration } from '@/types';
import { collaborationStages, deadline, remainingBudget } from '@/lib/collaborationPresentation';
const icons = { new: Sparkles, negotiation: MessageSquare, accepted: BadgeCheck, filming: Clapperboard, editing: Scissors, scheduled: Clock3, posted: Send, completed: CircleCheck };
export function CollaborationStage({ collab }: { collab: Collaboration }) {
  const stage = collaborationStages[collab.status] || collaborationStages.new;
  const Icon = icons[collab.status] || Sparkles;
  return <span className="collab-stage" style={{ '--stage-color': stage.color } as React.CSSProperties}><Icon size={13} />{stage.label}</span>;
}
export default function CollaborationOverview({ collab, currentUserId, onView, onEdit, onDelete, onRespond }: { collab: Collaboration; currentUserId?: string; onView: () => void; onEdit: () => void; onDelete: () => void; onRespond: (status: 'accepted' | 'declined') => void }) {
  const due = deadline(collab);
  const completed = collab.status === 'completed';
  const expired = due.tone === 'overdue';
  const showOverlay = completed || expired;
  return <article className={`collab-card${showOverlay ? ' collab-card-completed' : ''}${expired ? ' collab-card-expired' : ''}`} style={{ '--stage-color': (collaborationStages[collab.status] || collaborationStages.new).color } as React.CSSProperties}>
    <div className="collab-card-body" inert={showOverlay ? true : undefined} aria-hidden={showOverlay || undefined}>
    <div className="collab-card-top"><div className="collab-brand-icon">{collab.brand_image ? <img src={collab.brand_image} alt="" /> : <Handshake size={23} />}</div><div className="collab-brand-name"><button onClick={onView}>{collab.brand_name || 'Untitled collaboration'}</button><span>{collab.deal_type || 'Partnership'} collaboration</span></div><div className="collab-card-actions"><button aria-label={`View ${collab.brand_name}`} onClick={onView}><Eye size={16} /></button><button aria-label={`Edit ${collab.brand_name}`} onClick={onEdit}><Edit2 size={15} /></button><button aria-label={`Delete ${collab.brand_name}`} onClick={onDelete}><Trash2 size={15} /></button></div></div>
    <div className="collab-tags"><CollaborationStage collab={collab} /><span>{collab.platform} · {collab.content_type}{collab.videos_count > 1 ? ` ×${collab.videos_count}` : ''}</span></div>
    <p className="collab-card-note">{collab.notes || 'Add a brief or notes to keep this partnership on track.'}</p>
    {collab.partner && <div className="collab-partner"><span>With @{collab.partner.username}</span><small>{collab.partner_status === 'pending' ? 'Awaiting approval' : collab.partner_status}</small>{currentUserId === collab.partner_id && collab.partner_status === 'pending' && <div><button onClick={() => onRespond('accepted')}>Accept</button><button onClick={() => onRespond('declined')}>Decline</button></div>}</div>}
    <div className={`collab-deadline ${due.tone}`}><CalendarDays size={14} />{due.label}</div>
    <footer><div>{collab.deal_type === 'paid' ? <><strong>${Number(collab.budget || 0).toLocaleString()}</strong><span className={remainingBudget(collab) > 0 ? 'payment-outstanding' : 'payment-complete'}>{remainingBudget(collab) > 0 ? `$${remainingBudget(collab).toLocaleString()} outstanding` : Number(collab.budget) > 0 ? 'Paid in full' : 'Budget not set'}</span></> : <span className="collab-nonpaid">{collab.deal_type === 'affiliate' ? 'Affiliate partnership' : collab.deal_type === 'services' ? 'Service exchange' : 'Creator partnership'}</span>}</div><button onClick={onView}>Details<ArrowUpRight size={15} /></button></footer>
    </div>
    {showOverlay && <div className="collab-completed-overlay">{expired ? <Clock3 size={34} strokeWidth={1.5} /> : <CircleCheck size={34} strokeWidth={1.5} />}<span className="collab-completed-eyebrow">{expired ? 'POSTING DATE HAS PASSED' : 'ALL WRAPPED UP'}</span><h3>{expired ? 'Deadline passed' : 'Completed'}</h3><p>{collab.brand_name || 'Collaboration'} · {expired ? due.label : 'This collaboration is done.'}</p><div className="collab-completed-actions"><button onClick={onView}>View details<ArrowUpRight size={14} /></button>{expired && <button onClick={onEdit}>Reschedule<CalendarDays size={14} /></button>}<button className="collab-remove" onClick={onDelete} aria-label={`Remove ${collab.brand_name}`}><Trash2 size={14} />Remove</button></div></div>}
  </article>;
}
