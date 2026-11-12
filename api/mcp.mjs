import { handleMcpPreview } from '../server/boostd-mcp-preview.mjs';

export default { fetch: request => handleMcpPreview(request) };
