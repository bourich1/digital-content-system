import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { McpConsentView } from '@/components/McpUI';
import Login from './Login';


function trustedCallback(value: string, registered: string) {
  const target = new URL(value);
  const expected = new URL(registered);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  if ((target.protocol !== 'https:' && !(target.protocol === 'http:' && loopback)) ||
      target.origin !== expected.origin || target.pathname !== expected.pathname ||
      target.username || target.password || target.hash) {
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
  const dynamicOAuth = import.meta.env.VITE_BOOSTD_MCP_DYNAMIC_OAUTH === 'true' &&
    (import.meta.env.VITE_SUPABASE_URL === 'https://vqmdsohqsspxbvrvsvxj.supabase.co' ||
      (import.meta.env.VITE_SUPABASE_URL === 'https://erzksxgbbdxzjdtssuyv.supabase.co' &&
        window.location.origin === 'https://www.boostd.app'));
  const [details, setDetails] = useState<{ id: string; name: string; scopes: string; callback: string; userId: string; logo?: string; writes: boolean }>();
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
        // Auth has already validated the registered redirect and existing consent.
        window.location.assign(trustedCallback(data.redirect_url, dynamicOAuth ? data.redirect_url : callback));
        return;
      }
      const registeredClient = data.client.id === clientId && data.redirect_uri === callback;
      if ((!registeredClient && !dynamicOAuth) || data.user.id !== session.user.id) {
        setError('This authorization request could not be verified. Start again from your agent.');
        return;
      }
      trustedCallback(data.redirect_uri, data.redirect_uri);
      setDetails({ id: authorizationId, name: data.client.name || 'MCP client', scopes: data.scope,
        callback: data.redirect_uri, userId: data.user.id, logo: data.client.logo_uri,
        writes: dynamicOAuth });
    }).catch(() => {
      if (!cancelled) setError('Could not load the authorization request.');
    });
    return () => { cancelled = true; };
  }, [session, authorizationId, clientId, callback, dynamicOAuth]);

  async function decide(allow: boolean) {
    if (!authorizationId || details?.id !== authorizationId || details.userId !== session?.user.id || busy) return;
    setBusy(true);
    try {
      if (allow && details.writes) {
        const {error:grantError}=await supabase.rpc('approve_mcp_workspace_actions',{request_id:authorizationId});
        if(grantError) throw new Error('Write consent could not be saved');
      }
      const oauth = supabase.auth.oauth;
      const { data, error } = await (allow
        ? oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
        : oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true }));
      if (error || !data?.redirect_url) throw new Error('Authorization failed');
      window.location.assign(trustedCallback(data.redirect_url, details.callback));
    } catch {
      setError('Could not finish authorization. Start again from your agent.');
    } finally {
      setBusy(false);
    }
  }

  if (authorizationId && clientId && callback && !session) {
    return <Login returnTo={`/oauth/consent${search}`} />;
  }

  const client = details?.id === authorizationId && details?.userId === session?.user.id && !error ? details : undefined;
  const unavailable = !clientId || !callback || !authorizationId;
  return <McpConsentView
    name={details?.name} logo={details?.logo} email={session?.user.email}
    scopes={client?.scopes} ready={!!client} busy={busy}
    writes={client?.writes ?? false} onDecide={decide}
    error={error || (unavailable ? 'Open a new connection request from your agent to review and authorize access.' : undefined)}
  />;
}
