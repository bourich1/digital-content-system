let previewUserId: string | null = null;

export function setPreviewUserId(userId: string | null) {
  previewUserId = userId;
}

// Install on the client itself: replacing window.fetch after createClient()
// does not reliably intercept the fetch function Supabase already captured.
export function createPreviewFetch(apiUrl: string, fetcher: typeof fetch): typeof fetch {
  const origin = new URL(apiUrl).origin;
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const dataApi = /^\/(rest|storage|functions)\/v1(?:\/|$)/.test(url.pathname);
    if (previewUserId && url.origin === origin && dataApi && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return new Response(JSON.stringify({ message: 'View as user is read-only.' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }
    return fetcher(input, init);
  };
}
