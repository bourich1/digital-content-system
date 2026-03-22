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
import { isSupabaseConfigured } from '@/lib/supabase';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isConfigured = isSupabaseConfigured();
  
  // If not configured, redirect to login
  if (!isConfigured) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <Router>
      <Toaster position="top-right" theme="dark" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/creators" element={
          <ProtectedRoute>
            <Creators />
          </ProtectedRoute>
        } />
        
        <Route path="/ideas" element={
          <ProtectedRoute>
            <ContentIdeas />
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
