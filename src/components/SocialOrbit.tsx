import React from 'react';
import './SocialOrbit.css';
const platforms = [
{name:'Facebook',color:'#1877f2',icon:(<svg aria-hidden="true" className="social-orbit-symbol" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/>
              </svg>)},
{name:'X',color:'#d4d4d8',icon:(<svg aria-hidden="true" className="social-orbit-symbol" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>)},
{name:'Instagram',color:'#e75c9a',icon:(<svg aria-hidden="true" className="social-orbit-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>)},
{name:'LinkedIn',color:'#38bdf8',icon:(<svg aria-hidden="true" className="social-orbit-symbol" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z"/>
              </svg>)},
{name:'YouTube',color:'#ff4040',icon:(<svg aria-hidden="true" className="social-orbit-symbol" viewBox="0 0 24 24"><rect x="1" y="4.5" width="22" height="15" rx="5" fill="#ff3030"/><path d="m10 8 6 4-6 4z" fill="white"/></svg>)},
{name:'TikTok',color:'#5eead4',icon:(<svg aria-hidden="true" className="social-orbit-symbol" viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 2h-3.5v13.7a3 3 0 1 1-2.6-3V9.2a6.5 6.5 0 1 0 6.1 6.5V8.8a8.5 8.5 0 0 0 5.1 1.7V7a5.1 5.1 0 0 1-5.1-5Z"/></svg>)}
];
export default function SocialOrbit() {
 return <div className="social-orbit" role="img" aria-label="BoostD surrounded by Facebook, Instagram, LinkedIn, YouTube, TikTok and X"><div className="social-orbit-center"><img src="/icon white.png" alt="BoostD"/></div>{[[0,1],[2,3],[4,5]].map((pair,ring) => <div key={ring} className={'social-orbit-ring ring-' + ring}>{pair.map((index,position) => {const item=platforms[index]; return <div className={'social-orbit-position position-' + position} key={item.name}><div className="social-orbit-upright"><div className={'social-orbit-badge brand-' + item.name.toLowerCase()} title={item.name}>{item.icon}</div></div></div>;})}</div>)}</div>;
}
