import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Creators from '@/pages/Creators';
import ContentIdeas from '@/pages/ContentIdeas';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// Protected Route Wrapper
const ProtectedRoute = ({ children, session }: { children: React.ReactNode, session: Session | null }) => {
  const isConfigured = isSupabaseConfigured();
  
  if (!isConfigured) {
    return <Navigate to="/login" replace />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default function App() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <Router>
      <Toaster position="top-right" theme="dark" />
      <Routes>
        <Route path="/login" element={
          session ? <Navigate to="/" replace /> : <Login />
        } />
        
        <Route path="/" element={
          <ProtectedRoute session={session}>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/creators" element={
          <ProtectedRoute session={session}>
            <Creators />
          </ProtectedRoute>
        } />
        
        <Route path="/ideas" element={
          <ProtectedRoute session={session}>
            <ContentIdeas />
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute session={session}>
            <Analytics />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute session={session}>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
