import PerspectiveTunnelHero from '@/components/ui/perspective-tunnel-hero';
import React from 'react';
import './AboutBento.css';

const cards = [
  {key:'ideas',word:'Ideas.',category:'CONTENT & INSPIRATION',image:'ideas',line:'Give your next big idea a home.',detail:'Capture inspiration, shape your scripts, and keep every draft together.'},
  {key:'plan',word:'Plan.',category:'CALENDAR & TASKS',image:'planning',line:'A clear plan. A calmer creative day.',detail:'Organize tasks, publishing dates and your next deliverables.'},
  {key:'focus',word:'Focus.',category:'YOUR QUIET SPACE',image:'focus',line:'One task. Your full attention.',detail:'Set your timer and find your flow with calm sounds or Quran.'},
  {key:'deals',word:'Collaborate.',category:'BRAND PARTNERSHIPS',image:'collaborations',line:'Great partnerships, all in sync.',detail:'Keep brand deals, deliverables and payments in one place.'},
];
export default function AboutBento() {
  return <section id="about" className="about-bento-section">
    <PerspectiveTunnelHero title={<div className="about-bento-heading"><span>ABOUT BOOSTD</span><h2>A little structure.<br /><em>A lot more possibility.</em></h2><p>A home for your ideas, a plan for your content, and room to focus.<br />BoostD brings your creative workflow together.</p></div>}>
      {cards.map((card,index)=><article className={`about-bento-card about-bento-${card.key}`} key={card.key}>
        <div className="about-art-heading"><span>{String(index+1).padStart(2,'0')} / {card.category}</span><h3>{card.word}</h3></div>
        <div className="about-bento-visual about-bento-art" aria-hidden="true"><img src={`/images/about/${card.image}-v1.webp`} alt="" loading="lazy" decoding="async" width="1536" height="1024" /></div>
        <div className="about-bento-copy"><p className="about-art-tagline">{card.line}</p><p>{card.detail}</p></div>
      </article>)}
    </PerspectiveTunnelHero>
  </section>;
}
