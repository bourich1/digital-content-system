import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 20000);
    function fail() {
      window.clearTimeout(timeout);
      script.onload = script.onerror = null;
      script.remove();
      scriptPromise = undefined;
      reject(new Error('Security verification could not load. Please retry.'));
    }
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.turnstile) resolve(window.turnstile);
      else fail();
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface Props {
  siteKey: string;
  theme: 'dark' | 'light';
  action: 'login' | 'signup';
  resetKey: number;
  onToken: (token: string) => void;
}

export default function TurnstileCaptcha({ siteKey, theme, action, resetKey, onToken }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | undefined;
    let api: TurnstileApi | undefined;
    onToken('');
    setError('');
    loadTurnstile().then(loaded => {
      if (cancelled || !container.current) return;
      api = loaded;
      widgetId = api.render(container.current, {
        sitekey: siteKey,
        theme,
        action,
        size: 'flexible',
        'response-field': false,
        callback: (token: string) => {
          if (!cancelled) { setError(''); onToken(token); }
        },
        'expired-callback': () => { if (!cancelled) onToken(''); },
        'timeout-callback': () => { if (!cancelled) onToken(''); },
        'error-callback': () => {
          if (!cancelled) {
            onToken('');
            setError('Verification failed. Please retry or check your connection.');
          }
        },
      });
    }).catch(() => {
      if (!cancelled) setError('Security verification could not load. Please retry.');
    });
    return () => {
      cancelled = true;
      if (api && widgetId !== undefined) api.remove(widgetId);
    };
  }, [siteKey, theme, action, resetKey, retry, onToken]);

  return (
    <div className="login-captcha">
      <div ref={container} aria-label="Security verification" />
      {error && <div role="alert" className="login-captcha-error">
        <p>{error}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)}>Retry verification</button>
      </div>}
    </div>
  );
}
