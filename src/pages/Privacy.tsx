import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Eye, Database, Bell, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Privacy() {
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
            <img src="/logo.png" alt="Logo" className="h-7 w-auto object-contain brightness-0 invert" />
            <span className="font-bold text-lg tracking-tight">Digital Content System</span>
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
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-zinc-400 text-base max-w-xl mx-auto">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-3xl p-8 md:p-12 space-y-10 shadow-2xl backdrop-blur-sm leading-relaxed">
          
          {/* Summary / Introduction */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Eye className="w-6 h-6 text-orange-500" />
              1. Overview & Commitment
            </h2>
            <p className="text-zinc-300">
              Welcome to <span className="text-white font-medium">Digital Content System</span> ("we", "our", or "us"). 
              Your privacy is extremely important to us. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you access and use our platform, website, and services.
            </p>
            <p className="text-zinc-400 text-sm">
              By using our service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <hr className="border-zinc-800/80" />

          {/* Information We Collect */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Database className="w-6 h-6 text-orange-500" />
              2. Information We Collect
            </h2>
            <div className="space-y-3 text-zinc-300">
              <p>We only collect the essential information required to provide you with a smooth and secure experience:</p>
              <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
                <li><strong className="text-zinc-200">Account Information:</strong> Your full name, email address, password hash, and avatar picture.</li>
                <li><strong className="text-zinc-200">Google OAuth Profile:</strong> When you choose to authenticate using Google Sign-In, we receive your email address, display name, and profile picture provided by Google.</li>
                <li><strong className="text-zinc-200">User Content:</strong> Tasks, content ideas, calendars, notes, and collaboration preferences you create within the platform.</li>
                <li><strong className="text-zinc-200">Technical Logs:</strong> Browser type, operating system, timestamp of requests, and anonymous telemetry to maintain system reliability.</li>
              </ul>
            </div>
          </section>

          <hr className="border-zinc-800/80" />

          {/* Google API & OAuth User Data Disclosure */}
          <section className="space-y-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-3 text-orange-400">
              <Lock className="w-5 h-5 text-orange-400" />
              3. Google User Data & Limited Use Policy
            </h2>
            <p className="text-zinc-300 text-sm">
              Our use of information received from Google APIs adheres to the{' '}
              <a 
                href="https://developers.google.com/terms/api-services-user-data-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-400 underline hover:text-orange-300"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 text-sm pl-2">
              <li>We only use your Google profile information (name, email, avatar) to authenticate and personalize your account.</li>
              <li>We <span className="text-white font-medium underline">do not</span> sell, transfer, or share your Google user data with third-party advertisers or data brokers.</li>
              <li>We do not use Google user data to train generalized machine learning or artificial intelligence models without explicit consent.</li>
            </ul>
          </section>

          <hr className="border-zinc-800/80" />

          {/* How We Use Your Data */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-orange-500" />
              4. How We Use Your Information
            </h2>
            <p className="text-zinc-300">We utilize your collected data for the following legitimate purposes:</p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
              <li>To provide, operate, and maintain the workspace and content creation tools.</li>
              <li>To synchronize your content ideas, collaboration deals, and schedule across devices.</li>
              <li>To communicate security alerts, technical updates, and customer support responses.</li>
              <li>To detect, prevent, and address technical bugs or unauthorized security incidents.</li>
            </ul>
          </section>

          <hr className="border-zinc-800/80" />

          {/* Data Security & Storage */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-orange-500" />
              5. Data Security & Retention
            </h2>
            <p className="text-zinc-300">
              We employ strict industry-standard security protocols to protect your personal information. 
              All data transmitted between your browser and our servers is encrypted using Transport Layer Security (TLS/HTTPS).
              Your authentication and database records are securely stored using Row Level Security (RLS) and encrypted at rest.
            </p>
            <p className="text-zinc-400 text-sm">
              We retain your data only for as long as your account remains active or as needed to provide our services.
            </p>
          </section>

          <hr className="border-zinc-800/80" />

          {/* Your Rights & Deletion */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Bell className="w-6 h-6 text-orange-500" />
              6. Your Rights & Data Deletion
            </h2>
            <p className="text-zinc-300">
              You have full control over your personal data. You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-400">
              <li>Access, export, or update the personal information stored in your account settings.</li>
              <li>Request the complete deletion of your account and all associated workspace data.</li>
              <li>Revoke Google OAuth permissions at any time through your Google Security settings.</li>
            </ul>
            <p className="text-zinc-400 text-sm">
              To request account deletion or data removal, please contact our support team or use the in-app settings.
            </p>
          </section>

          <hr className="border-zinc-800/80" />

          {/* Contact Us */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Mail className="w-6 h-6 text-orange-500" />
              7. Contact Us
            </h2>
            <p className="text-zinc-300">
              If you have any questions, concerns, or feedback regarding this Privacy Policy or our security practices, feel free to reach out to us:
            </p>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-zinc-300 text-sm space-y-1">
              <p><strong className="text-white">Platform:</strong> Digital Content System</p>
              <p><strong className="text-white">Email:</strong> support@boostd.app</p>
              <p><strong className="text-white">Support Page:</strong> <Link to="/support" className="text-orange-400 hover:underline">Support Center</Link></p>
            </div>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="mt-12 text-center text-zinc-500 text-sm space-x-6">
          <Link to="/" className="hover:text-zinc-300 transition-colors">Home</Link>
          <span>•</span>
          <Link to="/privacy" className="text-white font-medium">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
        </div>
      </main>
    </div>
  );
}
