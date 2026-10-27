"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, User, Sparkles } from "lucide-react";
import { aiAssistant } from "@/data/content";
import { SectionHeading } from "./SectionHeading";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="w-1.5 h-1.5 rounded-full bg-orange/60 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-orange/60 animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-orange/60 animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

export function AIAssistant() {
  const [visibleChars, setVisibleChars] = useState(0);
  const [showResponse, setShowResponse] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const fullText = aiAssistant.chatMessages[1].text;

  useEffect(() => {
    // Start typing animation when component mounts
    const typingDelay = setTimeout(() => {
      setIsTyping(true);
      const showDelay = setTimeout(() => {
        setIsTyping(false);
        setShowResponse(true);
      }, 1500);
      return () => clearTimeout(showDelay);
    }, 1000);

    return () => clearTimeout(typingDelay);
  }, []);

  useEffect(() => {
    if (!showResponse) return;
    if (visibleChars >= fullText.length) return;

    const timer = setTimeout(() => {
      setVisibleChars((prev) => Math.min(prev + 2, fullText.length));
    }, 15);

    return () => clearTimeout(timer);
  }, [showResponse, visibleChars, fullText.length]);

  return (
    <section id="ai" className="py-24 sm:py-32 px-4">
      <SectionHeading
        title={aiAssistant.sectionTitle}
        subtitle={aiAssistant.sectionSub}
        gradientWord="co-pilot"
      />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left: Text */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <ul className="space-y-4 mb-8">
            {aiAssistant.features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <Sparkles className="w-4 h-4 text-purple shrink-0" />
                {feature}
              </motion.li>
            ))}
          </ul>

          <p className="text-muted text-sm leading-relaxed">
            Powered by AI, your creative co-pilot helps you generate ideas,
            write compelling scripts, and break through creative blocks — right
            inside your workspace.
          </p>
        </motion.div>

        {/* Right: Chat mockup */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Glow */}
          <div className="absolute inset-0 glow-purple rounded-3xl blur-xl -z-10 scale-95" />

          {/* Chat frame */}
          <div className="rounded-2xl border border-white/[0.08] bg-surface overflow-hidden shadow-2xl">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-xs text-muted font-medium">
                AI Assistant
              </span>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4 min-h-[320px]">
              {/* User message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-white/60" />
                </div>
                <div className="glass rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-sm text-white/90">
                    {aiAssistant.chatMessages[0].text}
                  </p>
                </div>
              </div>

              {/* AI response */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange/20 to-purple/20 flex items-center justify-center shrink-0 border border-white/[0.06]">
                  <Bot className="w-4 h-4 text-orange" />
                </div>
                <div className="glass rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  {isTyping ? (
                    <TypingDots />
                  ) : showResponse ? (
                    <p className="text-sm text-white/90 whitespace-pre-line">
                      {fullText.slice(0, visibleChars)}
                      {visibleChars < fullText.length && (
                        <span className="animate-blink text-orange">|</span>
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
