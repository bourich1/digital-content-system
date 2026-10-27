import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText, ShieldCheck, Mail } from 'lucide-react';
import PublicNavbar from './PublicNavbar';
import {usePublicTheme} from '@/hooks/usePublicTheme';
import './LegalPage.css';
export default function LegalPage({kind,sections,children}:{kind:'privacy'|'terms';sections:string[];children:ReactNode}){
 const {theme,toggleTheme}=usePublicTheme();const privacy=kind==='privacy';const Icon=privacy?ShieldCheck:FileText;
 return <div className="public-page legal-page" data-theme={theme}><PublicNavbar theme={theme} onToggle={toggleTheme}/>
  <main className="legal-main"><div className="legal-intro"><span className="legal-eyebrow">THE IMPORTANT DETAILS</span><div className="legal-intro-title"><h1>{privacy?'Your privacy.':'Clear terms.'}<br/><em>{privacy?'Handled with care.':'A better experience.'}</em></h1><Icon aria-hidden="true"/></div><p>{privacy?'How BoostD collects, uses and protects your information.':'The terms that guide your use of the BoostD workspace.'}</p><div className="legal-tabs"><Link to="/privacy" aria-current={privacy?'page':undefined}>Privacy Policy</Link><Link to="/terms" aria-current={!privacy?'page':undefined}>Terms of Service</Link></div></div>
  <div className="legal-layout"><aside className="legal-sidebar"><span>ON THIS PAGE</span><nav aria-label="Document sections">{sections.map((section,index)=><button type="button" key={section} onClick={()=>document.getElementById(`${kind}-${index+1}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}><small>{String(index+1).padStart(2,'0')}</small>{section}</button>)}</nav><a className="legal-help" href="mailto:support@boostd.app"><Mail size={18}/><strong>Have a question?</strong><span>We're here to help.</span><span>support@boostd.app <ArrowUpRight size={12}/></span></a></aside><article className="legal-document" aria-label={privacy?'Privacy Policy':'Terms of Service'}>{children}</article></div>
  <footer className="legal-footer"><Link to="/">Back to BoostD <ArrowUpRight size={13}/></Link><span>Your space. Your creativity.</span><Link to={privacy?'/terms':'/privacy'}>{privacy?'Terms of Service':'Privacy Policy'}</Link></footer></main></div>;
}
