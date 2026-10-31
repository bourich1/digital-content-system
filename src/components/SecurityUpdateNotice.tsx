import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import './SecurityUpdateNotice.css';

const NOTICE_VERSION = 'boostd-welcome-back-2026-10-31';

export function SecurityUpdateDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="security-update-dialog"
      aria-labelledby="security-update-title"
      aria-describedby="security-update-description"
      onCancel={event => { event.preventDefault(); onClose(); }}
    >
      <div className="security-update-heading">
        <span className="security-update-symbol">
          <CheckCircle2 size={27} className="text-emerald-400" aria-hidden="true" />
        </span>
        <button
          type="button"
          className="security-update-close"
          onClick={onClose}
          aria-label="Close message"
          autoFocus
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      <p className="security-update-date">BoostD · October 31, 2026</p>
      <h2 id="security-update-title">We are fully back online! 🎉</h2>

      <div id="security-update-description">
        <div className="security-update-arabic" lang="ar" dir="rtl" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>
          <h3 style={{ color: '#ff7a24', fontSize: '20px' }}>سمحو لينا على هاد التوقف المؤقت</h3>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#f4f4f5' }}>
            سمحو لينا على هاد الـ pause، قمنا ببعض التحسينات والتحديثات الأمنية الشاملة على السيرفر وقاعدة البيانات. حالياً راه التطبيق خدام مزيان وبشكل طبيعي وبكل أمان. تقدر دابا تخدم بيه بكل راحة.
          </p>
        </div>

        <p style={{ marginTop: '14px', color: '#a1a1aa' }}>
          Thank you for your patience during our maintenance pause. We completed essential system and security enhancements across the platform. Everything is fully operational and running at peak performance.
        </p>
      </div>

      <button type="button" className="security-update-confirm" onClick={onClose}>
        فهمت، كمل الخدمة · Continue to BoostD
      </button>
    </dialog>
  );
}

export default function SecurityUpdateNotice() {
  const { user, loading } = useAuth();
  const [visibleFor, setVisibleFor] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (loading || !userId) { setVisibleFor(null); return; }
    try {
      setVisibleFor(localStorage.getItem(`${NOTICE_VERSION}:${userId}`) ? null : userId);
    } catch {
      setVisibleFor(userId);
    }
  }, [loading, userId]);

  if (loading || !userId || visibleFor !== userId) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(`${NOTICE_VERSION}:${userId}`, new Date().toISOString());
    } catch {
      /* Keep dismissal functional */
    }
    setVisibleFor(null);
  };

  return <SecurityUpdateDialog key={userId} onClose={dismiss} />;
}
