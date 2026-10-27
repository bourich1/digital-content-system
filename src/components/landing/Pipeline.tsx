"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pipeline } from "@/data/content";
import { SectionHeading } from "./SectionHeading";
import { AppScreenshot } from "./AppScreenshot";

const stageColors: Record<string, string> = {
  Idea: "bg-purple/20 text-purple-light border-purple/30",
  Script: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Filmed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Edited: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Ready: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Posted: "bg-orange/20 text-orange border-orange/30",
};

export function Pipeline() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="pipeline" className="py-24 sm:py-32 px-4">
      <SectionHeading
        title={pipeline.sectionTitle}
        subtitle={pipeline.sectionSub}
        gradientWord="idea to posted"
      />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left: Text + tabs */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          {/* Tabs */}
          <div className="inline-flex items-center glass rounded-xl p-1 mb-8">
            {pipeline.tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === i
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-muted hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Kanban stages */}
          <div className="flex flex-wrap gap-2 mb-8">
            {pipeline.stages.map((stage, i) => (
              <motion.div
                key={stage}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className="flex items-center gap-2"
              >
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${stageColors[stage]}`}
                >
                  {stage}
                </span>
                {i < pipeline.stages.length - 1 && (
                  <span className="text-white/20">→</span>
                )}
              </motion.div>
            ))}
          </div>

          <p className="text-muted text-sm leading-relaxed">
            Visualize your content at every stage. Drag cards between columns,
            add notes, attach scripts, and watch your content move from idea to
            published — all in one view.
          </p>
        </motion.div>

        {/* Right: Screenshot */}
        <AppScreenshot
          src="/screens/pipeline.svg"
          alt="Content pipeline showing Kanban board with content cards in different stages"
          glow="purple"
        />
      </div>
    </section>
  );
}
