import React from 'react';
import { Lightbulb, CalendarDays, ListChecks, Timer, Handshake, Sparkles, Check, Image, FileText, Scissors } from 'lucide-react';
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid';
const art=(name:string)=><img src={`/images/about/${name}-v1.png`} alt="" loading="lazy" decoding="async"/>;
const capabilities=[
 {name:'Content Idea Management',description:'Capture inspiration, shape your scripts and track every idea from first spark to published story.',Icon:Lightbulb,href:'/ideas',cta:'Explore content ideas',className:'capability-ideas',background:art('ideas')},
 {name:'Editorial Calendar',description:'Keep publishing dates and upcoming collaborations in view.',Icon:CalendarDays,href:'/calendar',cta:'Open the calendar',className:'capability-calendar',background:art('planning')},
 {name:'Your Tasks, Organized',description:'Turn creative projects into clear, actionable steps.',Icon:ListChecks,href:'/tasks',cta:'Organize your tasks',className:'capability-tasks',background:<div className="capability-task-graphic">{[0,1,2].map(i=><span key={i}><Check size={14}/><i/></span>)}</div>},
 {name:'Focus Room & Deep Work',description:'Choose your task, start a focus session and find your rhythm with calm sounds or Quran.',Icon:Timer,href:'/focus',cta:'Find your focus',className:'capability-focus',background:art('focus')},
 {name:'Brand Deals & Sponsorships',description:'Bring partnerships, deliverables and payments together. Keep every brand collaboration moving forward.',Icon:Handshake,href:'/collaborations',cta:'Manage collaborations',className:'capability-deals',background:art('collaborations')},
 {name:'Your Creative Toolkit',description:'Discover useful tools for designing, editing and bringing ideas to life.',Icon:Sparkles,href:'/tools',cta:'Explore the tools',className:'capability-tools',background:<div className="capability-tool-graphic"><Image/><Scissors/><FileText/><Sparkles/></div>},
];
export default function FeaturesBento(){return <BentoGrid>{capabilities.map(item=><BentoCard key={item.name} {...item}/>)}</BentoGrid>;}
