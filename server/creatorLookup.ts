import { parseProfileLink } from '../src/lib/creatorProfile';

function decode(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)));
}
export function readProfileMetadata(html: string) {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) attrs[match[1].toLowerCase()] = decode(match[3]);
    const key = attrs.property || attrs.name;
    if (key && attrs.content) meta[key] = attrs.content;
  }
  return { name: meta['og:title'] || '', description: meta['og:description'] || meta.description || '', avatar_url: meta['og:image'] || '' };
}
export async function lookupCreator(input: string) {
  const profile = parseProfileLink(input);
  const fallback = { ...profile, name: profile.handle.replace(/^@/, ''), description: '', avatar_url: '', imported: false };
  // No arbitrary URL proxy: destinations are canonicalized to known public hosts.
  // X requires an API integration; other platforms may refuse public metadata.
  if (profile.platform === 'X') return fallback;
  try {
    const github = new URL(profile.url).hostname === 'github.com';
    const response = await fetch(github ? `https://api.github.com/users/${encodeURIComponent(profile.handle)}` : profile.url, { redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'BoostD-ProfilePreview/1.0', Accept: github ? 'application/vnd.github+json' : 'text/html' } });
    if (!response.ok || !response.body) return fallback;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let length = 0;
    try { while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > 1_500_000) { length -= value.length; await reader.cancel(); break; } chunks.push(value); } } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = new TextDecoder().decode(bytes);
    const data = github ? JSON.parse(body) : readProfileMetadata(body);
    let name = github ? data.name || data.login : data.name;
    if (!name || /^(instagram|tiktok|youtube|log in|login|sign up|consent|before you continue)/i.test(name.trim())) return fallback;
    name = name.replace(/\s*[-|] YouTube$/, '');
    const avatar = github ? data.avatar_url : data.avatar_url;
    return { ...fallback, name: String(name).slice(0, 150), description: String(github ? data.bio || '' : data.description || '').slice(0, 1000), avatar_url: typeof avatar === 'string' && avatar.startsWith('https://') ? avatar : '', imported: true };
  } catch { return fallback; }
}
