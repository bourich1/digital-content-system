import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import './SecurityUpdateNotice.css';

const NOTICE_VERSION = 'security-permissions-2026-10-30';

export function SecurityUpdateDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} className="security-update-dialog" aria-labelledby="security-update-title" aria-describedby="security-update-description" onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="security-update-heading">
        <span className="security-update-symbol"><ShieldCheck size={27} aria-hidden="true" /></span>
        <button type="button" className="security-update-close" onClick={onClose} aria-label="Close security update" autoFocus><X size={22} aria-hidden="true" /></button>
      </div>
      <p className="security-update-date">BoostD · October 30, 2026</p>
      <h2 id="security-update-title">An important security update</h2>
      <div id="security-update-description">
        <p>We fixed a permissions flaw that could allow an ordinary account to gain administrator privileges. Changes to account roles and protected permissions are now restricted at the database level.</p>
        <p>We also tightened access to private profiles, messages and uploaded files. Review your sign-in activity and contact support if you notice anything unfamiliar.</p>
        <div className="security-update-arabic" lang="ar" dir="rtl">
          <h3>تحديث أمني مهم</h3>
          <p>أصلحنا ثغرة في الصلاحيات كانت قد تسمح لحساب عادي بالحصول على صلاحيات الأدمن. أصبح تغيير الأدوار والصلاحيات الحساسة محمياً على مستوى قاعدة البيانات، مع تقييد الوصول إلى البروفايلات الخاصة والرسائل والملفات.</p>
          <p>راجع نشاط تسجيل الدخول، وتواصل مع الدعم إذا لاحظت أي نشاط غير مألوف.</p>
        </div>
      </div>
      <button type="button" className="security-update-confirm" onClick={onClose}>Got it · فهمت</button>
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
      // The notice still works when browser storage is unavailable.
      setVisibleFor(userId);
    }
  }, [loading, userId]);

  if (loading || !userId || visibleFor !== userId) return null;

  const dismiss = () => {
    try { localStorage.setItem(`${NOTICE_VERSION}:${userId}`, new Date().toISOString()); } catch { /* Keep dismissal functional without storage. */ }
    setVisibleFor(null);
  };

  return <SecurityUpdateDialog key={userId} onClose={dismiss} />;
}
