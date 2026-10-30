export type AdminRole = 'admin' | 'user' | null;
export type Level = 'aal1' | 'aal2' | null;

export interface AccessInput {
  configured: boolean;
  loading: boolean;
  hasSession: boolean;
  role: AdminRole;
  status: 'active' | 'suspended' | null;
  surveyCompleted: boolean;
  requireAdmin: boolean;
  pathname: string;
  isDemoMode: boolean;
  mfaLoading: boolean;
  currentLevel: Level;
  nextLevel: Level;
}

export type AccessDecision =
  | { kind: 'login' }
  | { kind: 'admin-login' }
  | { kind: 'loading' }
  | { kind: 'suspended' }
  | { kind: 'onboarding' }
  | { kind: 'home' }
  | { kind: 'mfa-enroll' }
  | { kind: 'mfa-verify' }
  | { kind: 'admin-home' }
  | { kind: 'allow' }
  | { kind: 'admin-layout' }
  | { kind: 'layout' };

export const MFA_PREFIX = '/security/mfa';

/**
 * A session satisfies two-factor only when it has actually proven the second
 * factor (currentLevel aal2) AND the account still has a verified factor
 * (nextLevel aal2). A stale aal2 session whose factor was removed elsewhere
 * reports nextLevel aal1 and is refused.
 */
export function isTwoFactorSatisfied(currentLevel: Level, nextLevel: Level) {
  return currentLevel === 'aal2' && nextLevel === 'aal2';
}

/**
 * Single source of truth for route authorization. Pure, so every case can be
 * verified without a browser; see scripts/mfa-guard-check.ts.
 */
export function decideAccess(input: AccessInput): AccessDecision {
  const onMfaRoute = input.pathname.startsWith(MFA_PREFIX);
  const onAdminLogin = input.pathname === '/admin/login';
  const isAdmin = input.role === 'admin';

  if (!input.configured) return { kind: 'login' };
  if (input.loading) return { kind: 'loading' };

  // Unauthenticated routing
  if (!input.hasSession) {
    if (onAdminLogin) return { kind: 'allow' };
    if (input.pathname.startsWith('/admin')) return { kind: 'admin-login' };
    return { kind: 'login' };
  }

  // Already authenticated on admin-login
  if (onAdminLogin) {
    if (isAdmin) {
      if (input.mfaLoading) return { kind: 'loading' };
      if (!isTwoFactorSatisfied(input.currentLevel, input.nextLevel)) {
        return { kind: input.nextLevel === 'aal2' ? 'mfa-verify' : 'mfa-enroll' };
      }
      return { kind: 'admin-home' };
    }
    return { kind: 'home' };
  }

  // Suspended account
  if (input.status === 'suspended') return { kind: 'suspended' };

  // Normal user onboarding check
  if (input.role !== null && !isAdmin && !input.surveyCompleted && input.pathname !== '/onboarding') {
    return { kind: 'onboarding' };
  }

  // Admin-only route guard
  if (input.requireAdmin && !isAdmin) return { kind: 'home' };

  // MFA setup and verify routes are restricted strictly to administrators
  if (onMfaRoute) {
    if (!isAdmin) return { kind: 'home' };
    return { kind: 'allow' };
  }

  // Administrator access requires aal2 on this session. Password-only (aal1)
  // sessions go to enrollment or to the challenge, never to the panel.
  if (isAdmin) {
    if (input.mfaLoading) return { kind: 'loading' };
    if (!isTwoFactorSatisfied(input.currentLevel, input.nextLevel)) {
      return { kind: input.nextLevel === 'aal2' ? 'mfa-verify' : 'mfa-enroll' };
    }
  }

  if (isAdmin && !input.isDemoMode && !input.pathname.startsWith('/admin')) {
    return { kind: 'admin-home' };
  }

  if (input.pathname === '/onboarding') return { kind: 'allow' };
  if (input.pathname.startsWith('/admin')) return { kind: 'admin-layout' };
  return { kind: 'layout' };
}
