import PublicNavbar from '@/components/PublicNavbar';
import {usePublicTheme} from '@/hooks/usePublicTheme';
import WorkflowBeam from '@/components/WorkflowBeam';
import FeaturesBento from '@/components/FeaturesBento';
import AboutBento from '@/components/AboutBento';
import WorkspaceDemo from '@/components/WorkspaceDemo';
import './Landing.css';
import React, { useEffect } from 'react';
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
  const {theme,toggleTheme}=usePublicTheme();
  const accent='#f07832';
  const brandVariant=theme==='dark'?'white':'black';
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(accent.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const accentInk = luminance > 0.179 ? '#111111' : '#ffffff';

  useEffect(() => {
    try {
      localStorage.setItem('landing-theme', theme);

    } catch { /* Appearance still works when storage is unavailable. */ }
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const previous = favicon?.getAttribute('href');
    favicon?.setAttribute('href', `/icon ${brandVariant}.png`);
    return () => {
      if (previous) favicon?.setAttribute('href', previous);
    };
  }, [theme, accent, brandVariant]);

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

  return (
    <div data-theme={theme} style={{ '--landing-accent': accent, '--accent-ink': accentInk } as React.CSSProperties} className="landing-page min-h-screen bg-black text-white selection:bg-orange-500/30 overflow-x-clip font-sans">
      {/* Background glow accents */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-500/15 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <PublicNavbar theme={theme} onToggle={toggleTheme}/>

      <main className="relative z-10 pt-28">
        {/* HERO SECTION */}
        <section className="landing-hero container mx-auto px-6 max-w-5xl pt-16 pb-20 text-center">
          <div className="hero-float hero-note" aria-hidden="true"><span className="note-pin" /><Brain size={24} /><p>Big ideas start<br />with a little space.</p><span>Capture it. Create it.</span></div>
          <div className="hero-float hero-focus" aria-hidden="true"><Target size={26} /><span>Time to make it happen</span><strong>25:00</strong><small>Focus Room · Deep work</small><div className="focus-progress" /></div>
          <div className="hero-float hero-task" aria-hidden="true"><CheckCircle2 size={26} /><div><strong>Your next great video</strong><span>From idea to published</span></div><span className="task-check">✓</span></div>
          <div className="hero-mark" aria-hidden="true"><img src={`/icon ${brandVariant}.png`} alt="" /></div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs sm:text-sm font-medium text-orange-400 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            A little structure. A lot more creativity.
          </motion.div>
          
          {/* Main Visible Application Name Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight mb-4 text-white"
          >
            Think, create, and grow
          </motion.h1>

          {/* Subtitle Describing Product */}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500"
          >
            all in one place.
          </motion.h2>
          
          {/* Factual Purpose & Problem-Solving Paragraph */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Meet BoostD. Your ideas, content calendar, tasks, and brand deals — together in one calm workspace. Make room for your next big idea.
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

        <WorkspaceDemo />

        <AboutBento />

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

          <FeaturesBento />
        </section>

        <WorkflowBeam />

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
                <img src={`/logo ${brandVariant}.png`} alt="BoostD" className="h-7 w-auto object-contain" />
              </div>
              <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
                BoostD is an all-in-one content management and creator productivity platform empowering creators, social media managers, and teams to organize ideas, schedule editorial calendars, manage tasks, and track brand collaborations.
              </p>
              <div className="text-xs text-zinc-500">
                Official Website: <a href="https://www.boostd.app" className="text-orange-400 hover:underline">https://www.boostd.app</a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Platform</h3>
              <ul className="space-y-2.5 text-sm text-zinc-400">
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In / Register</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Legal & Support</h3>
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




