import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { ProfileSnapshot } from '@/lib/profilePresentation';

export function ProfileShareCard({ snapshot, url }: { snapshot: ProfileSnapshot; url: string }) {
  const softAccent = snapshot.accent.replace(/[0-9a-f]{2}/gi, pair => Math.round(parseInt(pair, 16) * .55 + 255 * .45).toString(16).padStart(2, '0'));
  const stats = [['DAY STREAK', snapshot.streak], ['FOCUS SESSIONS', snapshot.sessions], ['POINTS', snapshot.points]];
  return <div style={{ width: 1200, height: 630, position: 'relative', overflow: 'hidden', background: '#101013', color: '#fafafa', fontFamily: 'Inter, Arial, sans-serif', boxSizing: 'border-box', padding: 60 }}>
    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 90% 0%, ${snapshot.accent}45, transparent 65%)` }} />
    <img src="/icon%20white.png" alt="" style={{ position: 'absolute', width: 360, height: 360, objectFit: 'contain', right: 210, top: -100, opacity: .025, transform: 'rotate(-15deg)' }} />
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 25 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, minWidth: 0 }}>
        <div style={{ width: 130, height: 130, flexShrink: 0, borderRadius: 34, background: '#242428', border: `2px solid ${snapshot.accent}80`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, fontWeight: 600 }}>
          {snapshot.avatar ? <img src={snapshot.avatar} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : snapshot.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, maxWidth: 700 }}><div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{snapshot.name}</div><div style={{ color: softAccent, fontSize: 22, marginTop: 12 }}>@{snapshot.username || 'creator'}</div><div style={{ color: '#a1a1aa', fontSize: 20, marginTop: 8 }}>{snapshot.occupation}</div></div>
      </div>
    </div>
    <p style={{ position: 'relative', fontSize: 21, color: '#b4b4bf', lineHeight: 1.65, maxWidth: 820, margin: '30px 0 24px', height: 70, overflow: 'hidden' }}>{snapshot.bio || 'A little focus. A lot of possibility.'}</p>
    <div style={{ position: 'relative', display: 'flex', gap: 20 }}>{stats.map(([label, value]) => <div key={label} style={{ width: 216, padding: '18px 22px', border: '1px solid #303034', borderRadius: 16, background: '#ffffff03' }}><div style={{ fontSize: 34, fontWeight: 600 }}>{value}</div><div style={{ marginTop: 7, fontSize: 12, letterSpacing: 1.5, color: '#92929d' }}>{label}</div></div>)}</div>
    <div style={{ position: 'absolute', right: 60, bottom: 108, background: '#ffffff', padding: 14, borderRadius: 17 }}><QRCodeSVG value={url} size={126} level="L" /></div>
    <div style={{ position: 'absolute', bottom: 39, left: 60, right: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #303034', paddingTop: 22 }}><img src="/logo%20white.png" alt="BoostD" style={{ width: 125, height: 33, objectFit: 'contain' }} /><span style={{ fontSize: 17, color: '#92929d' }}>Made for your next chapter.</span></div>
  </div>;
}
