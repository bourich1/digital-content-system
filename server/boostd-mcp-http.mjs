import { createServer } from 'node:http';
import { handleMcpHttp } from './boostd-mcp.mjs';

const resource = new URL(process.env.BOOSTD_MCP_RESOURCE_URL ?? 'http://127.0.0.1:4317/mcp');
if (resource.protocol !== 'http:' || resource.hostname !== '127.0.0.1' ||
    !resource.port || resource.pathname !== '/mcp' || resource.search || resource.hash ||
    resource.username || resource.password) {
  throw new Error('Use http://127.0.0.1:<port>/mcp for the local MCP resource.');
}
process.env.BOOSTD_MCP_RESOURCE_URL = resource.href;

createServer(async (req, res) => {
  if (req.headers.host !== resource.host || !req.url?.startsWith('/') || req.url.startsWith('//')) {
    res.writeHead(400).end();
    return;
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > 32_768) {
        res.writeHead(413, { Connection: 'close' }).end();
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(new URL(req.url, resource), {
      method: req.method,
      headers: req.headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const response = await handleMcpHttp(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500).end();
  }
}).listen(Number(resource.port), resource.hostname, () => console.error(`Boostd MCP listening at ${resource.href}`));
