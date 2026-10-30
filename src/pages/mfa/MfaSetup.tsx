import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMfa } from '@/contexts/MfaContext';

type Phase = 'intro' | 'enrolling';

interface Enrollment {
  factorId: string;
  uri: string;
  secret: string;
}

const AUTHENTICATOR_APPS = ['Google Authenticator', 'Microsoft Authenticator', 'Authy', '1Password', 'Apple Passwords'];

export default function MfaSetup() {
  const { isDemoMode } = useAuth();
  const { loading, enrolled, satisfied, refresh } = useMfa();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Drop half-finished enrolments from an interrupted attempt so a retry does
  // not collide with a stale unverified factor.
  async function clearStaleFactors() {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const stale = (data?.all ?? []).filter(factor => factor.factor_type === 'totp' && factor.status === 'unverified');
      for (const factor of stale) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    } catch {
      // A stale factor that cannot be removed is not fatal; the enroll call below
      // reports a usable error if it blocks setup.
    }
  }

  async function startEnrollment() {
    setBusy(true);
    setError('');
    try {
      await clearStaleFactors();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Busted Admin',
      });
      if (enrollError) throw enrollError;
      setEnrollment({ factorId: data.id, uri: data.totp.uri, secret: data.totp.secret });
      setCode('');
      setPhase('enrolling');
    } catch {
      setError('Could not start two-factor setup. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!enrollment || busy) return;
    const value = code.replace(/\D/g, '');
    if (value.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.factorId,
        code: value,
      });
      if (verifyError) {
        setError('That code did not match. Check your authenticator app and try the newest code.');
        setCode('');
        return;
      }

      // Never keep the secret or QR payload after a successful verification.
      setEnrollment(null);
      setCode('');
      await refresh();

      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel === 'aal2') {
        navigate('/admin', { replace: true });
      } else {
        setPhase('intro');
        setError('Two-factor verification did not complete on this session. Sign in again to finish.');
      }
    } catch {
      setError('Could not verify that code. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (isDemoMode) {
    return <Shell><p className="text-zinc-400">Two-factor setup is unavailable in this read-only preview.</p></Shell>;
  }

  if (loading) {
    return <Shell><p className="text-zinc-400"><Loader2 className="inline w-4 h-4 animate-spin" /> Checking your two-factor status…</p></Shell>;
  }

  if (enrolled && satisfied) {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-emerald-400"><CheckCircle2 className="w-6 h-6" /><h1 className="text-2xl font-bold">Two-factor authentication is on</h1></div>
        <p className="text-zinc-400 mt-3">This account already has a verified authenticator app. You can manage it from the admin workspace.</p>
        <div className="flex gap-3 mt-6">
          <Link to="/admin/security" className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium">Manage two-factor</Link>
          <Link to="/admin" className="px-5 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 font-medium">Go to admin</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-3"><ShieldCheck className="w-7 h-7 text-orange-400" /><h1 className="text-2xl font-bold">Set up two-factor authentication</h1></div>
      <p className="text-zinc-400 mt-3">Admin accounts require two-factor authentication for additional protection. Your password alone will not open the admin workspace.</p>

      {error && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {phase === 'intro' && (
        <div className="mt-6 space-y-4">
          <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
            <li>Install an authenticator app on your phone.</li>
            <li>Scan the QR code we show next.</li>
            <li>Enter the 6-digit code to confirm.</li>
          </ol>
          <button onClick={startEnrollment} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-medium">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}Start setup
          </button>
        </div>
      )}

      {phase === 'enrolling' && enrollment && (
        <div className="mt-6 grid gap-6 md:grid-cols-[auto,1fr]">
          <div className="rounded-2xl bg-white p-4 w-fit">
            <QRCodeSVG value={enrollment.uri} size={192} level="M" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-white">Scan this code</p>
              <p className="text-sm text-zinc-400">Use {AUTHENTICATOR_APPS.slice(0, 3).join(', ')}, 1Password or Apple Passwords.</p>
            </div>
            <details className="text-sm text-zinc-400">
              <summary className="cursor-pointer text-zinc-300">Can't scan the code?</summary>
              <p className="mt-2">Enter this setup key in your authenticator app instead:</p>
              <code className="mt-2 block break-all rounded-lg bg-black/60 border border-zinc-800 p-3 font-mono text-xs text-zinc-200">
                {enrollment.secret.replace(/(.{4})/g, '$1 ').trim()}
              </code>
            </details>
            <form onSubmit={verifyCode} className="space-y-3">
              <label className="block text-sm font-medium text-zinc-300">
                Enter the 6-digit code
                <input
                  value={code}
                  onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  disabled={busy}
                  className="mt-2 w-full tracking-[0.4em] text-center text-lg rounded-xl bg-black/60 border border-zinc-800 px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                  placeholder="000000"
                  aria-label="Six digit authenticator code"
                />
              </label>
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-medium">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Verify and finish
                </button>
                <button type="button" disabled={busy} onClick={() => { setEnrollment(null); setCode(''); setPhase('intro'); setError(''); }} className="px-4 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10">
                  Cancel
                </button>
              </div>
            </form>
            <p className="text-xs text-zinc-500">The setup key is shown only until you verify. It is never stored by BoostD.</p>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"><ArrowLeft className="w-4 h-4" />Back</Link>
        <section className="rounded-2xl border border-zinc-800 bg-[#111] p-6 md:p-8">{children}</section>
      </div>
    </main>
  );
}
