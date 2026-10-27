// Adapted from mdafsarx's Hover Footer on 21st.dev:
// https://21st.dev/@mdafsarx/components/hover-footer
import React, { useId, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
export function TextHoverEffect({ text }: { text: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const x = useMotionValue(50), y = useMotionValue(50);
  const smoothX = useSpring(x, { stiffness: 100, damping: 24 });
  const smoothY = useSpring(y, { stiffness: 100, damping: 24 });
  const cx = useTransform(smoothX, value => `${value}%`);
  const cy = useTransform(smoothY, value => `${value}%`);
  const textProps = { x: '50%', y: '52%', textAnchor: 'middle' as const, dominantBaseline: 'middle' as const, textLength: 748, lengthAdjust: 'spacingAndGlyphs' as const };

  return <svg ref={svg} className="boostd-footer-wordmark" viewBox="0 0 800 190" aria-hidden="true"
    onPointerMove={event => {
      if (reduced || event.pointerType !== 'mouse' || !svg.current) return;
      const rect = svg.current.getBoundingClientRect();
      x.set((event.clientX - rect.left) / rect.width * 100);
      y.set((event.clientY - rect.top) / rect.height * 100);
    }} onPointerLeave={() => { x.set(50); y.set(50); }}>
    <defs>
      <linearGradient id={`${id}-color`}><stop stopColor="#f07832"/><stop offset=".5" stopColor="#ffbd82"/><stop offset="1" stopColor="#f07832"/></linearGradient>
      <motion.radialGradient id={`${id}-reveal`} gradientUnits="objectBoundingBox" r="35%" cx={reduced ? '50%' : cx} cy={reduced ? '50%' : cy}>
        <stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="black"/>
      </motion.radialGradient>
      <mask id={`${id}-mask`}><rect width="100%" height="100%" fill={`url(#${id}-reveal)`}/></mask>
    </defs>
    <motion.text {...textProps} className="boostd-footer-outline" strokeWidth=".8"
      initial={reduced ? false : { strokeDashoffset: 1000, strokeDasharray: 1000 }}
      whileInView={{ strokeDashoffset: 0 }} viewport={{ once: true }}
      transition={{ duration: reduced ? 0 : 2.8, ease: 'easeInOut' }}>{text}</motion.text>
    <text {...textProps} stroke={`url(#${id}-color)`} strokeWidth="1.5" fill="transparent" mask={`url(#${id}-mask)`}>{text}</text>

  </svg>;
}
