"use client";

import { motion } from "framer-motion";
import { finalCTA } from "@/data/content";
import { GradientText } from "./GradientText";

export function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-orange/[0.08] via-purple/[0.08] to-orange/[0.08] blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center max-w-2xl mx-auto"
      >
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 leading-[1.15]">
          <GradientText>{finalCTA.headline}</GradientText>
        </h2>

        <p className="text-base sm:text-lg text-muted max-w-lg mx-auto mb-10 leading-relaxed">
          {finalCTA.subheadline}
        </p>

        <div className="flex flex-col items-center gap-4">
          <a
            href="#"
            className="btn-primary text-base font-medium px-10 py-4 rounded-2xl inline-block"
          >
            {finalCTA.ctaText}
          </a>
          <span className="text-sm text-muted">{finalCTA.note}</span>
        </div>
      </motion.div>
    </section>
  );
}
