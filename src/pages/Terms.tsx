import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Scale, Mail } from 'lucide-react';
import LegalPage from '@/components/LegalPage';

export default function Terms() {
 return <LegalPage kind="terms" sections={["Acceptance of Terms","User Accounts & Responsibilities","Content Ownership & Rights","Prohibited Activities","Contact Information"]}>

          
          <section id="terms-1" className="space-y-4">
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

          <section id="terms-2" className="space-y-4">
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

          <section id="terms-3" className="space-y-4">
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

          <section id="terms-4" className="space-y-4">
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

          <section id="terms-5" className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Mail className="w-6 h-6 text-orange-500" />
              5. Contact Information
            </h2>
            <p className="text-zinc-300">
              For questions regarding our terms, reach out at <a href="mailto:officialboostd@gmail.com" className="text-orange-400 hover:underline font-medium">officialboostd@gmail.com</a>.
            </p>
          </section>


 </LegalPage>;
}
