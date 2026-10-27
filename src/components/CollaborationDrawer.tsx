import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Edit2, Handshake, ExternalLink } from 'lucide-react';
import type { Collaboration } from '@/types';
import { CollaborationStage } from './CollaborationOverview';
import { deadline, remainingBudget } from '@/lib/collaborationPresentation';

function safeLink(value?: string) { try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
export default function CollaborationDrawer({ collab, onClose, onEdit }: { collab: Collaboration; onClose: () => void; onEdit: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const elements = panel.current?.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex="0"]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  const links = [collab.website, collab.creator_profile_link, collab.affiliate_link, ...(collab.social_links || []).map(link => link.url), ...(collab.inspiration_links || '').split(/\s+/)].map(safeLink).filter((value, index, all) => value && all.indexOf(value) === index);
  return createPortal(<motion.div className="collab-drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="collab-drawer-title" tabIndex={-1} className="collab-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: .25 }} onClick={event => event.stopPropagation()}>
    <header><span>PARTNERSHIP DETAILS</span><button aria-label="Close collaboration details" onClick={onClose}><X size={21} /></button></header>
    <div className="collab-drawer-identity"><div className="collab-brand-icon">{collab.brand_image ? <img src={collab.brand_image} alt="" /> : <Handshake size={26} />}</div><h2 id="collab-drawer-title">{collab.brand_name}</h2><p>{collab.deal_type} collaboration</p><CollaborationStage collab={collab} /></div>
    <section><h3>Deliverables & dates</h3><dl><div><dt>Platform</dt><dd>{collab.platform || 'Not set'}</dd></div><div><dt>Content</dt><dd>{collab.content_type || 'Not set'} · {collab.videos_count || 1} item(s)</dd></div><div><dt>Filming</dt><dd>{collab.filming_date ? new Date(collab.filming_date).toLocaleDateString() : 'Not scheduled'}</dd></div><div><dt>Publishing</dt><dd className={deadline(collab).tone}>{deadline(collab).label}</dd></div>{collab.partner && <div><dt>Partner</dt><dd>@{collab.partner.username} · {collab.partner_status || 'Pending'}</dd></div>}</dl></section>
    {collab.deal_type === 'paid' && <section><h3>Payment overview</h3><dl><div><dt>Budget</dt><dd>${Number(collab.budget || 0).toLocaleString()}</dd></div><div><dt>Received</dt><dd>${Number(collab.paid_amount || 0).toLocaleString()}</dd></div><div><dt>Outstanding</dt><dd className={remainingBudget(collab) ? 'soon' : ''}>${remainingBudget(collab).toLocaleString()}</dd></div></dl></section>}
    {[['Brief & goal', collab.collaboration_goal], ['Content ideas', collab.content_ideas], ['Notes', collab.notes], ['Service details', collab.service_description], ['Affiliate notes', collab.affiliate_notes]].filter(([, value]) => value).map(([label, value]) => <section key={label}><h3>{label}</h3><p>{value}</p></section>)}
    {(collab.contact_name || collab.contact_email || collab.contact_phone) && <section><h3>Contact</h3><p>{[collab.contact_name, collab.contact_email, collab.contact_phone].filter(Boolean).join('\n')}</p></section>}
    {links.length > 0 && <section><h3>Useful links</h3><div className="collab-drawer-links">{links.map(link => <a key={link} href={link!} target="_blank" rel="noopener noreferrer">{new URL(link!).hostname}<ExternalLink size={13} /></a>)}</div></section>}
    <footer><button onClick={onEdit}><Edit2 size={15} />Edit collaboration</button></footer>
  </motion.div></motion.div>, document.body);
}
