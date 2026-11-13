import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Login from './Login';

function LocalMcpLogin() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Sign in to Boostd test workspace</h1>
      <form className="grid gap-3" onSubmit={async event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: String(fields.get('email')),
            password: String(fields.get('password')),
          });
          if (error) setError('Could not sign in to the test account.');
        } catch {
          setError('Could not reach the test authentication server.');
        } finally {
          setBusy(false);
        }
      }}>
        <label>Email <input className="block w-full rounded border p-2" name="email" type="email" autoComplete="username" required /></label>
        <label>Password <input className="block w-full rounded border p-2" name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p role="alert">{error}</p>}
        <button className="rounded bg-blue-700 px-4 py-2 text-white" disabled={busy}>Sign in</button>
      </form>
    </main>
  );
}

function trustedCallback(value: string, registered: string) {
  const target = new URL(value);
  const expected = new URL(registered);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  if ((target.protocol !== 'https:' && !(target.protocol === 'http:' && loopback)) ||
      target.origin !== expected.origin || target.pathname !== expected.pathname ||
      target.username || target.password) {
    throw new Error('Invalid callback');
  }
  return target.href;
}

export default function McpConsent() {
  const { session } = useAuth();
  const { search } = useLocation();
  const authorizationId = new URLSearchParams(search).get('authorization_id');
  const clientId = import.meta.env.VITE_BOOSTD_MCP_OAUTH_CLIENT_ID;
  const callback = import.meta.env.VITE_BOOSTD_MCP_OAUTH_CALLBACK;
  const [details, setDetails] = useState<{ id: string; name: string; scopes: string }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session || !authorizationId || !clientId || !callback) return;
    let cancelled = false;
    setError('');
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) throw new Error('Invalid authorization');
      if (!('authorization_id' in data)) {
        window.location.assign(trustedCallback(data.redirect_url, callback));
        return;
      }
      if (data.client.id !== clientId || data.redirect_uri !== callback || data.user.id !== session.user.id) {
        setError('This authorization request could not be verified. Start again from your agent.');
        return;
      }
      setDetails({ id: authorizationId, name: data.client.name || 'MCP client', scopes: data.scope });
    }).catch(() => {
      if (!cancelled) setError('Could not load the authorization request.');
    });
    return () => { cancelled = true; };
  }, [session, authorizationId, clientId, callback]);

  async function decide(allow: boolean) {
    if (!authorizationId || !callback || details?.id !== authorizationId || busy) return;
    setBusy(true);
    try {
      const oauth = supabase.auth.oauth;
      const { data, error } = await (allow
        ? oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
        : oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true }));
      if (error || !data?.redirect_url) throw new Error('Authorization failed');
      window.location.assign(trustedCallback(data.redirect_url, callback));
    } catch {
      setError('Could not finish authorization. Start again from your agent.');
    } finally {
      setBusy(false);
    }
  }

  if (authorizationId && clientId && callback && !session) {
    const localAuth = import.meta.env.DEV && /^http:\/\/127\.0\.0\.1:\d+$/.test(import.meta.env.VITE_SUPABASE_URL ?? '');
    const hostedTest = import.meta.env.VITE_BOOSTD_MCP_HOSTED_TEST === 'true' &&
      import.meta.env.VITE_SUPABASE_URL === 'https://vqmdsohqsspxbvrvsvxj.supabase.co';
    return localAuth || hostedTest ? <LocalMcpLogin /> : <Login returnTo={`/oauth/consent${search}`} />;
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Connect to Boostd</h1>
      {error && <p role="alert">{error}</p>}
      {!clientId || !callback || !authorizationId ? <p>Boostd authorization is unavailable.</p> :
        details?.id === authorizationId && !error ? (
          <>
            <p>{details.name} is requesting access to your Boostd account.</p>
            {import.meta.env.VITE_BOOSTD_MCP_WORKSPACE_WRITES === 'true' ? (
              <p>This connection can read your tasks, ideas, collaborations, calendar, and tools catalog where available.
                It can also create tasks and ideas, change idea status, save Instagram creators, and schedule posting dates for your own collaborations.</p>
            ) : (
              <p>The Boostd MCP endpoint can read your tasks, ideas, collaborations, calendar, and tools catalog where available.</p>
            )}
            {details.scopes && <p>Requested OAuth scopes — {details.scopes}</p>}
            <div className="flex gap-3">
              <button type="button" className="rounded border px-4 py-2" disabled={busy} onClick={() => decide(false)}>Deny</button>
              <button type="button" className="rounded bg-blue-700 px-4 py-2 text-white" disabled={busy} onClick={() => decide(true)}>Authorize</button>
            </div>
          </>
        ) : !error && <p role="status">Loading authorization request…</p>}
    </main>
  );
}
