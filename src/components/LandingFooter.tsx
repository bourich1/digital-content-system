import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail, Globe, ArrowUp, Instagram } from 'lucide-react';
import { TextHoverEffect } from '@/components/ui/hover-footer';
import './LandingFooter.css';

export default function LandingFooter({ theme }: { theme: 'dark' | 'light' }) {
  return <footer id="footer" className="boostd-hover-footer" aria-label="BoostD footer">
    <div className="boostd-footer-glow" aria-hidden="true"/>
    <div className="boostd-footer-content">
      <div className="boostd-footer-grid">
        <div className="boostd-footer-brand">
          <Link to="/" aria-label="BoostD home"><img src={`/logo ${theme === 'dark' ? 'white' : 'black'}.png`} alt="BoostD" width="400" height="185"/></Link>
          <p>A little structure. A lot more creativity.<br/>Your ideas, content calendar, tasks and brand deals — together in one workspace.</p>
        </div>
        <nav aria-label="Footer workspace links"><h3>Workspace</h3><ul>
          <li><Link to="/login?signup=true">Get started<ArrowUpRight size={13}/></Link></li>
          <li><Link to="/login">Sign in<ArrowUpRight size={13}/></Link></li>
        </ul></nav>
        <nav aria-label="Footer legal links"><h3>The essentials</h3><ul>
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/terms">Terms of Service</Link></li>
          <li><Link to="/support">Support Center</Link></li>
        </ul></nav>
        <div className="boostd-footer-contact"><h3>Let's connect</h3>
          <a href="mailto:officialboostd@gmail.com"><Mail size={16}/><span>officialboostd@gmail.com</span></a>
          <a href="https://www.boostd.app"><Globe size={16}/><span>boostd.app</span><ArrowUpRight size={13}/></a>
          <p>More space to think.<br/>More freedom to create.</p>
        </div>
      </div>
      <div className="boostd-footer-bottom">
        <a className="boostd-footer-instagram" href="https://www.instagram.com/boostdofficial" target="_blank" rel="noopener noreferrer" aria-label="Follow BoostD on Instagram"><span><Instagram size={17}/></span></a>
        <p>© {new Date().getFullYear()} BoostD. All rights reserved.</p>
        <a className="boostd-footer-back-top" href="#">Back to top<ArrowUp size={14}/></a>
      </div>
    </div>
    <div className="boostd-footer-type"><TextHoverEffect text="BOOSTD"/></div>
  </footer>;
}
