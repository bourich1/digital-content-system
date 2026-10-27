"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/data/content";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl"
    >
      <nav className="glass rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg shadow-black/20">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 shrink-0">
          <img src="/logo white.png" alt="BoostD" className="h-8 w-auto object-contain" />
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm text-muted hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#"
            className="text-sm text-muted hover:text-white transition-colors px-3 py-2"
          >
            Sign in
          </a>
          <a
            href="#"
            className="btn-primary text-sm font-medium px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200"
          >
            Sign up
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-muted hover:text-white transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-2xl mt-2 px-4 py-4 shadow-lg shadow-black/20"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm text-muted hover:text-white transition-colors rounded-xl hover:bg-white/[0.04]"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-white/[0.06] my-2" />
              <a
                href="#"
                className="px-4 py-3 text-sm text-muted hover:text-white transition-colors rounded-xl hover:bg-white/[0.04]"
              >
                Sign in
              </a>
              <a
                href="#"
                className="btn-primary text-sm font-medium px-4 py-3 rounded-xl text-center mt-1 bg-white text-black hover:bg-zinc-200"
              >
                Sign up
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
