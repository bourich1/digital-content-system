import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Brain, CheckCircle, Clock, Users, Zap, Layout as LayoutIcon, Target, ChevronRight } from 'lucide-react';

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
      title: "Content Ideas",
      description: "Brainstorm and organize your content ideas in one centralized hub. Never lose a great idea again.",
      icon: <Brain className="w-6 h-6 text-orange-400" />
    },
    {
      title: "Task Management",
      description: "Break down your projects into actionable tasks. Track progress and meet your deadlines effortlessly.",
      icon: <CheckCircle className="w-6 h-6 text-green-400" />
    },
    {
      title: "Focus Room",
      description: "Deep work sessions with built-in timers. Eliminate distractions and boost your productivity.",
      icon: <Target className="w-6 h-6 text-orange-400" />
    },
    {
      title: "Collaborations",
      description: "Connect with other creators, manage sponsorships, and track your brand deals all in one place.",
      icon: <Users className="w-6 h-6 text-blue-400" />
    }
  ];

  const advantages = [
    {
      title: "All-in-One Workspace",
      description: "Stop jumping between 5 different apps. Everything you need to run your content business is here.",
      icon: <LayoutIcon className="w-5 h-5 text-white" />
    },
    {
      title: "Save Time & Energy",
      description: "Streamlined workflows mean less time managing and more time actually creating content.",
      icon: <Clock className="w-5 h-5 text-white" />
    },
    {
      title: "Supercharge Productivity",
      description: "Built-in tools like the Focus Room and intelligent task tracking keep you in the flow state.",
      icon: <Zap className="w-5 h-5 text-white" />
    }
  ];

  const navLinks = [
    { name: "Home", href: "#" },
    { name: "About", href: "#about" },
    { name: "Features", href: "#features" },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30 overflow-x-hidden font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain brightness-0 invert" />
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                {link.name}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-white hover:text-zinc-300 transition-colors px-2 cursor-pointer"
            >
              Log in
            </button>
            <Button 
              onClick={() => navigate('/login?signup=true')}
              className="bg-white text-black hover:bg-zinc-200 rounded-full px-6"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="container mx-auto px-6 max-w-6xl pt-20 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            The Ultimate Creator Workspace
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight"
          >
            Manage your content.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">
              Master your workflow.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10"
          >
            The all-in-one system designed specifically for digital creators to ideate, plan, collaborate, and execute without losing focus.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button 
              onClick={() => navigate('/login?signup=true')}
              className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-orange-500 hover:bg-orange-600 text-white border-0 cursor-pointer"
            >
              Get Started for Free
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              onClick={() => navigate('/login')}
              variant="outline"
              className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer text-white"
            >
              Log in to account
            </Button>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="container mx-auto px-6 max-w-6xl py-24">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 mb-6"
            >
              <Zap className="w-4 h-4 text-orange-500" />
              How It Works
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-bold mb-6"
            >
              Start in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">Four Simple Steps</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-zinc-400 max-w-2xl mx-auto text-lg"
            >
              Your journey to joining the community, building your profile, and scaling your success.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex flex-col h-full hover:bg-zinc-900/80 transition-colors"
            >
              <div className="text-center mb-6">
                <div className="flex justify-center items-start mb-2">
                  <span className="text-5xl font-black tracking-tighter">01</span>
                  <span className="text-yellow-500 ml-1 text-xl">★</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Create Account</h3>
                <p className="text-sm text-zinc-400 leading-relaxed min-h-[60px]">
                  Sign up in seconds using your email or Google to join the elite community.
                </p>
              </div>
              <div className="mt-auto bg-zinc-950 rounded-2xl p-4 border border-white/5 relative overflow-hidden flex-1 flex flex-col justify-end">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="h-2 w-16 bg-zinc-800 rounded-full"></div>
                    <div className="h-2 w-24 bg-zinc-800 rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-xl px-3 flex items-center text-xs text-zinc-500">
                    name@example.com
                  </div>
                </div>
                <div className="w-full h-10 bg-blue-600 rounded-xl flex items-center justify-center text-sm font-medium text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  Get Started →
                </div>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex flex-col h-full hover:bg-zinc-900/80 transition-colors"
            >
              <div className="text-center mb-6">
                <div className="flex justify-center items-start mb-2">
                  <span className="text-5xl font-black tracking-tighter">02</span>
                  <span className="text-yellow-500 ml-1 text-xl">★</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Build Profile</h3>
                <p className="text-sm text-zinc-400 leading-relaxed min-h-[60px]">
                  Add your specialty, short bio, and avatar to stand out in the network.
                </p>
              </div>
              <div className="mt-auto bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden flex-1 relative">
                <div className="h-16 bg-gradient-to-r from-blue-500/20 to-orange-500/20 w-full"></div>
                <div className="px-4 pb-4 flex flex-col items-center -mt-8 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 border-4 border-zinc-950 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-zinc-500" />
                  </div>
                  <div className="font-semibold text-sm mb-1 flex items-center gap-1">
                    Mohamed Yassine <CheckCircle className="w-3 h-3 text-blue-500" />
                  </div>
                  <div className="text-[10px] text-zinc-500 mb-3">Software Engineer • Casablanca</div>
                  <div className="flex gap-2 mb-4">
                    <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] flex items-center gap-1">
                      <span className="text-[8px]">&lt;/&gt;</span> Developer
                    </span>
                    <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
                      UI/UX
                    </span>
                  </div>
                  <div className="w-full text-center p-3 rounded-xl border border-zinc-800/50 bg-zinc-900/30">
                    <p className="text-[10px] text-zinc-400 italic">"Passionate about building scalable web applications."</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex flex-col h-full hover:bg-zinc-900/80 transition-colors"
            >
              <div className="text-center mb-6">
                <div className="flex justify-center items-start mb-2">
                  <span className="text-5xl font-black tracking-tighter">03</span>
                  <span className="text-yellow-500 ml-1 text-xl">★</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Set Your Goals</h3>
                <p className="text-sm text-zinc-400 leading-relaxed min-h-[60px]">
                  Tell us what brings you here (e.g. learning, networking) to personalize your experience.
                </p>
              </div>
              <div className="mt-auto bg-zinc-950 rounded-2xl p-4 border border-white/5 flex-1 flex flex-col">
                <div className="text-xs font-bold mb-1">What brings you here?</div>
                <div className="text-[10px] text-zinc-500 mb-4">Select your primary goal to personalize your feed.</div>
                
                <div className="space-y-3">
                  <div className="border border-blue-500/50 bg-blue-500/5 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold mb-0.5">Build my network</div>
                      <div className="text-[10px] text-zinc-500">Find partners and mentors.</div>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  <div className="border border-zinc-800 rounded-xl p-3 flex items-start gap-3 opacity-50">
                    <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-zinc-400">$</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold mb-0.5">Make money online</div>
                      <div className="text-[10px] text-zinc-500">Freelance and sell products.</div>
                    </div>
                    <div className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0"></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex flex-col h-full hover:bg-zinc-900/80 transition-colors"
            >
              <div className="text-center mb-6">
                <div className="flex justify-center items-start mb-2">
                  <span className="text-5xl font-black tracking-tighter">04</span>
                  <span className="text-yellow-500 ml-1 text-xl">★</span>
                </div>
                <h3 className="text-xl font-bold mb-3">Access Dashboard</h3>
                <p className="text-sm text-zinc-400 leading-relaxed min-h-[60px]">
                  Dive into your personalized dashboard, track your streak, and start growing.
                </p>
              </div>
              <div className="mt-auto bg-zinc-950 rounded-2xl p-4 border border-white/5 flex-1 relative overflow-hidden flex flex-col">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <LayoutIcon className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Dashboard Preview</span>
                </div>
                
                <div className="flex-1 border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden flex flex-col min-h-[120px]">
                  <div className="h-6 border-b border-zinc-800 flex items-center px-2 gap-1 bg-zinc-900">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  </div>
                  <div className="p-2 flex gap-2 h-full">
                    <div className="w-1/4 h-full bg-zinc-800/50 rounded flex flex-col gap-1 p-1">
                      <div className="w-full h-2 bg-zinc-700 rounded-full mb-2"></div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full"></div>
                      <div className="w-3/4 h-1.5 bg-zinc-800 rounded-full"></div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full"></div>
                    </div>
                    <div className="w-3/4 h-full flex flex-col gap-2">
                      <div className="flex gap-2 h-1/3">
                        <div className="flex-1 bg-blue-500/20 border border-blue-500/30 rounded"></div>
                        <div className="flex-1 bg-zinc-800/50 rounded"></div>
                      </div>
                      <div className="flex-1 bg-zinc-800/50 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-6 max-w-6xl py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to create</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">Replace your scattered tools with one cohesive system built for the modern digital creator.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-zinc-900/50 border-white/5 hover:bg-zinc-900/80 transition-all duration-300 h-full group">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-zinc-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Advantages Section */}
        <section id="about" className="container mx-auto px-6 max-w-6xl py-24">
          <div className="bg-gradient-to-br from-zinc-900/80 to-black border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Why choose our system?</h2>
                <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                  We understand that creating content is hard enough. Managing it shouldn't be. Our platform is meticulously crafted to remove friction from your creative process.
                </p>
                <Button 
                  onClick={() => navigate('/login?signup=true')}
                  className="bg-white text-black hover:bg-zinc-200 rounded-full px-8"
                >
                  Join the platform
                </Button>
              </div>
              
              <div className="space-y-6">
                {advantages.map((adv, index) => (
                  <motion.div 
                    key={adv.title}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex gap-4 items-start"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                      {adv.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold mb-1">{adv.title}</h4>
                      <p className="text-zinc-400">{adv.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12 relative z-10">
        <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-70">
            <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain brightness-0 invert" />
            <span className="font-semibold tracking-tight">Digital Space</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
          <div className="text-zinc-500 text-sm">
            © {new Date().getFullYear()} Digital Content System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
