import React, { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import './PublicPage.css';
export default function PublicNavbar({theme,onToggle}:{theme:'dark'|'light';onToggle:()=>void}){
 const {pathname}=useLocation();
 useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'instant'});},[pathname]);
 return <header className="public-navbar"><div className="public-navbar-inner">
  <Link to="/" className="public-brand" aria-label="BoostD home"><img src={`/logo ${theme==='dark'?'white':'black'}.png`} alt="BoostD"/></Link>
  <nav aria-label="Main navigation"><NavLink to="/privacy">Privacy</NavLink><NavLink to="/terms">Terms</NavLink></nav>
  <div className="public-nav-actions"><button type="button" className="public-theme-toggle" onClick={onToggle} aria-label={`Switch to ${theme==='dark'?'light':'dark'} mode`}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button><Link className="public-sign-in" to="/login">Sign In</Link><Link className="public-get-started" to="/login?signup=true">Get Started</Link></div>
 </div></header>;
}
