"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import { focusRoom } from "@/data/content";
import { SectionHeading } from "./SectionHeading";

function PomodoroTimer() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const total = 25 * 60;
  const progress = 1 - seconds / total;
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    // Auto-start for demo
    const autoStart = setTimeout(() => {
      setIsRunning(true);
      setHasStarted(true);
      setSeconds(18 * 60 + 42); // Start at 18:42 for visual demo
    }, 1500);
    return () => clearTimeout(autoStart);
  }, []);

  useEffect(() => {
    if (!isRunning || seconds <= 0) return;
    const interval = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, seconds]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const displayTime = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="relative flex items-center justify-center">
      {/* Orange glow */}
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(255, 122, 26, ${0.15 + progress * 0.15}) 0%, transparent 70%)`,
          animation: "pulse-glow 3s ease-in-out infinite",
        }}
      />

      {/* SVG Ring */}
      <svg width="260" height="260" className="rotate-[-90deg]">
        {/* Background ring */}
        <circle
          cx="130"
          cy="130"
          r="110"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
        />
        {/* Progress ring */}
        <circle
          cx="130"
          cy="130"
          r="110"
          fill="none"
          stroke="url(#timerGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A1A" />
            <stop offset="100%" stopColor="#FF9A4A" />
          </linearGradient>
        </defs>
      </svg>

      {/* Time display */}
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl sm:text-5xl font-bold text-white tracking-tight font-mono">
          {displayTime}
        </span>
        <span className="text-xs text-muted mt-2 uppercase tracking-widest">
          {isRunning ? "Focusing" : hasStarted ? "Paused" : "Ready"}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="w-10 h-10 rounded-full bg-orange/15 border border-orange/20 flex items-center justify-center text-orange hover:bg-orange/25 transition-colors"
            aria-label={isRunning ? "Pause timer" : "Start timer"}
          >
            {isRunning ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          <button
            onClick={() => {
              setIsRunning(false);
              setSeconds(total);
              setHasStarted(false);
            }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/[0.08] flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FocusRoom() {
  return (
    <section id="focus" className="py-24 sm:py-32 px-4">
      <SectionHeading
        title={focusRoom.sectionTitle}
        subtitle={focusRoom.sectionSub}
        gradientWord="activated"
      />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left: Timer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <div className="relative rounded-3xl border border-white/[0.06] bg-surface p-12 sm:p-16">
            <PomodoroTimer />
          </div>
        </motion.div>

        {/* Right: Features */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <ul className="space-y-4 mb-8">
            {focusRoom.features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <div className="w-2 h-2 rounded-full bg-orange shrink-0" />
                {feature}
              </motion.li>
            ))}
          </ul>

          <p className="text-muted text-sm leading-relaxed">
            Whether you&#39;re scripting a video, editing footage, or planning your
            next series — the Focus Room keeps you locked in with customizable
            timers and break reminders.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
