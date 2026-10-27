"use client";

import { motion } from "framer-motion";
import { benefits } from "@/data/content";
import { SectionHeading } from "./SectionHeading";

export function Benefits() {
  return (
    <section id="features" className="py-24 sm:py-32 px-4">
      <SectionHeading
        title={benefits.sectionTitle}
        subtitle={benefits.sectionSub}
        gradientWord="grow"
      />

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
          {/* Top row */}
          {benefits.items.slice(0, 2).map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-8 sm:p-10"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange/20 to-purple/20 flex items-center justify-center mb-5 border border-white/[0.06]">
                <item.icon className="w-5 h-5 text-orange" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Horizontal divider */}
        <div className="border-t border-white/[0.06]" />

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
          {/* Bottom row */}
          {benefits.items.slice(2).map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: (i + 2) * 0.1, duration: 0.5 }}
              className="p-8 sm:p-10"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple/20 to-orange/20 flex items-center justify-center mb-5 border border-white/[0.06]">
                <item.icon className="w-5 h-5 text-purple" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
