/* ──────────────────────────────────────────────────────────────
   data/content.ts — Single source of truth for all landing copy
   ────────────────────────────────────────────────────────────── */

import {
  LayoutDashboard,
  Lightbulb,
  Handshake,
  Timer,
  Bot,
  Users,
  Calendar,
  CheckSquare,
  Bell,
  Zap,
  Clock,
  Heart,
  Target,
  type LucideIcon,
} from "lucide-react";

/* ── Navbar ─────────────────────────────────────────────────── */
export const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
] as const;

/* ── Hero ───────────────────────────────────────────────────── */
export const hero = {
  badge: "Boostd Digital",
  headlineStart: "Grow all your social media",
  headlineGradient: "in one place.",
  subheadline:
    "From small tasks to complex projects, manage everything in one workspace and keep your social media growing effortlessly.",
  ctaPrimary: "Get started free",
  ctaSecondary: "Talk to sales team",
  floatingCards: [
    { name: "Sarah M.", role: "Creator", text: "My social media grew so much!", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", delay: 0 },
    { name: "Youssef A.", role: "Influencer", text: "صراحة السوشيال ميديا ديالي طلعات مزيان", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef", delay: 0.15 },
    { name: "Ahmed K.", role: "Marketer", text: "حساباتي على السوشيال ميديا نمت بشكل رائع", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed", delay: 0.3 },
  ],
} as const;

/* ── Trusted By ─────────────────────────────────────────────── */
export const trustedBy = {
  heading: "Trusted by 100+ creators worldwide",
  logos: [],
} as const;

/* ── Benefits 2×2 ──────────────────────────────────────────── */
export interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const benefits: {
  sectionTitle: string;
  sectionSub: string;
  items: Benefit[];
} = {
  sectionTitle: "Everything you need to grow",
  sectionSub:
    "Purpose-built features that understand how content creators actually work.",
  items: [
    {
      icon: Zap,
      title: "All-in-one workspace",
      description:
        "Ideas, scripts, calendars, tasks, and brand deals — all under one roof. No more tab-hopping.",
    },
    {
      icon: Clock,
      title: "Hours saved every week",
      description:
        "Automate your workflow from ideation to posting. Spend time creating, not managing spreadsheets.",
    },
    {
      icon: Target,
      title: "Never miss a deadline",
      description:
        "Smart notifications remind you about upcoming posts, brand deal deadlines, and collaboration milestones.",
    },
    {
      icon: Heart,
      title: "A community, not just a tool",
      description:
        "Discover creators in your niche, collaborate on projects, and grow together — all inside the platform.",
    },
  ],
};

/* ── Pipeline ──────────────────────────────────────────────── */
export const pipeline = {
  sectionTitle: "Your content, from idea to posted",
  sectionSub:
    "Track every piece of content through its lifecycle with a visual Kanban pipeline.",
  tabs: ["Ideas", "Scripts", "Publishing"] as const,
  stages: ["Idea", "Script", "Filmed", "Edited", "Ready", "Posted"] as const,
  screenshot: "/screens/pipeline.png",
};

/* ── Bento Row ─────────────────────────────────────────────── */
export interface BentoCard {
  icon: LucideIcon;
  title: string;
  description: string;
  screenshot: string;
}

export const bentoRow: {
  sectionTitle: string;
  sectionSub: string;
  cards: BentoCard[];
} = {
  sectionTitle: "Built for creators who mean business",
  sectionSub:
    "Powerful tools that keep your workflow tight, your schedule on track, and your audience engaged.",
  cards: [
    {
      icon: Calendar,
      title: "Content Calendar",
      description:
        "Plan your posting schedule visually and never miss an upload window again.",
      screenshot: "/screens/calendar.png",
    },
    {
      icon: CheckSquare,
      title: "Task Management",
      description:
        "Track your daily creator tasks with real-time progress and satisfying check-offs.",
      screenshot: "/screens/tasks.png",
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description:
        "Get reminded about brand deal deadlines, posting dates, and collaboration milestones.",
      screenshot: "/screens/dashboard.png",
    },
  ],
};

/* ── Brand Collaborations ─────────────────────────────────── */
export const brandCollaborations = {
  sectionTitle: "Your brand deals, under control",
  sectionSub:
    "A CRM built specifically for creators. Track every sponsorship from pitch to payment.",
  features: [
    "Track budgets & payments",
    "Monitor deal statuses",
    "Schedule posting dates",
    "Manage brand relationships",
  ],
  statuses: ["Pending", "Accepted", "Completed"] as const,
  screenshot: "/screens/brand-deals.png",
};

/* ── AI Assistant ─────────────────────────────────────────── */
export const aiAssistant = {
  sectionTitle: "Your creative co-pilot",
  sectionSub:
    "Beat creative block with AI-powered brainstorming, script writing, and idea generation.",
  features: [
    "Brainstorm content ideas",
    "Write scripts & captions",
    "Beat creative block",
  ],
  chatMessages: [
    {
      role: "user" as const,
      text: "I need 5 viral video ideas about productivity for creators",
    },
    {
      role: "assistant" as const,
      text: 'Here are 5 viral-worthy ideas:\n\n1. "24 Hours Using Only AI Tools"\n2. "My $0 to $10K Creator Setup"\n3. "I Automated My Entire Workflow"\n4. "Day in My Life: Full-Time Creator"\n5. "Tools That Saved My Channel"',
    },
  ],
  screenshot: "/screens/ai-assistant.png",
};

/* ── Focus Room ───────────────────────────────────────────── */
export const focusRoom = {
  sectionTitle: "Deep work mode, activated",
  sectionSub:
    "A built-in Pomodoro timer designed to help you script, edit, and create without distractions.",
  features: [
    "Customizable focus sessions",
    "Break reminders",
    "Session tracking & streaks",
  ],
  screenshot: "/screens/focus-room.png",
};

/* ── Creators Network ─────────────────────────────────────── */
export interface TimelineItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const creatorsNetwork: {
  sectionTitle: string;
  sectionSub: string;
  items: TimelineItem[];
} = {
  sectionTitle: "Grow with a network of creators",
  sectionSub:
    "Content Circle is more than a tool — it's a community of like-minded creators helping each other rise.",
  items: [
    {
      icon: Users,
      title: "Discover creators in your niche",
      description:
        "Browse a curated directory of creators by niche, platform, and audience size.",
    },
    {
      icon: Handshake,
      title: "Connect and collaborate",
      description:
        "Reach out, propose collabs, and work on joint projects — all within the platform.",
    },
    {
      icon: Lightbulb,
      title: "Share ideas and feedback",
      description:
        "Get honest feedback from fellow creators and spark your next big content idea.",
    },
  ],
};

/* ── Dashboard Showcase ───────────────────────────────────── */
export const dashboardShowcase = {
  sectionTitle: "Everything at a glance",
  sectionSub:
    "Your centralized command center showing content stats, pending tasks, and brand deal activity.",
  screenshot: "/screens/dashboard.png",
  stats: [
    { label: "Total Ideas", value: "247" },
    { label: "Pending Tasks", value: "12" },
    { label: "Active Deals", value: "8" },
    { label: "Network Growth", value: "+34%" },
  ],
};

/* ── Final CTA ────────────────────────────────────────────── */
export const finalCTA = {
  headline: "Join Content Circle today.",
  subheadline:
    "Start organizing your creator workflow, landing brand deals, and growing with a community of creators.",
  ctaText: "Get started free",
  note: "No credit card required",
};

/* ── Footer ───────────────────────────────────────────────── */
export const footer = {
  tagline: "Your entire creator workflow, in one circle.",
  columns: [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Pipeline", href: "#pipeline" },
        { label: "Brand Deals", href: "#brand-deals" },
        { label: "AI Assistant", href: "#ai" },
        { label: "Focus Room", href: "#focus" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "Help Center", href: "#" },
        { label: "Community", href: "#" },
        { label: "Templates", href: "#" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
        { label: "Cookie Policy", href: "#" },
      ],
    },
  ],
  socials: [
    { label: "Twitter", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "TikTok", href: "#" },
  ],
  copyright: `© ${new Date().getFullYear()} Content Circle. All rights reserved.`,
};
