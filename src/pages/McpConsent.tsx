import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { McpConsentView, McpApprovedView } from '@/components/McpUI';
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
  const [handoff, setHandoff] = useState<{url:string;userId:string}>();
  const [seconds, setSeconds] = useState(3);
  const [popup, setPopup] = useState<Window>();
  const [connected, setConnected] = useState(false);
  const [verificationExpired, setVerificationExpired] = useState(false);
  const popupTrial = import.meta.env.VITE_SUPABASE_URL === 'https://vqmdsohqsspxbvrvsvxj.supabase.co'
    && import.meta.env.VITE_BOOSTD_MCP_POPUP_TRIAL === 'true';

  useEffect(() => {
    if (!popup || !handoff || !authorizationId || handoff.userId !== session?.user.id) return;
    let stopped = false;
    let timer: number;
    const deadline = Date.now() + 30_000;

    async function verify() {
      const { data } = await supabase.rpc('mcp_connection_completed', { request_id: authorizationId });
      if (stopped) return;
      if (data === true) {
        setConnected(true);
        popup?.close();
      } else if (Date.now() >= deadline) {
        setVerificationExpired(true);
      } else {
        timer = window.setTimeout(verify, 1000);
      }
    }

    void verify();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [popup, handoff, authorizationId, session?.user.id]);

  useEffect(() => {
    if (popup || !handoff || handoff.userId !== session?.user.id) return;
    const deadline=Date.now()+3000;
    const interval=window.setInterval(()=>setSeconds(Math.max(0,Math.ceil((deadline-Date.now())/1000))),250);
    const timer=window.setTimeout(()=>window.location.assign(handoff.url),3000);
    return ()=>{window.clearInterval(interval);window.clearTimeout(timer);};
  },[popup,handoff,session?.user.id]);

  useEffect(() => {
    if (!session || !authorizationId || !clientId || !callback) return;
    let cancelled = false;
    setError('');
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) throw new Error('Invalid authorization');
      if (!('authorization_id' in data)) {
        // Auth has already validated the registered redirect and existing consent.
        setSeconds(3);
        setHandoff({url:trustedCallback(data.redirect_url, dynamicOAuth ? data.redirect_url : callback),userId:session.user.id});
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
    if (!authorizationId || details?.id !== authorizationId || details.userId !== session?.user.id || busy || handoff) return;
    setBusy(true);
    const callbackWindow = allow && popupTrial && details.writes
      ? window.open('about:blank', '_blank', 'popup,width=520,height=520')
      : null;
    if (callbackWindow) callbackWindow.opener = null;
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
      const target=trustedCallback(data.redirect_url, details.callback);
      if (allow) {
        if (callbackWindow && !callbackWindow.closed) {
          callbackWindow.location.replace(target);
          setPopup(callbackWindow);
        }
        setSeconds(3);
        setHandoff({ url: target, userId: session.user.id });
      }
      else window.location.assign(target);
    } catch {
      callbackWindow?.close();
      setError('Could not finish authorization. Start again from your agent.');
    } finally {
      setBusy(false);
    }
  }

  if (authorizationId && clientId && callback && !session) {
    return <Login returnTo={`/oauth/consent${search}`} />;
  }

  if(handoff && handoff.userId===session?.user.id) return <McpApprovedView name={details?.name} logo={details?.logo} seconds={seconds} popupStatus={popup ? (connected ? "connected" : verificationExpired ? "unconfirmed" : "waiting") : undefined} onContinue={()=>window.location.assign(handoff.url)}/>;

  const client = details?.id === authorizationId && details?.userId === session?.user.id && !error ? details : undefined;
  const unavailable = !clientId || !callback || !authorizationId;
  return <McpConsentView
    name={details?.name} logo={details?.logo} email={session?.user.email}
    scopes={client?.scopes} ready={!!client} busy={busy}
    writes={client?.writes ?? false} onDecide={decide}
    error={error || (unavailable ? 'Open a new connection request from your agent to review and authorize access.' : undefined)}
  />;
}
