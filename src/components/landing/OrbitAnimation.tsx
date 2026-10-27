"use client";

import { motion } from "framer-motion";
import {
  Music2,
  MessageCircle,
  Calendar,
  Cloud,
  FolderOpen,
} from "lucide-react";

interface OrbitIcon {
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  svg?: JSX.Element;
  label: string;
  color: string;
}

/* Inline SVGs for brand icons that lucide-react doesn't ship */
const YoutubeSvg = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55A3.016 3.016 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
  </svg>
);

const InstagramSvg = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/>
  </svg>
);

const TikTokSvg = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.23-.9 4.45-2.39 6.08-1.5 1.65-3.6 2.65-5.83 2.9-2.26.24-4.58-.2-6.47-1.4-1.9-1.23-3.23-3.21-3.67-5.4-.44-2.18-.08-4.51 1.05-6.39 1.14-1.89 3.04-3.3 5.16-3.83 2.1-.53 4.36-.34 6.27.67l.03 4.12c-1.34-1.07-3.21-1.39-4.83-.8-1.63.58-2.9 2.01-3.3 3.66-.4 1.66.02 3.46 1.19 4.73 1.17 1.28 2.99 1.83 4.69 1.49 1.7-.34 3.12-1.57 3.73-3.18.6-1.62.53-3.44.5-5.15.01-4.71.01-9.42.02-14.13z"/>
  </svg>
);

const MetaSvg = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M22.4 11.6c-.6-1.1-1.6-1.9-2.8-2.3-1.6-.5-3.3 0-4.5 1.1l-1.5 1.4-1.5-1.4c-1.2-1.1-2.9-1.6-4.5-1.1-1.2.4-2.2 1.2-2.8 2.3-.9 1.6-.9 3.6 0 5.2.6 1.1 1.6 1.9 2.8 2.3 1.6.5 3.3 0 4.5-1.1l1.5-1.4 1.5 1.4c1.2 1.1 2.9 1.6 4.5 1.1 1.2-.4 2.2-1.2 2.8-2.3.9-1.6.9-3.6 0-5.2zM21 16c-.4.7-1 1.3-1.8 1.5-1 .3-2.1 0-2.9-.7l-2.6-2.5 2.6-2.5c.8-.7 1.9-1 2.9-.7.8.2 1.4.8 1.8 1.5.6 1 .6 2.3 0 3.4zM7.7 16.8c-1 .3-2.1 0-2.9-.7-.4-.4-.8-.9-1-1.5-.6-1-.6-2.3 0-3.4.4-.7 1-1.3 1.8-1.5 1-.3 2.1 0 2.9.7l2.6 2.5-2.6 2.5z"/>
  </svg>
);

const FacebookSvg = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z"/>
  </svg>
);

const ThreadsSvg = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M14.2 11.2c-.3-.8-.9-1.3-1.6-1.5-.7-.2-1.5-.1-2.2.2-1.5.8-2.1 2.5-1.9 4.1.2 1.4 1.3 2.5 2.8 2.5 1.1 0 2.1-.7 2.5-1.7l1.7.8c-.8 1.6-2.3 2.6-4.1 2.6-2.5 0-4.5-1.9-4.7-4.4-.2-2.7 1.9-5 4.6-5.1 1.6 0 3.2.8 4 2.2l-1.5.9zM12 10.5c-.7 0-1.3.5-1.5 1.1-.1.4-.1.8 0 1.2.3.8 1 1.2 1.8 1.1.7-.1 1.3-.6 1.5-1.3.1-.3.1-.6 0-.9-.2-.7-.9-1.2-1.8-1.2z"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
  </svg>
);

const innerIcons: OrbitIcon[] = [
  { icon: FacebookSvg, label: "Facebook", color: "#1877F2" },
  { icon: InstagramSvg, label: "Instagram", color: "#E4405F" },
  { icon: ThreadsSvg, label: "Threads", color: "#FFFFFF" },
];

const outerIcons: OrbitIcon[] = [
  { icon: MetaSvg, label: "Meta", color: "#0668E1" },
  { icon: YoutubeSvg, label: "YouTube", color: "#FF0000" },
  { icon: TikTokSvg, label: "TikTok", color: "#00f2ea" },
  { icon: FacebookSvg, label: "Facebook Page", color: "#1877F2" },
];

function OrbitRing({
  radius,
  icons,
  duration,
  reverse = false,
}: {
  radius: number;
  icons: OrbitIcon[];
  duration: number;
  reverse?: boolean;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]"
      style={{
        width: radius * 2,
        height: radius * 2,
        animation: `${reverse ? "orbit-spin-reverse" : "orbit-spin"} ${duration}s linear infinite`,
      }}
    >
      {icons.map((item, i) => {
        const angle = (360 / icons.length) * i;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const IconComp = item.icon!;

        return (
          <div
            key={item.label}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            <div
              className="glass rounded-xl p-2.5 shadow-lg"
              style={{
                animation: `${reverse ? "orbit-spin" : "orbit-spin-reverse"} ${duration}s linear infinite`,
              }}
              title={item.label}
            >
              <IconComp className="w-5 h-5" style={{ color: item.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OrbitAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      {/* Background glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-orange/5 blur-[100px]" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple/5 blur-[100px] translate-x-8" />

      {/* Center dot */}
      <div className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-orange to-purple shadow-lg" />

      {/* Rings */}
      <OrbitRing radius={130} icons={innerIcons} duration={40} />
      <OrbitRing radius={220} icons={outerIcons} duration={55} reverse />
    </motion.div>
  );
}
