import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CornerRightDown } from 'lucide-react';
import { Toaster } from 'sonner';
import { Layout } from '@/components/Layout';
import { AdminLayout } from '@/components/AdminLayout';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Landing from '@/pages/Landing';
import Creators from '@/pages/Creators';
import ContentIdeas from '@/pages/ContentIdeas';
import Settings from '@/pages/Settings';
import Collaborations from '@/pages/Collaborations';
import Tasks from '@/pages/Tasks';
import FocusRoom from '@/pages/FocusRoom';
import Calendar from '@/pages/Calendar';
import Tools from '@/pages/Tools';
import Onboarding from '@/pages/Onboarding';
import AdminDashboard from '@/pages/AdminDashboard';
import Analytics from '@/pages/admin/Analytics';
import Users from '@/pages/admin/Users';
import Moderation from '@/pages/admin/Moderation';
import Surveys from '@/pages/admin/Surveys';
import AdminSettings from '@/pages/admin/Settings';
import Reports from '@/pages/admin/Reports';
import { Support } from '@/pages/Support';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FeatureProvider, FeatureGuard } from '@/contexts/FeatureContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const isConfigured = isSupabaseConfigured();
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  
  if (!isConfigured) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        {/* @ts-ignore - Lord icon web component */}
        <lord-icon
            src="https://cdn.lordicon.com/wdbwxkvh.json"
            trigger="morph"
            state="morph-stop"
            colors="primary:#ffffff,secondary:#ffffff"
            style={{ width: '250px', height: '250px' }}>
        </lord-icon>
        
        <h1 className="text-3xl font-bold text-red-500 mb-4 mt-6">Account Suspended / تم إيقاف الحساب</h1>
        <div className="text-gray-400 text-center max-w-md mb-8 space-y-4">
          <p>
            Your account has been suspended due to suspicious activity or a violation of our policies. Please contact support using the widget below to resolve the issue.
          </p>
          <p dir="rtl" className="text-lg font-medium">
            تم إيقاف حسابك لقيامك بنشاط مشبوه أو لمخالفة سياستنا. يرجى التواصل مع الدعم الفني عبر المحادثة أدناه لحل المشكلة.
          </p>
        </div>
        
        <div className="absolute bottom-28 right-8 animate-bounce hidden md:flex items-center gap-4 text-orange-500">
          <span className="font-semibold text-lg">Contact Support</span>
          <CornerRightDown className="w-10 h-10" />
        </div>
        
        <button
          onClick={async () => {
            if (isSupabaseConfigured()) {
              await supabase.auth.signOut();
            }
            window.location.href = '/';
          }}
          className="mt-6 bg-orange-600 hover:bg-orange-500 cursor-pointer text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-orange-600/20"
        >
          Return to Home Page
        </button>
      </div>
    );
  }

  // Force onboarding if not completed, not an admin, and not currently on the onboarding page
  if (profile && profile.role !== 'admin' && !profile.survey_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Admin only routes
  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Prevent admin from accessing normal user routes, UNLESS in demo mode
  const { isDemoMode } = useAuth();
  if (profile?.role === 'admin' && !location.pathname.startsWith('/admin') && !isDemoMode) {
    return <Navigate to="/admin" replace />;
  }

  // Don't render layout for onboarding
  if (location.pathname === '/onboarding') {
    return <>{children}</>;
  }

  if (location.pathname.startsWith('/admin')) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={
        session ? <Navigate to="/" replace /> : <Login />
      } />
      
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      } />

      <Route path="/" element={
        session ? (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ) : (
          <Landing />
        )
      } />
      
      <Route path="/creators" element={
        <ProtectedRoute>
          <FeatureGuard feature="creators">
            <Creators />
          </FeatureGuard>
        </ProtectedRoute>
      } />
      
      <Route path="/ideas" element={
        <ProtectedRoute>
          <FeatureGuard feature="ideas">
            <ContentIdeas />
          </FeatureGuard>
        </ProtectedRoute>
      } />
      
      <Route path="/collaborations" element={
        <ProtectedRoute>
          <FeatureGuard feature="collaboration">
            <Collaborations />
          </FeatureGuard>
        </ProtectedRoute>
      } />

      <Route path="/calendar" element={
        <ProtectedRoute>
          <FeatureGuard feature="calendar">
            <Calendar />
          </FeatureGuard>
        </ProtectedRoute>
      } />

      <Route path="/tasks" element={
        <ProtectedRoute>
          <FeatureGuard feature="tasks">
            <Tasks />
          </FeatureGuard>
        </ProtectedRoute>
      } />

      <Route path="/focus" element={
        <ProtectedRoute>
          <FeatureGuard feature="focus_room">
            <FocusRoom />
          </FeatureGuard>
        </ProtectedRoute>
      } />

      <Route path="/tools" element={
        <ProtectedRoute>
          <FeatureGuard feature="ai_assistant">
            <Tools />
          </FeatureGuard>
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="/support" element={
        <ProtectedRoute>
          <Support />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/tools" element={
        <ProtectedRoute requireAdmin={true}>
          <Tools />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/analytics" element={
        <ProtectedRoute requireAdmin={true}>
          <Analytics />
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute requireAdmin={true}>
          <Users />
        </ProtectedRoute>
      } />

      <Route path="/admin/moderation" element={
        <ProtectedRoute requireAdmin={true}>
          <Moderation />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/surveys" element={
        <ProtectedRoute requireAdmin={true}>
          <Surveys />
        </ProtectedRoute>
      } />

      <Route path="/admin/settings" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminSettings />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/reports" element={
        <ProtectedRoute requireAdmin={true}>
          <Reports />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/support" element={
        <ProtectedRoute requireAdmin={true}>
          <Support />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/*" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FeatureProvider>
        <Router>
          <Toaster position="top-right" theme="dark" />
          <AppRoutes />
        </Router>
      </FeatureProvider>
    </AuthProvider>
  );
}
