import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { setPreviewUserId } from '@/lib/previewTransport';

export interface Profile {
  id: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  full_name: string | null;
  username: string | null;
  bio: string | null;
  email: string | null;
  avatar_url: string | null;
  domain_industry: string | null;
  occupation: string | null;
  day_streak: number;
  work_hours: number;
  focus_sessions: number;
  points: number;
  cover_gradient: string | null;
  theme_preference: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  survey_completed: boolean;
  can_access_tools?: boolean;
  blocked_features?: string[] | null;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  isDemoMode: boolean;
  startDemoMode: (userId: string) => Promise<void>;
  exitDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  isDemoMode: false,
  startDemoMode: async () => {},
  exitDemoMode: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const authUserId = useRef<string | null>(null);
  
  // Demo Mode state
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const previewRequest = useRef(0);

  const fetchProfile = async (userId: string, shouldApply: () => boolean = () => true) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile not found for user');
        } else {
          console.error('Error fetching profile:', error);
        }
        return;
      }

      if (shouldApply()) setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (impersonatedUserId) {
      const request = previewRequest.current;
      const { data } = await supabase.from('profiles').select('*').eq('id', impersonatedUserId).single();
      if (data && request === previewRequest.current) setImpersonatedProfile(data);
    } else if (user) {
      await fetchProfile(user.id);
    }
  };

  const startDemoMode = async (userId: string) => {
    if (profile?.role !== 'admin') throw new Error('Administrator access required');
    const request = ++previewRequest.current;
    setLoadingDemo(true);
    try {
      // Server-side audit logged and validated start of impersonation
      const { data: targetProfile, error: rpcError } = await supabase.rpc('start_impersonation', {
        p_target_user_id: userId,
      });
      if (rpcError) throw rpcError;

      const profileData = targetProfile || (await supabase.from('profiles').select('*').eq('id', userId).single()).data;
      if (!profileData) throw new Error('User profile unavailable');
      if (request !== previewRequest.current) throw new Error('Preview cancelled');

      setPreviewUserId(userId);
      setImpersonatedProfile(profileData as Profile);
      setImpersonatedUserId(userId);
    } finally {
      if (request === previewRequest.current) setLoadingDemo(false);
    }
  };

  const exitDemoMode = () => {
    const currentId = impersonatedUserId;
    ++previewRequest.current;
    setPreviewUserId(null);
    setImpersonatedUserId(null);
    setImpersonatedProfile(null);
    setLoadingDemo(false);

    if (currentId) {
      // Server-side audit logged exit of impersonation
      void supabase.rpc('end_impersonation', { p_target_user_id: currentId });
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Keep auth callbacks synchronous: Supabase emits them while holding its lock.
    // Profile queries run in the separate effect below, after this callback returns.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession) => {
      if (!mounted) return;
      const nextUserId = nextSession?.user.id ?? null;
      if (authUserId.current !== nextUserId) {
        exitDemoMode();
        setProfile(null);
        setLoading(!!nextUserId);
        authUserId.current = nextUserId;
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      setPreviewUserId(null);
      ++previewRequest.current;
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) { setProfile(null); setLoading(false); return; }
    let active = true;
    setLoading(true);
    // A macrotask also avoids re-entering the auth lock during initial session delivery.
    const timer = window.setTimeout(() => {
      void fetchProfile(user.id, () => active).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [authReady, user?.id]);

  const isDemoMode = !!impersonatedUserId;
  const activeUser = isDemoMode && user ? { ...user, id: impersonatedUserId } as User : user;
  const activeProfile = isDemoMode && impersonatedProfile ? impersonatedProfile : profile;

  return (
    <AuthContext.Provider value={{ 
      session, 
      user: activeUser, 
      profile: activeProfile, 
      loading: loading || loadingDemo, 
      refreshProfile,
      isDemoMode,
      startDemoMode,
      exitDemoMode
    }}>
      <React.Fragment key={`${activeUser?.id || 'signed-out'}:${isDemoMode}`}>
        {children}
      </React.Fragment>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
