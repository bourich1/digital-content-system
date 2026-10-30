import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMfa } from '@/contexts/MfaContext';

function sanitizeRedirectDestination(raw: unknown): string {
  if (typeof raw !== 'string') return '/admin';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || /^[a-z0-9+.-]+:/i.test(trimmed)) {
    return '/admin';
  }
  if (trimmed.startsWith('/security/mfa')) {
    return '/admin';
  }
  return trimmed;
}

export default function MfaVerify() {
  const { isDemoMode } = useAuth();
  const { loading, factors, enrolled, satisfied, refresh } = useMfa();
  const location = useLocation();
  const navigate = useNavigate();
  const from = sanitizeRedirectDestination((location.state as { from?: string } | null)?.from);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!factorId && factors.length) setFactorId(factors[0].id);
  }, [factors, factorId]);

  useEffect(() => {
    if (satisfied) navigate(from, { replace: true });
  }, [satisfied, from, navigate]);

  if (isDemoMode) return <Shell><p className="text-zinc-400">Two-factor verification is unavailable in this read-only preview.</p></Shell>;

  if (loading) {
    return <Shell><p className="text-zinc-400"><Loader2 className="inline w-4 h-4 animate-spin" /> Checking your two-factor status…</p></Shell>;
  }

  if (!enrolled) return <Navigate to="/security/mfa/setup" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = code.replace(/\D/g, '');
    if (value.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return; }
    setBusy(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: value });
      if (verifyError) {
        if (/session|expired|jwt/i.test(verifyError.message)) {
          setExpired(true);
          setError('Your session expired before the code was checked. Sign in again to continue.');
        } else {
          setError('That code did not match. Try the newest code from your authenticator app.');
          setCode('');
        }
        return;
      }
      await refresh();
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.currentLevel !== 'aal2') {
        setError('Two-factor verification could not be confirmed. Sign in again to continue.');
        return;
      }
      navigate(from, { replace: true });
    } catch {
      setError('Could not verify that code. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try { await supabase.auth.signOut(); } catch { /* Already signed out. */ }
    navigate('/login', { replace: true });
  }

  return (
    <Shell>
      <div className="flex items-center gap-3"><ShieldCheck className="w-7 h-7 text-orange-400" /><h1 className="text-2xl font-bold">Two-factor verification</h1></div>
      <p className="text-zinc-400 mt-3">Admin accounts require two-factor authentication for additional protection. Enter the current code from your authenticator app to continue.</p>

      {error && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {expired ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={signOut} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium"><LogOut className="w-4 h-4" />Sign in again</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 max-w-sm">
          {factors.length > 1 && (
            <label className="block text-sm font-medium text-zinc-300">
              Authenticator
              <select
                value={factorId}
                onChange={event => setFactorId(event.target.value)}
                disabled={busy}
                className="mt-2 w-full rounded-xl bg-black/60 border border-zinc-800 px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              >
                {factors.map(factor => <option key={factor.id} value={factor.id}>{factor.friendlyName}</option>)}
              </select>
            </label>
          )}
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
              autoFocus
              disabled={busy}
              className="mt-2 w-full tracking-[0.4em] text-center text-lg rounded-xl bg-black/60 border border-zinc-800 px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              placeholder="000000"
              aria-label="Six digit authenticator code"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-medium">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}Verify
            </button>
            <button type="button" onClick={signOut} className="px-4 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10">Sign out</button>
          </div>
        </form>
      )}

      <p className="mt-6 text-xs text-zinc-500">Lost your authenticator app? Sign out and contact support from a non-admin account.</p>
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
