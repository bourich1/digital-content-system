import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type LoginSession = { id: string; created_at: string; updated_at: string | null; user_agent: string | null; ip: string | null };
export function describeDevice(agent: string) {
  const browser = /Edg\//.test(agent) ? 'Edge' : /OPR\//.test(agent) ? 'Opera' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'Browser';
  const system = /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS' : /Windows/.test(agent) ? 'Windows' : /Macintosh/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : 'Unknown device';
  return `${browser} on ${system}`;
}
export default function LoginActivity() {
  const { user, session, isDemoMode } = useAuth();
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [revision, setRevision] = useState(0);
  let currentId = '';
  try { currentId = JSON.parse(atob((session?.access_token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'))).session_id || ''; } catch { /* No token in demo/initial state. */ }
  useEffect(() => {
    let active = true;
    setSessions([]);
    if (isDemoMode || !user) return;
    setLoading(true);
    supabase.rpc('get_my_login_sessions').then(({ data, error }) => {
      if (!active) return;
      setUnavailable(!!error);
      setSessions(error ? [] : (data || []));
      setLoading(false);
    }, () => { if (active) { setUnavailable(true); setLoading(false); } });
    return () => { active = false; };
  }, [user?.id, isDemoMode, revision]);
  async function signOutOthers() {
    if (isDemoMode || signingOut) return;
    setSigningOut(true); setMessage('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      setConfirm(false); setRevision(value => value + 1);
      setMessage('Other sessions have been signed out. Existing access may last until their current token expires.');
    } catch { setMessage('Could not sign out other sessions. Please try again.'); }
    finally { setSigningOut(false); }
  }
  const rows = sessions.length ? sessions : [{ id: currentId, created_at: user?.last_sign_in_at || '', updated_at: null, user_agent: navigator.userAgent, ip: null }];
  return <section className="security-card login-activity"><div className="security-card-heading"><div className="security-icon"><Monitor size={21} /></div><div><h3>Where you're logged in</h3><p>Review the devices connected to your account.</p></div><button className="activity-refresh" aria-label="Refresh login activity" disabled={loading || isDemoMode} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button></div>
    {isDemoMode ? <p className="activity-note">Login activity is unavailable in demo mode.</p> : <>{rows.map(row => <div className="activity-device" key={row.id || 'current'}>{/Android|iPhone|iPad/.test(row.user_agent || '') ? <Smartphone size={24} /> : <Monitor size={24} />}<div><strong>{describeDevice(row.user_agent || '')}</strong><p>{row.ip ? `IP address: ${row.ip}` : 'Location unavailable'} · {row.created_at ? `Signed in ${new Date(row.created_at).toLocaleString()}` : 'Sign-in time unavailable'}</p>{row.updated_at && <small>Last session update: {new Date(row.updated_at).toLocaleString()}</small>}</div>{row.id === currentId && <span>This device</span>}</div>)}
      <p className="activity-note">{unavailable ? 'Only this device can be shown until account-wide session history is connected.' : 'IP addresses identify a connection, not a person. Geographic locations are not available yet.'}</p>
      {message && <p role="status" className="activity-note">{message}</p>}
      {confirm ? <div className="activity-confirm"><p>Sign out every other session? This device will stay signed in.</p><button disabled={signingOut} onClick={signOutOthers}>{signingOut ? 'Signing out…' : 'Confirm sign out'}</button><button disabled={signingOut} onClick={() => setConfirm(false)}>Cancel</button></div> : <button className="activity-signout" onClick={() => setConfirm(true)}><LogOut size={15} />Sign out other sessions</button>}
    </>}
  </section>;
}
