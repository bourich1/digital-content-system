import React, { useId } from 'react';
import './WorkflowBeam.css';

const services=[
 {name:'ChatGPT',icon:'openai',side:'left',row:0,category:'Brainstorm'},
 {name:'Notion',icon:'notion',side:'left',row:1,category:'Organize'},
 {name:'Google Calendar',icon:'googlecalendar',side:'left',row:2,category:'Plan'},
 {name:'Google Docs',icon:'googledocs',side:'right',row:0,category:'Write'},
 {name:'Trello',icon:'trello',side:'right',row:1,category:'Track'},
 {name:'Google Drive',icon:'googledrive',side:'right',row:2,category:'Keep'},
];
export default function WorkflowBeam(){
 const id=useId().replace(/:/g,'');
 return <section id="how-it-works" className="workflow-beam-section" aria-labelledby="workflow-beam-heading">
   <div className="workflow-beam-heading"><span>LESS SWITCHING. MORE CREATING.</span><h2 id="workflow-beam-heading">Your creative world.<br/><em>One BoostD workspace.</em></h2><p>From brainstorming to planning, writing to getting things done.<br/>Give every part of your creative process a place to come together.</p></div>
   <div className="workflow-beam-map" role="img" aria-label="ChatGPT for brainstorming, Notion for organizing, Google Calendar for planning, Google Docs for writing, Trello for tasks and Google Drive for files, gathered around the BoostD workspace.">
     <svg className="workflow-beam-lines" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">
       <defs><linearGradient id={`${id}-beam`}><stop offset="0%" stopColor="var(--landing-accent)" stopOpacity="0"/><stop offset="65%" stopColor="var(--landing-accent)"/><stop offset="100%" stopColor="var(--landing-accent)" stopOpacity=".2"/></linearGradient></defs>
       {services.map((service,index)=>{const x=service.side==='left'?150:850;const y=[80,210,340][service.row];const path=`M ${x} ${y} Q ${service.side==='left'?310:690} ${y} 500 210`;return <g key={service.icon}><path d={path} className="workflow-beam-track"/><path d={path} pathLength="1" className="workflow-beam-pulse" stroke={`url(#${id}-beam)`} style={{animationDelay:`${index*-.83}s`,animationDuration:`${4.5+service.row*.6}s`}}/></g>;})}
     </svg>
     <div className="workflow-beam-center"><div className="workflow-beam-halo"/><div className="workflow-beam-core"><img className="workflow-core-dark" src="/icon white.png" alt=""/><img className="workflow-core-light" src="/icon black.png" alt=""/></div><strong>BoostD</strong><span>YOUR CREATIVE HOME</span></div>
     {services.map(service=><div className={`workflow-beam-service workflow-beam-${service.side} workflow-beam-row-${service.row}`} key={service.icon}><div className="workflow-service-logo"><img src={`/images/brands/${service.icon}.svg`} alt="" width="28" height="28" loading="lazy"/></div><strong>{service.name}</strong><span>{service.category}</span></div>)}
   </div>
   <div className="workflow-beam-footer"><span>Ideas</span><i/><span>Plans</span><i/><span>Focus</span><i/><span>Partnerships</span></div>
 </section>;
}
