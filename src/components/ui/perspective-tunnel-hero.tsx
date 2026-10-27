import React, { Children, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import './perspective-tunnel-hero.css';

type Stage = {width:number;height:number};
function TunnelCard({children,index,progress,pointer,stage}:{children:React.ReactNode;index:number;progress:MotionValue<number>;pointer:{x:MotionValue<number>;y:MotionValue<number>};stage:Stage}) {
  const start=index*.15;
  const local=useTransform(progress,[start,start+.55],[0,1]);
  const z=useTransform(local,[0,1],[-1250,360]);
  const opacity=useTransform(local,[0,.15,.78,1],[0,1,1,0]);
  const mobile=stage.width<700;
  const angle=[-145,-30,145,35][index%4]*Math.PI/180;
  const transform=useTransform([z,pointer.x,pointer.y],([depth,px,py]:number[])=>{
    const x=Math.cos(angle)*stage.width*(mobile?.29:.31)-px*20;
    const y=Math.sin(angle)*stage.height*.3-py*15;
    return `translate3d(calc(-50% + ${x}px),calc(-50% + ${y}px),${depth}px) rotateZ(${index%2?5:-5}deg)`;
  });
  return <motion.div className="boostd-tunnel-card" style={{transform,opacity,width:mobile?260:410}}>{children}</motion.div>;
}

export default function PerspectiveTunnelHero({children,title}:{children:React.ReactNode;title:React.ReactNode}) {
  const ref=useRef<HTMLDivElement>(null);
  const viewport=useRef<HTMLDivElement>(null);
  const reduced=useReducedMotion();
  const [stage,setStage]=useState<Stage>({width:1100,height:650});
  const {scrollYProgress}=useScroll({target:ref,offset:['start start','end end']});
  const progress=useSpring(scrollYProgress,{stiffness:80,damping:30,restDelta:.0001});
  const rawX=useMotionValue(0),rawY=useMotionValue(0);
  const x=useSpring(rawX,{stiffness:60,damping:25}),y=useSpring(rawY,{stiffness:60,damping:25});
  const scale=useTransform(progress,[0,.5,1],[.9,1,1.08]);
  const titleOpacity=useTransform(progress,[0,.1,.85,1],[1,1,1,.45]);
  useEffect(()=>{
    const el=viewport.current;if(!el)return;
    const observer=new ResizeObserver(([entry])=>setStage({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(el);return()=>observer.disconnect();
  },[]);
  return <div ref={ref} className={`boostd-tunnel${reduced?' boostd-tunnel-static':''}`}>
    <div ref={viewport} className="boostd-tunnel-viewport" onPointerMove={event=>{if(reduced||event.pointerType!=='mouse')return;const r=event.currentTarget.getBoundingClientRect();rawX.set((event.clientX-r.left)/r.width*2-1);rawY.set((event.clientY-r.top)/r.height*2-1);}} onPointerLeave={()=>{rawX.set(0);rawY.set(0);}}>
      <div className="boostd-tunnel-guides" aria-hidden="true"><i/><i/></div>
      <motion.div className="boostd-tunnel-title" style={reduced?undefined:{scale,opacity:titleOpacity}}>{title}</motion.div>
      <div className="boostd-tunnel-plane">{Children.toArray(children).map((child,index)=>reduced?<div key={index}>{child}</div>:<TunnelCard key={index} index={index} progress={progress} pointer={{x,y}} stage={stage}>{child}</TunnelCard>)}</div>
      {!reduced&&<span className="boostd-tunnel-prompt" aria-hidden="true">SCROLL TO EXPLORE<i/></span>}
    </div>
  </div>;
}
