"use client";

import { motion } from "framer-motion";

interface SectionHeadingProps {
  title: string;
  subtitle: string;
  gradientWord?: string;
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  gradientWord,
  className = "",
}: SectionHeadingProps) {
  const renderTitle = () => {
    if (!gradientWord) return title;
    const parts = title.split(gradientWord);
    return (
      <>
        {parts[0]}
        <span className="gradient-text">{gradientWord}</span>
        {parts[1] ?? ""}
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className={`text-center max-w-2xl mx-auto mb-16 ${className}`}
    >
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4 leading-[1.15]">
        {renderTitle()}
      </h2>
      <p className="text-base sm:text-lg text-muted leading-relaxed">
        {subtitle}
      </p>
    </motion.div>
  );
}
