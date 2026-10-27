import { BoostDShinyAction } from '@/components/ui/boostd-shiny-action';
import BlurText from '@/components/ui/BlurText';
import React, { useRef } from 'react';
import { ArrowUpRight, Lightbulb, CalendarDays, Timer, Check, Play, Sparkles, ArrowRight } from 'lucide-react';
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import './CreativeCTA.css';

export default function CreativeCTA({ theme }: { theme: 'dark' | 'light' }) {
  const root = useRef<HTMLElement>(null);
  const visible = useInView(root, { margin: '100px' });
  const reduced = useReducedMotion();
  const tiltX = useMotionValue(0), tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 70, damping: 22 });
  const rotateY = useSpring(tiltY, { stiffness: 70, damping: 22 });
  return <section id="get-started" ref={root} className={`creative-cta-section ${visible ? 'cta-in-view' : ''}`} aria-labelledby="creative-cta-heading"
    onPointerMove={event => {
      if (reduced || event.pointerType !== 'mouse' || !root.current) return;
      const rect = root.current.getBoundingClientRect();
      tiltX.set(-((event.clientY - rect.top) / rect.height - .5) * 5);
      tiltY.set(((event.clientX - rect.left) / rect.width - .5) * 7);
    }} onPointerLeave={() => { tiltX.set(0); tiltY.set(0); }}>
    <div className="creative-cta-shell">
      <div className="creative-cta-grain" aria-hidden="true"/>
      <motion.div className="creative-cta-copy" initial={false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .65 }}>
        <span className="creative-cta-eyebrow"><Sparkles size={13}/> YOUR NEXT CHAPTER STARTS HERE</span>
        <h2 id="creative-cta-heading"><BlurText as="span" className="creative-cta-heading-blur"
          text="Ready to organize your content with BoostD?" breakAfter={[2, 4]}
          renderWord={(word: string, index: number) => index === 6 ? <span className="cta-heading-brand"><img src={`/logo ${theme === 'dark' ? 'white' : 'black'}.png`} alt="" width="747" height="167"/><span>?</span></span> : word}
          effect="blur" animateBy="words" direction="top" trigger="view"
          delay={85} stepDuration={0.3} blur={8} distance={18}/></h2>
        <p>Less scattered ideas. More space to create.<br/>Bring your plans, tasks and next big thing together in one creative workspace.</p>
        <div className="creative-cta-actions"><BoostDShinyAction to="/login?signup=true">Get Started Free<ArrowUpRight size={16}/></BoostDShinyAction><BoostDShinyAction to="/login" tone="secondary">Sign In<ArrowRight size={14}/></BoostDShinyAction></div>
        <span className="creative-cta-note"><span/>Think it. Plan it. Make it happen.</span>
      </motion.div>
      <div className="creative-cta-visual" aria-hidden="true">
        <motion.div className="creative-cta-parallax" style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}>
          <div className="creative-cta-scene">
            <div className="cta-orbit cta-orbit-one"/><div className="cta-orbit cta-orbit-two"/>
            <svg className="cta-workflow-path" viewBox="0 0 480 420"><path d="M 130 100 C 420 20 430 280 260 300 S 40 330 125 150"/><path className="cta-path-spark" d="M 130 100 C 420 20 430 280 260 300 S 40 330 125 150"/></svg>
            <div className="cta-mini-card cta-mini-idea"><div className="cta-mini-label"><Lightbulb size={14}/><span>THE NEXT BIG IDEA</span><i/></div><strong>What if you<br/>just started?</strong><span className="cta-mini-tag">A spark worth keeping<ArrowUpRight size={11}/></span></div>
            <div className="cta-mini-card cta-mini-calendar"><div className="cta-mini-label"><CalendarDays size={14}/><span>A LITTLE STRUCTURE</span></div><strong>Your week, in view.</strong><div className="cta-week">{['M','T','W','T','F'].map((day,i)=><span key={i} className={i===2?'cta-day-active':''}><small>{day}</small><b>{12+i}</b>{i===2&&<i/>}</span>)}</div><div className="cta-calendar-event"><span/>Create something good.</div></div>
            <div className="cta-mini-card cta-mini-focus"><div className="cta-mini-label"><Timer size={14}/><span>ROOM TO FOCUS</span></div><strong>25<span>:</span>00</strong><div className="cta-focus-track"><i/></div><span className="cta-focus-caption">One task. Your full attention.<Play size={11}/></span></div>
            <div className="cta-mini-card cta-mini-task"><span className="cta-task-check"><Check size={16}/></span><div><strong>From idea to done.</strong><span>Your creative flow, connected.</span></div></div>
            <div className="cta-brand-seal"><img src={`/icon ${theme === 'dark' ? 'white' : 'black'}.png`} width="410" height="189" alt=""/></div>
            <span className="cta-spark cta-spark-one">+</span><span className="cta-spark cta-spark-two">+</span>
          </div>
        </motion.div>
      </div>
    </div>
  </section>;
}
