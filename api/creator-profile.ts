import type { IncomingMessage, ServerResponse } from 'node:http';
import { lookupCreator } from '../server/creatorLookup.js';
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); res.end(JSON.stringify({ error: 'Method not allowed' })); return; }
  const input = new URL(req.url || '/', 'http://localhost').searchParams.get('url') || '';
  if (input.length > 600) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Profile link is too long.' })); return; }
  try { res.end(JSON.stringify(await lookupCreator(input))); }
  catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid profile link.' })); }
}
