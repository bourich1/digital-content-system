/**
 * Executable checks for the admin two-factor route guard (Phase 11, tests 1–6
 * and 9 at the decision layer). Run with: npx tsx scripts/mfa-guard-check.ts
 *
 * Database-level tests (7, 8, 10) live in
 * supabase/verification/2026-10-30_mfa_aal_enforcement.sql because they need
 * Postgres and must run inside a rolled-back transaction.
 */
import { decideAccess, isTwoFactorSatisfied, type AccessInput } from '../src/lib/adminAccess';

const base: AccessInput = {
  configured: true,
  loading: false,
  hasSession: true,
  role: 'user',
  status: 'active',
  surveyCompleted: true,
  requireAdmin: false,
  pathname: '/',
  isDemoMode: false,
  mfaLoading: false,
  currentLevel: 'aal1',
  nextLevel: 'aal1',
};

const admin = (overrides: Partial<AccessInput>): AccessInput => ({ ...base, role: 'admin', ...overrides });
const user = (overrides: Partial<AccessInput>): AccessInput => ({ ...base, ...overrides });

let failures = 0;
function expect(name: string, actual: string, expected: string) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got=${actual} expected=${expected}`);
}

// 1. Normal user, aal1: app allowed, admin panel denied.
expect('1a normal user aal1 -> app', decideAccess(user({ pathname: '/' })).kind, 'layout');
expect('1b normal user aal1 -> /admin', decideAccess(user({ pathname: '/admin', requireAdmin: true })).kind, 'home');
expect('1c normal user aal2 -> /admin still denied', decideAccess(user({ pathname: '/admin', requireAdmin: true, currentLevel: 'aal2', nextLevel: 'aal2' })).kind, 'home');

// 2. Admin with password only and no MFA factor: enrollment required.
expect('2  admin aal1/no factor -> /admin', decideAccess(admin({ pathname: '/admin', requireAdmin: true })).kind, 'mfa-enroll');
expect('2b admin no factor -> /admin/users', decideAccess(admin({ pathname: '/admin/users', requireAdmin: true })).kind, 'mfa-enroll');
expect('2c admin no factor -> / (cannot browse app either)', decideAccess(admin({ pathname: '/' })).kind, 'mfa-enroll');

// 3. Admin with an enrolled factor but a password-only session: challenge required.
expect('3  admin enrolled aal1 -> /admin', decideAccess(admin({ pathname: '/admin', requireAdmin: true, nextLevel: 'aal2' })).kind, 'mfa-verify');

// 4. Admin with a verified factor on this session: allowed.
expect('4  admin aal2 -> /admin', decideAccess(admin({ pathname: '/admin', requireAdmin: true, currentLevel: 'aal2', nextLevel: 'aal2' })).kind, 'admin-layout');

// 5. Wrong TOTP leaves the session at aal1: still denied. Errors fail closed.
expect('5a admin wrong code (still aal1) -> /admin', decideAccess(admin({ pathname: '/admin', requireAdmin: true, nextLevel: 'aal2' })).kind, 'mfa-verify');
expect('5b admin assurance unreadable (error) -> /admin', decideAccess(admin({ pathname: '/admin', requireAdmin: true, currentLevel: null, nextLevel: null })).kind, 'mfa-enroll');
expect('5c stale aal2 session, factor removed elsewhere -> /admin', decideAccess(admin({ pathname: '/admin', requireAdmin: true, currentLevel: 'aal2', nextLevel: 'aal1' })).kind, 'mfa-enroll');

// 6. Admin types the admin URL directly at aal1: denied, no flash of content.
expect('6a admin aal1 direct /admin/analytics', decideAccess(admin({ pathname: '/admin/analytics', requireAdmin: true, nextLevel: 'aal2' })).kind, 'mfa-verify');
expect('6b admin while assurance still loading', decideAccess(admin({ pathname: '/admin', requireAdmin: true, mfaLoading: true, nextLevel: 'aal2' })).kind, 'loading');

// 7. The two-factor screens themselves stay reachable at aal1 (otherwise the
//    admin could never enroll), and they render without admin chrome.
expect('7a admin aal1 -> /security/mfa/setup', decideAccess(admin({ pathname: '/security/mfa/setup' })).kind, 'allow');
expect('7b admin aal1 -> /security/mfa/verify', decideAccess(admin({ pathname: '/security/mfa/verify', nextLevel: 'aal2' })).kind, 'allow');

// 8. Admin at aal2 browsing a user route is still sent to the workspace.
expect('8  admin aal2 -> /', decideAccess(admin({ pathname: '/', currentLevel: 'aal2', nextLevel: 'aal2' })).kind, 'admin-home');

// 9. Normal flows unaffected: onboarding, suspension, signed out, demo mode.
expect('9a user with incomplete survey -> onboarding', decideAccess(user({ pathname: '/tasks', surveyCompleted: false })).kind, 'onboarding');
expect('9b suspended session -> suspended', decideAccess(user({ status: 'suspended' })).kind, 'suspended');
expect('9c no session -> login', decideAccess(user({ hasSession: false })).kind, 'login');
expect('9d admin demo mode (impersonating a user) -> app', decideAccess(user({ isDemoMode: true, pathname: '/tasks' })).kind, 'layout');
expect('9e user at aal2 on /settings/security -> app', decideAccess(user({ pathname: '/settings/security', currentLevel: 'aal2', nextLevel: 'aal2' })).kind, 'layout');

// 10. The satisfaction predicate itself.
expect('10a aal2/aal2 satisfied', String(isTwoFactorSatisfied('aal2', 'aal2')), 'true');
expect('10b aal2/aal1 not satisfied', String(isTwoFactorSatisfied('aal2', 'aal1')), 'false');
expect('10c aal1/aal2 not satisfied', String(isTwoFactorSatisfied('aal1', 'aal2')), 'false');
expect('10d null levels not satisfied', String(isTwoFactorSatisfied(null, null)), 'false');

console.log(failures === 0 ? '\nALL GUARD CHECKS PASSED' : `\n${failures} GUARD CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
