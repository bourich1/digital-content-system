"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { hero } from "@/data/content";
import { GradientText } from "./GradientText";
import { OrbitAnimation } from "./OrbitAnimation";

const floatingCardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, delay: 0.6 + delay, ease: "easeOut" as const },
  }),
};

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-16 overflow-hidden">
      {/* Background gradient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-orange/[0.07] via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-gradient-radial from-purple/[0.05] via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Orbits (behind content) */}
      <div className="absolute inset-0 top-12">
        <OrbitAnimation />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Boostd Digital Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center gap-2 mb-8 mt-4"
        >
          <img src="/logo white.png" alt="BoostD" className="h-8 w-auto object-contain" />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-semibold tracking-tight leading-[1.1] mb-6"
        >
          {hero.headlineStart}
          <br />
          <GradientText>{hero.headlineGradient}</GradientText>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-muted max-w-xl mx-auto mb-10 leading-relaxed"
        >
          {hero.subheadline}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
          <a
            href="#"
            className="text-base font-semibold px-10 py-5 rounded-2xl w-full sm:w-auto text-center bg-white text-black hover:bg-zinc-200 transition-colors shadow-xl shadow-white/10"
          >
            {hero.ctaPrimary}
          </a>
          <a
            href="#"
            className="text-base font-medium px-8 py-5 rounded-2xl w-full sm:w-auto text-center bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            {hero.ctaSecondary}
          </a>
        </motion.div>

        {/* Floating activity cards */}
        <div className="relative flex flex-col items-center justify-center gap-4 mt-8">
          {/* Glow behind cards */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange/20 via-purple/20 to-orange/20 blur-3xl rounded-full -z-10 scale-y-75" />

          {hero.floatingCards.map((card, i) => (
            <motion.div
              key={card.name}
              custom={card.delay}
              initial="hidden"
              animate="visible"
              variants={floatingCardVariants}
              className="glass bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl w-full max-w-sm mx-auto"
              style={{
                animation: `float-slow ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                zIndex: 10 - i,
                marginTop: i > 0 ? "-20px" : "0",
              }}
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/10">
                <img src={card.avatar} alt={card.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{card.name}</span>
                  <span className="text-xs text-muted">{card.role}</span>
                </div>
                <span className="text-sm text-zinc-300 mt-0.5" dir="auto">
                  {card.text}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
