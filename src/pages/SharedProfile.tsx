import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Flame, Clock, Target, Star, ArrowUpRight } from 'lucide-react';
import { readSnapshot } from '@/lib/profilePresentation';
import './Profile.css';

export default function SharedProfile() {
  const location = useLocation();
  const encoded = new URLSearchParams(location.hash.slice(1)).get('profile') || '';
  const snapshot = readSnapshot(encoded);
  if (!snapshot) return <main className="shared-profile-page"><Link to="/"><img src="/logo%20white.png" alt="BoostD" /></Link><section className="shared-profile-empty"><h1>This profile link is incomplete.</h1><p>Ask the creator to copy a fresh share link from their profile.</p><Link to="/">Visit BoostD<ArrowUpRight size={15} /></Link></section></main>;
  return <main className="shared-profile-page" style={{ '--profile-accent': snapshot.accent } as React.CSSProperties}><header><Link to="/"><img src="/logo%20white.png" alt="BoostD" /></Link><span>SHARED PROFILE</span></header><section className="profile-identity"><div className="profile-atmosphere" aria-hidden="true" /><div className="profile-person"><div className="profile-avatar">{snapshot.avatar ? <img src={snapshot.avatar} alt={snapshot.name} /> : <span>{snapshot.name.slice(0, 2).toUpperCase()}</span>}</div><div className="profile-name-block"><span className="profile-username">@{snapshot.username || 'creator'}</span><h1>{snapshot.name}</h1>{snapshot.occupation && <p className="profile-occupation"><Briefcase size={15} />{snapshot.occupation}</p>}</div></div><p className="profile-bio">{snapshot.bio || 'A little focus. A lot of possibility.'}</p><div className="profile-stats">{[{label:'Day streak',value:snapshot.streak,icon:Flame},{label:'Work hours',value:snapshot.hours,icon:Clock},{label:'Focus sessions',value:snapshot.sessions,icon:Target},{label:'Points',value:snapshot.points,icon:Star}].map(stat=><div key={stat.label}><stat.icon size={18}/><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div></section><footer>A shared snapshot from the creator.<Link to="/">Make room for your ideas with BoostD<ArrowUpRight size={14}/></Link></footer></main>;
}
