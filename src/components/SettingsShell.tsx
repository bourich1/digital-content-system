import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserRound, SlidersHorizontal, ShieldCheck, ChevronRight } from 'lucide-react';
import '@/pages/SettingsShell.css';

export default function SettingsShell({ children }: { children: React.ReactNode }) {
  return <div className="settings-shell">
    <header className="settings-heading"><span>MAKE IT YOURS</span><h1>Settings<span>.</span></h1><p>A space for your profile, your account, and your peace of mind.</p></header>
    <div className="settings-workspace"><nav aria-label="Settings navigation" className="settings-nav">
      <span>YOUR ACCOUNT</span>
      {[{ to: '/settings', label: 'Profile', description: 'Your identity & progress', icon: UserRound }, { to: '/settings/account', label: 'Account', description: 'Your account information', icon: SlidersHorizontal }, { to: '/settings/security', label: 'Security', description: 'Password & sign-in', icon: ShieldCheck }].map(({ to, label, description, icon: Icon }) => <NavLink key={to} to={to} end={to === '/settings'}><Icon size={19} /><div><strong>{label}</strong><small>{description}</small></div><ChevronRight size={14} /></NavLink>)}
      <div className="settings-nav-note"><ShieldCheck size={18} /><p>Your space.<br />Your settings.</p></div>
    </nav><div className="settings-content">{children}</div></div>
  </div>;
}
