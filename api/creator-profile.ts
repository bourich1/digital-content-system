import type { IncomingMessage, ServerResponse } from 'node:http';
import { lookupCreator } from '../server/creatorLookup.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp.trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

async function isRateLimited(ip: string): Promise<{ limited: boolean; retryAfter: number }> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  // 1. Try Upstash Redis if configured in environment
  if (upstashUrl && upstashToken) {
    try {
      const key = `rate:creator_profile:${ip}`;
      const response = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['TTL', key],
        ]),
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        const results = await response.json();
        const count = Number(results[0]?.result || 1);
        const ttl = Number(results[1]?.result || 60);

        if (count === 1) {
          // Set expiry on first hit
          await fetch(`${upstashUrl}/expire/${key}/60`, {
            headers: { Authorization: `Bearer ${upstashToken}` },
          }).catch(() => {});
        }

        if (count > MAX_REQUESTS_PER_WINDOW) {
          return { limited: true, retryAfter: Math.max(1, ttl) };
        }
        return { limited: false, retryAfter: 0 };
      }
    } catch {
      // Fallback to local memory limiter if Upstash is unavailable
    }
  }

  // 2. In-memory sliding window fallback
  const now = Date.now();
  const entry = memoryStore.get(ip);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { limited: true, retryAfter: Math.max(1, retryAfter) };
  }

  return { limited: false, retryAfter: 0 };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Apply rate limiting
  const ip = getClientIp(req);
  const { limited, retryAfter } = await isRateLimited(ip);
  if (limited) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(retryAfter));
    res.end(JSON.stringify({ error: 'Too many requests. Please wait a moment before trying again.' }));
    return;
  }

  const input = new URL(req.url || '/', 'http://localhost').searchParams.get('url') || '';
  if (input.length > 600) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Profile link is too long.' }));
    return;
  }

  try {
    res.end(JSON.stringify(await lookupCreator(input)));
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid profile link.' }));
  }
}
