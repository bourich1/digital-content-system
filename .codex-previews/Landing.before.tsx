import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { 
  Brain, 
  CheckCircle2, 
  Clock, 
  Users, 
  Zap, 
  Layout as LayoutIcon, 
  Target, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Shield, 
  ArrowRight, 
  DollarSign, 
  Check, 
  Lock, 
  Mail, 
  Share2, 
  Briefcase, 
  Video, 
  Layers
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: "Content Idea Management",
      description: "Capture, organize, and prioritize your content concepts in one centralized hub. Tag ideas by social platform (YouTube, Instagram, TikTok, X, LinkedIn) and status.",
      icon: <Brain className="w-6 h-6 text-orange-400" />,
      badge: "Ideation"
    },
    {
      title: "Editorial Content Calendar",
      description: "Visualize your entire publishing schedule on an interactive calendar. Schedule drops, manage upcoming deadlines, and keep a consistent publishing rhythm.",
      icon: <CalendarIcon className="w-6 h-6 text-amber-400" />,
      badge: "Scheduling"
    },
    {
      title: "Actionable Task Workflow",
      description: "Break complex creative projects into clear, actionable tasks. Track progress through customizable stages from draft to final publication.",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
      badge: "Execution"
    },
    {
      title: "Focus Room & Deep Work",
      description: "Eliminate creative burnout with built-in Pomodoro deep work timers and relaxing ambient soundscapes (rain, cafe, nature) tailored for flow state.",
      icon: <Target className="w-6 h-6 text-rose-400" />,
      badge: "Productivity"
    },
    {
      title: "Brand Deals & Sponsorships",
      description: "Manage your sponsorship pipeline from initial outreach to contract sign-off, deliverable tracking, and partnership revenue reporting.",
      icon: <DollarSign className="w-6 h-6 text-blue-400" />,
      badge: "Monetization"
    },
    {
      title: "AI Creator Assistant Tools",
      description: "Accelerate your creative output with built-in AI tools for generating high-engagement video hooks, outline scripts, captions, and hashtag strategies.",
      icon: <Sparkles className="w-6 h-6 text-purple-400" />,
      badge: "AI Powered"
    }
  ];

  const targetAudiences = [
    {
      title: "Content Creators & YouTubers",
      description: "Manage multi-platform video pipelines, store scripts and outlines, track sponsorship contracts, and stick to consistent publishing schedules.",
      icon: <Video className="w-6 h-6 text-orange-400" />,
      points: ["Idea backlog by channel", "Video production task lists", "Sponsorship pipeline tracker"]
    },
    {
      title: "Social Media Managers",
      description: "Plan, schedule, and execute multi-channel editorial calendars with deadline oversight and structured campaign workflows.",
      icon: <Share2 className="w-6 h-6 text-blue-400" />,
      points: ["Visual content calendar", "Status & approval tracking", "Multi-format content organization"]
    },
    {
      title: "Freelancers & Creative Solopreneurs",
      description: "Consolidate your client projects, brand deals, daily deep work sessions, and task milestones inside one clean dashboard.",
      icon: <Briefcase className="w-6 h-6 text-emerald-400" />,
      points: ["Distraction-free Focus Room", "Clear task priorities", "Deliverables & revenue tracking"]
    },
    {
      title: "Marketing Teams & Agencies",
      description: "Maintain alignment across content creation, editorial planning, team collaboration, and creative resource tracking.",
      icon: <Users className="w-6 h-6 text-purple-400" />,
      points: ["Unified workspace", "Creator network directory", "Centralized asset organization"]
    }
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Capture & Brainstorm Ideas",
      description: "Log inspiration immediately, categorize by platform and topic, or use AI assistant tools to brainstorm viral hooks and outlines.",
      highlight: "Idea Hub & AI Tools"
    },
    {
      step: "02",
      title: "Plan on Editorial Calendar",
      description: "Map your publication dates across channels. Balance your posting schedule and maintain consistency across all your platforms.",
      highlight: "Visual Calendar"
    },
    {
      step: "03",
      title: "Execute with Focus & Tasks",
      description: "Break content into production stages (scripting, filming, editing, review) and enter the Focus Room for deep work sessions.",
      highlight: "Tasks & Focus Room"
    },
    {
      step: "04",
      title: "Track Deals & Scale",
      description: "Track brand partnerships, monitor deal stages and revenue, connect with fellow creators, and grow your digital brand.",
      highlight: "Brand Pipeline & Network"
    }
  ];

  const navLinks = [
    { name: "About", href: "#about" },
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Who It's For", href: "#audience" },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30 overflow-x-hidden font-sans">
      {/* Background glow accents */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-500/15 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-zinc-800/80 py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 max-w-6xl flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="BoostD Logo" className="h-8 w-auto object-contain brightness-0 invert" />
            <span className="font-extrabold text-xl tracking-tight text-white">BoostD</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                {link.name}
              </a>
            ))}
            <Link to="/privacy" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Terms
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors px-3 py-2 cursor-pointer"
            >
              Sign In
            </button>
            <Button 
              onClick={() => navigate('/login?signup=true')}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5 text-sm font-semibold shadow-lg shadow-orange-500/20 border-0 cursor-pointer"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-28">
        {/* HERO SECTION */}
        <section className="container mx-auto px-6 max-w-5xl pt-16 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs sm:text-sm font-medium text-orange-400 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            Official Application • BoostD
          </motion.div>
          
          {/* Main Visible Application Name Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight mb-4 text-white"
          >
            BoostD
          </motion.h1>

          {/* Subtitle Describing Product */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500"
          >
            Your Content Management &amp; Productivity Platform
          </motion.h2>
          
          {/* Factual Purpose & Problem-Solving Paragraph */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            <strong className="text-white font-semibold">BoostD</strong> is an all-in-one content management platform built for creators, social media managers, and teams to organize, manage, and grow their digital content. BoostD eliminates scattered tools by bringing content idea brainstorming, visual editorial calendar scheduling, task execution, deep work focus sessions, and brand sponsorship tracking into one centralized workspace.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button 
              onClick={() => navigate('/login?signup=true')}
              className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-xl shadow-orange-500/25 border-0 cursor-pointer"
            >
              Get Started for Free
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-zinc-900/80 border-zinc-700 hover:bg-zinc-800 cursor-pointer text-white"
            >
              Sign In to Account
            </Button>
          </motion.div>

          {/* Quick Trust Highlights */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-zinc-400"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-orange-400" />
              <span>Publicly Accessible</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-orange-400" />
              <span>Google Sign-In Supported</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-orange-400" />
              <span>Zero Installation Required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-orange-400" />
              <span>100% Data Ownership</span>
            </div>
          </motion.div>
        </section>

        {/* HERO PRODUCT PREVIEW CARD */}
        <section className="container mx-auto px-6 max-w-5xl mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-mono text-zinc-400">https://www.boostd.app/dashboard</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                BoostD Workspace
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Idea Board */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-orange-400" />
                    Content Ideas
                  </span>
                  <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-medium">12 Active</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
                    <p className="font-medium text-white">10 Productivity Hacks for 2026</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                      <span className="text-red-400 font-medium">YouTube</span>
                      <span>•</span>
                      <span className="text-orange-400">High Priority</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
                    <p className="font-medium text-white">Behind-the-Scenes Setup Tour</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                      <span className="text-pink-400 font-medium">Instagram</span>
                      <span>•</span>
                      <span className="text-zinc-400">In Progress</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Editorial Calendar & Tasks */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-amber-400" />
                    Content Schedule
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">This Week</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">AI Tools Breakdown Video</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Thursday, 3:00 PM</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Newsletter Edition #42</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Saturday, 10:00 AM</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                  </div>
                </div>
              </div>

              {/* Box 3: Focus & Brand Deals */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-rose-400" />
                    Focus Room
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">Active</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center mb-2">
                  <p className="text-2xl font-mono font-bold text-orange-400 tracking-wider">25:00</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Deep Work Mode • Rain Soundscape</p>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-[11px]">
                  <span className="text-zinc-300">Brand Deals Pipeline</span>
                  <span className="text-emerald-400 font-semibold">$2,400</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ABOUT / PURPOSE SECTION */}
        <section id="about" className="container mx-auto px-6 max-w-5xl py-20 border-t border-zinc-900">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 mb-4">
              <Layers className="w-4 h-4 text-orange-400" />
              About BoostD
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-6 tracking-tight">
              What is <span className="text-orange-400">BoostD</span>?
            </h2>
            <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
              <strong className="text-white font-medium">BoostD</strong> is a purpose-built digital content management platform created to eliminate friction in modern creative workflows. 
              Instead of scattering ideas in note apps, deadlines on spreadsheets, tasks on project boards, and sponsorship records in inboxes, 
              <strong className="text-white font-medium"> BoostD brings your entire creative operation into one intuitive workspace.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400 font-bold">
                01
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Centralized Content Hub</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Organize inspirations, drafts, multi-channel ideas, and publishing milestones in one structured repository designed specifically for creators.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400 font-bold">
                02
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Structured Execution</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Turn concepts into published assets using editorial calendar scheduling, task stages, and integrated deep work Pomodoro sessions.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400 font-bold">
                03
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Monetization & Network</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Track sponsorship pipelines, maintain contract deliverable statuses, and network with other verified creators in the BoostD community.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="container mx-auto px-6 max-w-6xl py-20 border-t border-zinc-900">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 mb-4">
              <Zap className="w-4 h-4 text-orange-400" />
              Core Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              Everything you need to create and manage content
            </h2>
            <p className="text-zinc-400 text-base">
              BoostD includes all the real tools you need to take content from initial spark to final delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="bg-zinc-950/80 border border-zinc-800/80 hover:border-orange-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {feature.icon}
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="container mx-auto px-6 max-w-6xl py-20 border-t border-zinc-900">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 mb-4">
              <Clock className="w-4 h-4 text-orange-400" />
              Simple Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              How BoostD Works in Four Simple Steps
            </h2>
            <p className="text-zinc-400 text-base">
              A structured roadmap from raw inspiration to consistent multi-channel publishing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-black font-mono text-zinc-700">{step.step}</span>
                    <span className="text-xs font-medium text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                      {step.highlight}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* TARGET USERS SECTION */}
        <section id="audience" className="container mx-auto px-6 max-w-6xl py-20 border-t border-zinc-900">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 mb-4">
              <Users className="w-4 h-4 text-orange-400" />
              Target Audience
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
              Who is BoostD designed for?
            </h2>
            <p className="text-zinc-400 text-base">
              Tailored specifically for digital creators, media professionals, and modern content teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {targetAudiences.map((audience, index) => (
              <motion.div
                key={audience.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-7 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                      {audience.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white">{audience.title}</h3>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-5">
                    {audience.description}
                  </p>
                </div>
                <div className="space-y-2 pt-4 border-t border-zinc-900">
                  {audience.points.map((pt) => (
                    <div key={pt} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SECURITY & GOOGLE OAUTH TRANSPARENCY SECTION */}
        <section className="container mx-auto px-6 max-w-5xl py-16 border-t border-zinc-900">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-8 sm:p-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-orange-400">
                  <Shield className="w-4 h-4" />
                  Privacy, Security & Compliance
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Built with transparency and user trust at the core
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  BoostD adheres to Google OAuth API Services User Data Policies and strict privacy standards. We only use your authentication credentials to provide your secure personal workspace, and never share or sell your data.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Link 
                  to="/privacy" 
                  className="inline-flex items-center justify-center text-sm font-medium px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link 
                  to="/terms" 
                  className="inline-flex items-center justify-center text-sm font-medium px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="container mx-auto px-6 max-w-5xl py-20 text-center">
          <div className="bg-gradient-to-b from-orange-500/10 via-zinc-950 to-zinc-950 border border-orange-500/20 rounded-3xl p-10 sm:p-14">
            <h2 className="text-3xl sm:text-5xl font-extrabold mb-6 tracking-tight text-white">
              Ready to organize your content with BoostD?
            </h2>
            <p className="text-zinc-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Join creators and teams using BoostD to plan, track, and scale their digital content in one centralized platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => navigate('/login?signup=true')}
                className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 border-0 cursor-pointer"
              >
                Get Started Free
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                variant="outline"
                className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-white cursor-pointer"
              >
                Sign In
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 bg-black py-14 relative z-10">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="BoostD Logo" className="h-7 w-auto object-contain brightness-0 invert" />
                <span className="font-extrabold text-xl tracking-tight text-white">BoostD</span>
              </div>
              <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
                BoostD is an all-in-one content management and creator productivity platform empowering creators, social media managers, and teams to organize ideas, schedule editorial calendars, manage tasks, and track brand collaborations.
              </p>
              <div className="text-xs text-zinc-500">
                Official Website: <a href="https://www.boostd.app" className="text-orange-400 hover:underline">https://www.boostd.app</a>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5 text-sm text-zinc-400">
                <li><a href="#about" className="hover:text-white transition-colors">About BoostD</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#audience" className="hover:text-white transition-colors">Target Audience</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In / Register</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Legal & Support</h4>
              <ul className="space-y-2.5 text-sm text-zinc-400">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/support" className="hover:text-white transition-colors">Support Center</Link></li>
                <li><a href="mailto:support@boostd.app" className="hover:text-white transition-colors">support@boostd.app</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
            <div>
              © {new Date().getFullYear()} BoostD. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
              <span>•</span>
              <a href="https://www.boostd.app" className="hover:text-zinc-300 transition-colors">boostd.app</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
