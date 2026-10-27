"use client";

import { motion } from "framer-motion";
import { bentoRow } from "@/data/content";
import { SectionHeading } from "./SectionHeading";
import { AppScreenshot } from "./AppScreenshot";

export function BentoRow() {
  return (
    <section className="py-24 sm:py-32 px-4">
      <SectionHeading
        title={bentoRow.sectionTitle}
        subtitle={bentoRow.sectionSub}
        gradientWord="mean business"
      />

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {bentoRow.cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group rounded-3xl border border-white/[0.06] bg-surface overflow-hidden"
          >
            {/* Screenshot area with glow */}
            <div className="relative p-4 pb-0">
              <div className="absolute inset-0 bg-gradient-to-b from-orange/5 to-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <AppScreenshot
                src={card.screenshot.replace('.png', '.svg')}
                alt={`${card.title} feature screenshot`}
                className="rounded-t-xl"
                glow={i === 0 ? "orange" : i === 1 ? "purple" : "brand"}
              />
            </div>

            {/* Text */}
            <div className="p-6 pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange/15 to-purple/15 flex items-center justify-center border border-white/[0.06]">
                  <card.icon className="w-4 h-4 text-orange" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {card.title}
                </h3>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                {card.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
