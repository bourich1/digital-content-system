import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useMfa } from '@/contexts/MfaContext';

export default function AdminSecurity() {
  const { loading, factors, satisfied, error: stateError, refresh } = useMfa();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const lastFactor = factors.length <= 1;

  async function removeFactor(factorId: string) {
    setError('');
    setMessage('');
    // Fail closed: never let an admin drop to zero factors while keeping
    // unrestricted administrator access.
    if (!satisfied) {
      setError('Verify your second factor in this session before changing it.');
      setPendingId(null);
      return;
    }
    if (lastFactor) {
      setError('Enroll another authenticator app first. The last factor cannot be removed while this account is an administrator.');
      setPendingId(null);
      return;
    }
    setBusy(true);
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) throw unenrollError;
      await refresh();
      setMessage('Authenticator removed.');
    } catch {
      setError('Could not remove that authenticator. Please try again.');
    } finally {
      setBusy(false);
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Security</h1>
        <p className="text-gray-400">Admin accounts require two-factor authentication for additional protection.</p>
      </div>

      {stateError && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{stateError}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">{message}</div>}

      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-orange-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Two-factor authentication</h2>
            <p className="text-sm text-gray-400">A 6-digit code from your authenticator app is required after your password.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <p className="text-gray-400"><Loader2 className="inline w-4 h-4 animate-spin" /> Checking your two-factor status…</p>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              {factors.length > 0
                ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Enabled</span><span className="text-gray-500">· this session is verified</span></>
                : <><AlertTriangle className="w-4 h-4 text-orange-400" /><span className="text-orange-400">Not enabled</span><span className="text-gray-500">· admin access is blocked until you enroll</span></>}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4" />Authenticator apps</h3>
            {factors.length === 0 ? (
              <p className="text-sm text-gray-400">No authenticator app is enrolled yet.</p>
            ) : (
              <ul className="divide-y divide-gray-800 rounded-xl border border-gray-800">
                {factors.map(factor => (
                  <li key={factor.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-white">{factor.friendlyName}</p>
                      <p className="text-xs text-gray-500">Added {new Date(factor.createdAt).toLocaleDateString()}</p>
                    </div>
                    {pendingId === factor.id ? (
                      <div className="flex items-center gap-2">
                        <button disabled={busy} onClick={() => removeFactor(factor.id)} className="px-3 py-1.5 rounded-lg text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm remove'}
                        </button>
                        <button disabled={busy} onClick={() => setPendingId(null)} className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setError(''); setMessage(''); setPendingId(factor.id); }}
                        disabled={busy || !satisfied || lastFactor}
                        title={lastFactor ? 'Enroll another authenticator first' : !satisfied ? 'Verify this session first' : undefined}
                        className="px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {lastFactor && factors.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">Enroll a second authenticator before removing this one, so the account cannot be left without two-factor protection.</p>
            )}
          </div>

          <Link to="/security/mfa/setup" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium">
            <KeyRound className="w-4 h-4" />Add another authenticator app
          </Link>
        </div>
      </div>
    </div>
  );
}
