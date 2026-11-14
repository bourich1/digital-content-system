import { handleMcpHttp } from './boostd-mcp.mjs';

export function handleMcpPreview(request, metadata = false) {
  const configuredResource = process.env.BOOSTD_MCP_RESOURCE_URL;
  const supabaseUrl = process.env.BOOSTD_SUPABASE_URL;
  const productionSupabase = 'https://erzksxgbbdxzjdtssuyv.supabase.co';
  const preview = process.env.VERCEL_ENV === 'preview' && supabaseUrl !== productionSupabase;
  const hostedTest = process.env.VERCEL_ENV === 'production' &&
    process.env.BOOSTD_MCP_HOSTED_TEST === 'true' &&
    supabaseUrl === 'https://vqmdsohqsspxbvrvsvxj.supabase.co';
  const production = process.env.VERCEL_ENV === 'production' &&
    process.env.BOOSTD_MCP_ENABLE_PRODUCTION === 'true' &&
    supabaseUrl === productionSupabase && configuredResource === 'https://www.boostd.app/api/mcp';
  if ((!preview && !production && !hostedTest) || !configuredResource ||
      !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(supabaseUrl ?? '')) {
    return new Response('Boostd MCP is unavailable.', { status: 503 });
  }
  const resource = URL.parse(configuredResource);
  if (!resource || resource.protocol !== 'https:' || resource.username || resource.password ||
      resource.pathname !== '/api/mcp' || resource.search || resource.hash ||
      resource.origin !== new URL(request.url).origin) {
    return new Response('Boostd MCP is unavailable.', { status: 503 });
  }

  const url = metadata ? new URL('/.well-known/oauth-protected-resource/api/mcp', resource) : resource;
  return handleMcpHttp(new Request(url, {
    method: request.method,
    headers: request.headers,
    ...(request.body && { body: request.body, duplex: 'half' }),
  }), { requireWorkspaceRole: production || hostedTest });
}
