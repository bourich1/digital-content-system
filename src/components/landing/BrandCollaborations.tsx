"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { brandCollaborations } from "@/data/content";
import { SectionHeading } from "./SectionHeading";
import { AppScreenshot } from "./AppScreenshot";

export function BrandCollaborations() {
  return (
    <section id="brand-deals" className="py-24 sm:py-32 px-4">
      <SectionHeading
        title={brandCollaborations.sectionTitle}
        subtitle={brandCollaborations.sectionSub}
        gradientWord="under control"
      />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left: Screenshot (mirrored from Pipeline) */}
        <AppScreenshot
          src="/screens/brand-deals.svg"
          alt="Brand collaborations CRM showing deal statuses and payment tracking"
          glow="orange"
        />

        {/* Right: Text */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mb-8">
            {brandCollaborations.statuses.map((status) => {
              const statusStyles: Record<string, string> = {
                Pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
                Accepted: "bg-blue-500/15 text-blue-400 border-blue-500/20",
                Completed:
                  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
              };
              return (
                <span
                  key={status}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border ${statusStyles[status]}`}
                >
                  {status}
                </span>
              );
            })}
          </div>

          {/* Feature list */}
          <ul className="space-y-4 mb-8">
            {brandCollaborations.features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <CheckCircle2 className="w-4 h-4 text-orange shrink-0" />
                {feature}
              </motion.li>
            ))}
          </ul>

          <p className="text-muted text-sm leading-relaxed">
            From the first pitch email to the final payment, track every
            sponsorship and partnership in a dedicated CRM built for creators.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
