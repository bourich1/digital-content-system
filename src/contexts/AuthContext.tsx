import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  
  // Demo Mode state
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const fetchProfile = async (userId: string) => {
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

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (impersonatedUserId) {
      const { data } = await supabase.from('profiles').select('*').eq('id', impersonatedUserId).single();
      if (data) setImpersonatedProfile(data);
    } else if (user) {
      await fetchProfile(user.id);
    }
  };

  const startDemoMode = async (userId: string) => {
    setLoadingDemo(true);
    setImpersonatedUserId(userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setImpersonatedProfile(data);
      }
    } catch (error) {
      console.error('Failed to start demo mode:', error);
    }
    setLoadingDemo(false);
  };

  const exitDemoMode = () => {
    setImpersonatedUserId(null);
    setImpersonatedProfile(null);
  };

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // --- Demo Mode Fetch Interceptor ---
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [resource, config] = args;
      const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : '';
      const method = config?.method || (resource instanceof Request ? resource.method : 'GET');
      
      // If we are in demo mode and trying to mutate data via Supabase API
      if (impersonatedUserId && url.includes('.supabase.co') && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase())) {
        toast.error('Action blocked: You are in Demo Mode (Read-Only)');
        // Return a dummy successful-looking response to prevent the app from crashing,
        // or a 403. Let's return a 403 to trigger standard error handling.
        return new Response(JSON.stringify({ message: 'Read-only mode' }), { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      return originalFetch(...args);
    };

    // ── 1. Single source of truth for initial session recovery ──
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          return fetchProfile(session.user.id);
        }
      })
      .catch((error: any) => {
        console.error('Session recovery failed:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // ── 2. Listen for FUTURE auth changes only ──
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (!mounted) return;

      // IMPORTANT: getSession() already handles the INITIAL_SESSION event.
      // Skipping it prevents double-fetching the profile and avoids
      // race conditions with the getSession().then() above.
      if (event === 'INITIAL_SESSION') return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.fetch = originalFetch; // Restore original fetch
    };
  }, [impersonatedUserId]);

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
      {children}
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
