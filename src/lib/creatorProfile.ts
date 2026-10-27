export type ProfileLink = { platform: 'YouTube' | 'Instagram' | 'TikTok' | 'X' | 'Other'; handle: string; url: string };
export function parseProfileLink(input: string): ProfileLink {
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`); }
  catch { throw new Error('Enter a valid profile link.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use a secure public profile link.');
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const handle = parts[0] || '';
  if (host === 'youtube.com' && ((parts.length === 1 && /^@[\p{L}\p{N}_.-]+$/u.test(handle)) || (parts.length === 2 && ['channel', 'c', 'user'].includes(handle) && /^[\w.-]+$/.test(parts[1])))) return { platform: 'YouTube', handle: parts.at(-1)!, url: `https://www.youtube.com/${parts.join('/')}` };
  const platforms: Record<string, ProfileLink['platform']> = { 'instagram.com': 'Instagram', 'tiktok.com': 'TikTok', 'x.com': 'X', 'twitter.com': 'X', 'github.com': 'Other' };
  if (platforms[host] && parts.length === 1 && /^@?[\w.-]+$/.test(handle) && !['p','reel','reels','explore','accounts','login','home','search','settings','intent','share','watch','shorts'].includes(handle.toLowerCase()) && (host !== 'tiktok.com' || handle.startsWith('@'))) return { platform: platforms[host], handle, url: `https://${host === 'twitter.com' ? 'x.com' : host}/${handle}` };
  throw new Error('Use a YouTube, Instagram, TikTok, X or GitHub profile link, not a post or video. You can also add details manually.');
}
