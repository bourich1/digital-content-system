import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type AssuranceLevel = 'aal1' | 'aal2';

export interface VerifiedFactor {
  id: string;
  friendlyName: string;
  createdAt: string;
}

interface MfaContextType {
  /** True while the current session's assurance level is being evaluated. */
  loading: boolean;
  /** Assurance level actually proven by this session. */
  currentLevel: AssuranceLevel | null;
  /** Highest level this account could reach with the factors it has enrolled. */
  nextLevel: AssuranceLevel | null;
  /** Verified TOTP factors only. Unverified/incomplete enrolments are excluded. */
  factors: VerifiedFactor[];
  /** The account has a verified factor, so a challenge is possible. */
  enrolled: boolean;
  /** This session has satisfied two-factor: current == aal2 and next == aal2. */
  satisfied: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY = {
  loading: true,
  currentLevel: null,
  nextLevel: null,
  factors: [] as VerifiedFactor[],
  enrolled: false,
  satisfied: false,
  error: null as string | null,
};

const MfaContext = createContext<MfaContextType>({ ...EMPTY, refresh: async () => {} });

const IDLE = { ...EMPTY, loading: false };

/**
 * Assurance level always comes from the authenticated Supabase session, never
 * from localStorage, a React boolean, or anything a client can set. Every
 * evaluation fails closed: if the level or factor list cannot be read, the
 * account is treated as unverified.
 */
export function MfaProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [state, setState] = useState<Omit<MfaContextType, 'refresh'>>(EMPTY);
  const requestId = useRef(0);

  const evaluate = useCallback(async () => {
    const request = ++requestId.current;

    if (!session) {
      if (request === requestId.current) setState(IDLE);
      return;
    }

    try {
      const [aal, list] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (request !== requestId.current) return;
      if (aal.error || list.error) throw aal.error || list.error;

      const factors = (list.data?.all ?? [])
        .filter(factor => factor.factor_type === 'totp' && factor.status === 'verified')
        .map(factor => ({
          id: factor.id,
          friendlyName: factor.friendly_name || 'Authenticator app',
          createdAt: factor.created_at,
        }));

      const currentLevel = (aal.data?.currentLevel ?? 'aal1') as AssuranceLevel;
      const nextLevel = (aal.data?.nextLevel ?? 'aal1') as AssuranceLevel;

      setState({
        loading: false,
        currentLevel,
        nextLevel,
        factors,
        // A stale aal2 session (factor removed elsewhere) reports nextLevel aal1
        // and is deliberately not treated as enrolled or satisfied.
        enrolled: nextLevel === 'aal2' && factors.length > 0,
        satisfied: currentLevel === 'aal2' && nextLevel === 'aal2',
        error: null,
      });
    } catch {
      if (request !== requestId.current) return;
      setState({ ...IDLE, error: 'Could not confirm your two-factor status.' });
    }
  }, [session]);

  useEffect(() => {
    // Re-evaluated on sign in, token refresh, user update, MFA verification and
    // sign out, because all of them replace the session object.
    void evaluate();
  }, [evaluate]);

  return <MfaContext.Provider value={{ ...state, refresh: evaluate }}>{children}</MfaContext.Provider>;
}

export const useMfa = () => useContext(MfaContext);
