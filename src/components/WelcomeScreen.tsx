import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Lightbulb, Target, Sparkles } from 'lucide-react';
import './WelcomeScreen.css';

export default function WelcomeScreen({ name, preview, onContinue }: { name: string; preview: boolean; onContinue: () => void }) {
  const reduced = useReducedMotion();
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;
  useEffect(() => {
    const timer = window.setTimeout(() => continueRef.current(), 5000);
    return () => window.clearTimeout(timer);
  }, []);
  const reveal = (delay: number) => ({ initial: { opacity: 0, y: reduced ? 0 : 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduced ? 0 : .65, delay: reduced ? 0 : delay, ease: 'easeOut' as const } });
  return <div className="boostd-welcome-page">
    <img className="welcome-brand-watermark" src="/logo white.png" alt="" aria-hidden="true" />
    <header className="welcome-brand-header"><img src="/logo white.png" alt="BoostD"/><span><i/>{preview ? 'WELCOME PREVIEW' : 'YOUR SPACE IS READY'}</span></header>
    <div className="welcome-ambient" aria-hidden="true"><div/><div/>{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--x': `${7 + (index * 29) % 87}%`, '--y': `${8 + (index * 37) % 85}%`, '--delay': `${-(index * .73)}s`, '--duration': `${4 + index % 5}s` } as React.CSSProperties}/>)}</div>
    <main className="welcome-stage">
      <motion.div className="welcome-emblem-scene" initial={{ opacity: 0, scale: reduced ? 1 : .6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 90, damping: 17, duration: reduced ? 0 : undefined }}>
        <div className="welcome-orbit welcome-orbit-outer" aria-hidden="true"/><div className="welcome-orbit welcome-orbit-inner" aria-hidden="true"/>
        <div className="welcome-emblem-glow" aria-hidden="true"/>
        <div className="welcome-emblem"><img src="/icon white.png" alt=""/><motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: reduced ? 0 : .65 }}><Check size={16} strokeWidth={2.5}/></motion.span></div>
        <motion.span {...reveal(.4)} className="welcome-floating-label label-ideas"><Lightbulb size={13}/>Fresh ideas</motion.span>
        <motion.span {...reveal(.6)} className="welcome-floating-label label-focus"><Target size={13}/>More focus</motion.span>
        <span className="welcome-orbit-spark spark-one" aria-hidden="true">✦</span><span className="welcome-orbit-spark spark-two" aria-hidden="true">✧</span>
      </motion.div>
      <motion.div {...reveal(.35)} className="welcome-kicker"><span/>A LITTLE SPARK. A NEW CHAPTER.<span/></motion.div>
      <motion.h1 {...reveal(.55)}>Welcome aboard,<br/><span>{name.trim() || 'creator'}<b>.</b></span></motion.h1>
      <motion.p {...reveal(.8)} className="welcome-message">Your ideas deserve a place to grow.<br/>Make this one yours.</motion.p>
      <motion.div {...reveal(1)} className="welcome-ready-line"><span><Check size={12}/></span>{preview ? 'A preview of your first moment on BoostD' : 'Profile complete. A fresh start is waiting.'}</motion.div>
      <motion.div {...reveal(1.15)} className="welcome-auto-transition" role="status"><span>Opening your workspace…</span><div aria-hidden="true"><i/></div></motion.div>
      <motion.div {...reveal(1.35)} className="welcome-bottom-caption"><Sparkles size={12}/>YOUR NEXT BIG THING STARTS SMALL.</motion.div>
    </main>
    <footer className="welcome-page-footer"><span>MADE FOR YOUR MOMENTUM.</span><span>{preview ? 'Preview only · No account changes' : 'Welcome to the BoostD community'}</span></footer>
  </div>;
}
