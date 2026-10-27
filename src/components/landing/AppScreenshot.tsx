"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface AppScreenshotProps {
  src: string;
  alt: string;
  className?: string;
  fade?: boolean;
  priority?: boolean;
  glow?: "orange" | "purple" | "brand";
}

export function AppScreenshot({
  src,
  alt,
  className = "",
  fade = false,
  priority = false,
  glow = "brand",
}: AppScreenshotProps) {
  const glowClass =
    glow === "orange"
      ? "glow-orange"
      : glow === "purple"
        ? "glow-purple"
        : "glow-brand";

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`relative ${className}`}
    >
      {/* Glow behind */}
      <div
        className={`absolute inset-0 ${glowClass} rounded-2xl blur-xl -z-10 scale-95`}
      />

      {/* Glass window frame */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-surface overflow-hidden shadow-2xl">
        {/* Title bar dots */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>

        {/* Screenshot */}
        <div className={`relative ${fade ? "fade-bottom" : ""}`}>
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={750}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            className="w-full h-auto"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>
      </div>
    </motion.div>
  );
}
