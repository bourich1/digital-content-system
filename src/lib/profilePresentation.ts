export interface ProfileSnapshot {
  name: string; username: string; occupation: string; bio: string; avatar: string;
  accent: string; streak: number; hours: number; sessions: number; points: number;
}
export const profileAccent = (gradient: string) => gradient.match(/#[0-9a-f]{6}\b/i)?.[0] || '#f97316';
const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : '';
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
export function readSnapshot(encoded: string): ProfileSnapshot | null {
  try {
    if (encoded.length > 8000) return null;
    const value = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    if (!value || typeof value !== 'object' || typeof value.name !== 'string') return null;
    let avatar = '';
    try { const url = new URL(text(value.avatar, 1000)); if (url.protocol === 'https:' || url.protocol === 'http:') avatar = url.href; } catch { /* Initials fallback. */ }
    return { name: text(value.name, 100), username: text(value.username, 50), occupation: text(value.occupation, 100), bio: text(value.bio, 280), avatar, accent: /^#[0-9a-f]{6}$/i.test(value.accent) ? value.accent : '#f97316', streak: count(value.streak), hours: count(value.hours), sessions: count(value.sessions), points: count(value.points) };
  } catch { return null; }
}
export function snapshotUrl(snapshot: ProfileSnapshot, origin: string) {
  let payload = JSON.stringify(snapshot);
  if (new TextEncoder().encode(payload).length > 1800) payload = JSON.stringify({ ...snapshot, avatar: '', bio: snapshot.bio.slice(0, 120) });
  const bytes = new TextEncoder().encode(payload);
  const encoded = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${origin}/u/${encodeURIComponent(snapshot.username || 'creator')}#profile=${encodeURIComponent(encoded)}`;
}
