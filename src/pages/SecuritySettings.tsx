import React, { useState } from 'react';
import { LockKeyhole, ShieldCheck, Mail, Loader2, ExternalLink } from 'lucide-react';
import LoginActivity from '@/components/LoginActivity';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SecuritySettings() {
  const { user, isDemoMode } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [nonce, setNonce] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const providers = [...new Set(user?.identities?.map(identity => identity.provider) || [])];
  const googleManaged = providers.includes('google');
  const canChangePassword = providers.includes('email') && !googleManaged;

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!canChangePassword) { setError('Manage your password with your sign-in provider.'); return; }
    if (isDemoMode) { setError('Password changes are unavailable in demo mode.'); return; }
    if (password.length < 8) { setError('Use at least 8 characters for your new password.'); return; }
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password, ...(nonce.trim() ? { nonce: nonce.trim() } : {}) });
      if (updateError) {
        if (updateError.code === 'reauthentication_needed') {
          const { error: verificationError } = await supabase.auth.reauthenticate();
          if (verificationError) throw verificationError;
          setNeedsVerification(true);
          setMessage('Enter the verification code sent to your email, then save again.');
        } else throw updateError;
      } else {
        setPassword(''); setConfirmation(''); setNonce(''); setNeedsVerification(false);
        setMessage('Your password has been updated.');
      }
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'Could not update your password. Please try again.'); }
    finally { setBusy(false); }
  }

  if (isDemoMode) return <div className="security-page"><div className="settings-section-heading"><h2>Security</h2><p>Private sign-in details are unavailable in this read-only preview.</p></div></div>;

  return <div className="security-page"><div className="settings-section-heading"><span>PEACE OF MIND</span><h2>Security</h2><p>Manage how you sign in to your BoostD account.</p></div>
    <section className="security-card"><div className="security-card-heading"><div className="security-icon"><LockKeyhole size={21} /></div><div><h3>{canChangePassword ? 'Change password' : 'Sign-in security'}</h3><p>Manage the password for your sign-in method.</p></div></div>
      {canChangePassword ? <form onSubmit={updatePassword}><div className="security-fields"><label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" disabled={busy || isDemoMode} /></label><label>Confirm new password<input type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Re-enter your password" disabled={busy || isDemoMode} /></label></div>
        {needsVerification && <label>Verification code<input autoComplete="one-time-code" required value={nonce} onChange={event => setNonce(event.target.value)} disabled={busy} /></label>}
        {error && <p className="security-error" role="alert">{error}</p>}{message && <p className="security-success" role="status">{message}</p>}
        <footer><span>{isDemoMode ? 'Unavailable in demo mode.' : 'Your password stays private.'}</span><button type="submit" disabled={busy || isDemoMode}>{busy ? <Loader2 size={15} className="animate-spin" /> : <LockKeyhole size={15} />}Update password</button></footer>
      </form> : <div className="provider-password"><strong>{googleManaged ? 'Your password is managed by Google' : 'Your password is managed by your sign-in provider'}</strong><p>{googleManaged ? 'You use Google to sign in to BoostD. To change or recover your password, visit your Google Account.' : 'Manage your password directly with the service you use to sign in.'}</p>{googleManaged && <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Manage Google security<ExternalLink size={14} /></a>}</div>}</section>
    <LoginActivity />
    <section className="security-card"><div className="security-card-heading"><div className="security-icon"><ShieldCheck size={21} /></div><div><h3>Sign-in details</h3><p>The sign-in information linked to your account.</p></div></div><dl className="security-details"><div><dt><Mail size={16} />Email verification</dt><dd className={user?.email_confirmed_at ? 'verified' : ''}>{user?.email_confirmed_at ? 'Verified' : 'Not verified'}</dd></div><div><dt>Sign-in method</dt><dd>{providers.length ? providers.map(provider => provider === 'email' ? 'Email & password' : provider.charAt(0).toUpperCase() + provider.slice(1)).join(', ') : 'Not available'}</dd></div><div><dt>Last sign-in</dt><dd>{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Not available'}</dd></div></dl></section>
  </div>;
}

