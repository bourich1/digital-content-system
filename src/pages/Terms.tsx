import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Scale, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500 selection:text-white font-sans">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Navigation Bar */}
      <header className="border-b border-zinc-800/80 backdrop-blur-md bg-black/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 max-w-5xl h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo white.png" alt="BoostD" className="h-7 w-auto object-contain " />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/login')}
              className="bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/20"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 max-w-4xl py-14 relative z-10">
        {/* Header Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          <p className="text-zinc-400 text-base max-w-xl mx-auto">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl p-8 md:p-12 space-y-10 shadow-2xl backdrop-blur-sm leading-relaxed">
          
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Scale className="w-6 h-6 text-orange-500" />
              1. Acceptance of Terms
            </h2>
            <p className="text-zinc-300">
              By accessing or using <span className="text-white font-medium">BoostD</span> (available at <a href="https://www.boostd.app" className="text-orange-400 hover:underline">https://www.boostd.app</a>), 
              you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <hr className="border-zinc-800/80" />

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-orange-500" />
              2. User Accounts & Responsibilities
            </h2>
            <p className="text-zinc-300">
              When creating an account with us or signing in via Google, you must provide accurate and complete information. 
              You are solely responsible for maintaining the security of your credentials and all activities that occur under your account.
            </p>
          </section>

          <hr className="border-zinc-800/80" />

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-orange-500" />
              3. Content Ownership & Rights
            </h2>
            <p className="text-zinc-300">
              You retain all ownership rights to any content, ideas, schedules, and media you create or upload to the platform. 
              We do not claim ownership over your creative work.
            </p>
          </section>

          <hr className="border-zinc-800/80" />

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              4. Prohibited Activities
            </h2>
            <p className="text-zinc-300">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
              <li>Use the service for any illegal, harmful, or fraudulent purpose.</li>
              <li>Attempt to reverse-engineer, exploit, or compromise system infrastructure.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation.</li>
            </ul>
          </section>

          <hr className="border-zinc-800/80" />

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Mail className="w-6 h-6 text-orange-500" />
              5. Contact Information
            </h2>
            <p className="text-zinc-300">
              For questions regarding our terms, reach out at <a href="mailto:support@boostd.app" className="text-orange-400 hover:underline font-medium">support@boostd.app</a>.
            </p>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="mt-12 text-center text-zinc-500 text-sm space-x-6">
          <Link to="/" className="hover:text-zinc-300 transition-colors">Home</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms" className="text-white font-medium">Terms of Service</Link>
        </div>
      </main>
    </div>
  );
}
