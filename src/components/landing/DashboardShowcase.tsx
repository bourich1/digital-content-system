"use client";

import { motion } from "framer-motion";
import { dashboardShowcase } from "@/data/content";
import { SectionHeading } from "./SectionHeading";
import { AppScreenshot } from "./AppScreenshot";

export function DashboardShowcase() {
  return (
    <section className="py-24 sm:py-32 px-4">
      <SectionHeading
        title={dashboardShowcase.sectionTitle}
        subtitle={dashboardShowcase.sectionSub}
        gradientWord="at a glance"
      />

      {/* Stat chips */}
      <div className="max-w-3xl mx-auto mb-12">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {dashboardShowcase.stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="glass rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3"
            >
              <span className="text-lg sm:text-xl font-bold gradient-text">
                {stat.value}
              </span>
              <span className="text-xs sm:text-sm text-muted">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Big screenshot */}
      <div className="max-w-5xl mx-auto">
        <AppScreenshot
          src="/screens/dashboard.svg"
          alt="Content Circle dashboard showing analytics, tasks, collaborations, and content overview"
          fade
          priority
          glow="brand"
        />
      </div>
    </section>
  );
}
