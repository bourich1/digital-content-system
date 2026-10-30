import React, { lazy, Suspense } from 'react';
import PageMetadata from '@/components/PageMetadata';
import SecurityUpdateNotice from '@/components/SecurityUpdateNotice';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CornerRightDown } from 'lucide-react';
import { Toaster } from 'sonner';
const Layout = lazy(() => import('@/components/Layout').then(module => ({ default: module.Layout })));
const AdminLayout = lazy(() => import('@/components/AdminLayout').then(module => ({ default: module.AdminLayout })));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Login = lazy(() => import('@/pages/Login'));
const Landing = lazy(() => import('@/pages/Landing'));
const Creators = lazy(() => import('@/pages/Creators'));
const ContentIdeas = lazy(() => import('@/pages/ContentIdeas'));
const Settings = lazy(() => import('@/pages/Settings'));
const AccountSettings = lazy(() => import('@/pages/AccountSettings'));
const SecuritySettings = lazy(() => import('@/pages/SecuritySettings'));
const MfaSetup = lazy(() => import('@/pages/mfa/MfaSetup'));
const MfaVerify = lazy(() => import('@/pages/mfa/MfaVerify'));
const AdminSecurity = lazy(() => import('@/pages/admin/Security'));
const SettingsShell = lazy(() => import('@/components/SettingsShell'));
const SharedProfile = lazy(() => import('@/pages/SharedProfile'));
const Collaborations = lazy(() => import('@/pages/Collaborations'));
const Tasks = lazy(() => import('@/pages/Tasks'));
const FocusRoom = lazy(() => import('@/pages/FocusRoom'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Tools = lazy(() => import('@/pages/Tools'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const Analytics = lazy(() => import('@/pages/admin/Analytics'));
const Users = lazy(() => import('@/pages/admin/Users'));
const Moderation = lazy(() => import('@/pages/admin/Moderation'));
const Surveys = lazy(() => import('@/pages/admin/Surveys'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const Reports = lazy(() => import('@/pages/admin/Reports'));
const Support = lazy(() => import('@/pages/Support').then(module => ({ default: module.Support })));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MfaProvider, useMfa } from '@/contexts/MfaContext';
import { decideAccess } from '@/lib/adminAccess';
import { FeatureProvider, FeatureGuard } from '@/contexts/FeatureContext';

// Protected Route Wrapper
const GateScreen = () => <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const isConfigured = isSupabaseConfigured();
  const { session, profile, loading, isDemoMode } = useAuth();
  const { loading: mfaLoading, currentLevel, nextLevel } = useMfa();
  const location = useLocation();

  // Every authorization decision lives in decideAccess() so it can be verified
  // without a browser; see scripts/mfa-guard-check.ts.
  const decision = decideAccess({
    configured: isConfigured,
    loading,
    hasSession: !!session,
    role: profile?.role ?? null,
    status: profile?.status ?? null,
    surveyCompleted: !!profile?.survey_completed,
    requireAdmin,
    pathname: location.pathname,
    isDemoMode,
    mfaLoading,
    currentLevel,
    nextLevel,
  });
  
  if (decision.kind === 'login') {
    return <Navigate to="/login" replace />;
  }

  if (decision.kind === 'loading') {
    return <GateScreen />;
  }

  if (decision.kind === 'suspended') {
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

  if (decision.kind === 'onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (decision.kind === 'home') {
    return <Navigate to="/" replace />;
  }

  if (decision.kind === 'mfa-enroll') {
    return <Navigate to="/security/mfa/setup" replace state={{ from: location.pathname }} />;
  }

  if (decision.kind === 'mfa-verify') {
    return <Navigate to="/security/mfa/verify" replace state={{ from: location.pathname }} />;
  }

  if (decision.kind === 'admin-home') {
    return <Navigate to="/admin" replace />;
  }

  if (decision.kind === 'allow') {
    return <>{children}</>;
  }

  if (decision.kind === 'admin-layout') {
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
      
      <Route path="/u/:username" element={<SharedProfile />} />
      <Route path="/settings/security" element={<ProtectedRoute><SettingsShell><SecuritySettings /></SettingsShell></ProtectedRoute>} />
      <Route path="/security/mfa/setup" element={<ProtectedRoute><MfaSetup /></ProtectedRoute>} />
      <Route path="/security/mfa/verify" element={<ProtectedRoute><MfaVerify /></ProtectedRoute>} />
      
      <Route path="/settings/account" element={<ProtectedRoute><SettingsShell><AccountSettings /></SettingsShell></ProtectedRoute>} />
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
          <SettingsShell><Settings /></SettingsShell>
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
      
      <Route path="/admin/security" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminSecurity />
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
      <MfaProvider>
      <FeatureProvider>
        <Router>
          <Toaster position="top-right" theme="dark" />
          <PageMetadata />
          <SecurityUpdateNotice />
          <Suspense fallback={<div role="status" className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
            <AppRoutes />
          </Suspense>
        </Router>
      </FeatureProvider>
      </MfaProvider>
    </AuthProvider>
  );
}
