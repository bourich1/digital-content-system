"use client";

import { motion } from "framer-motion";
import { creatorsNetwork } from "@/data/content";
import { SectionHeading } from "./SectionHeading";

export function CreatorsNetwork() {
  return (
    <section id="network" className="py-24 sm:py-32 px-4">
      <SectionHeading
        title={creatorsNetwork.sectionTitle}
        subtitle={creatorsNetwork.sectionSub}
        gradientWord="network of creators"
      />

      <div className="max-w-2xl mx-auto">
        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-orange/30 via-purple/30 to-transparent" />

          <div className="space-y-10">
            {creatorsNetwork.items.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative flex gap-6 items-start"
              >
                {/* Icon badge */}
                <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-orange/15 to-purple/15 flex items-center justify-center border border-white/[0.08] shrink-0">
                  <item.icon className="w-5 h-5 text-orange" />
                </div>

                {/* Content */}
                <div className="pt-1">
                  <h3 className="text-base font-semibold text-white mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
