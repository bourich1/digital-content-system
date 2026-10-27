import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Lightbulb, 
  BarChart2, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Sparkles,
  Handshake,
  Volume2,
  ListTodo,
  Timer,
  Calendar as CalendarIcon,
  Wrench,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { Shield } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { SupportChatWidget } from './SupportChatWidget';
import './Sidebar.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try { return localStorage.getItem('boostd-sidebar-hidden') === 'true'; }
    catch { return false; }
  });
  const toggleSidebar = () => setSidebarHidden(hidden => {
    const next = !hidden;
    try { localStorage.setItem('boostd-sidebar-hidden', String(next)); } catch { /* Storage can be disabled. */ }
    return next;
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isDemoMode, exitDemoMode } = useAuth();
  
  const isSupportPage = location.pathname === '/support';
  const isFocusPage = location.pathname === '/focus';

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false);

    // Flush all Supabase session state from storage so a full reload
    // boots into a clean AuthProvider with no stale session.
    Object.keys(localStorage)
      .filter(key => key.startsWith('sb-'))
      .forEach(key => localStorage.removeItem(key));

    // signOut can throw AbortError in StrictMode (double-invocation lock conflict).
    // Fire it and forget – we've already wiped storage so the session is dead anyway.
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});

    // Full hard reload – clears in-memory Supabase client state + React state
    window.location.href = window.location.origin + '/login';
  };

  // Notification Logic
  useEffect(() => {
    const checkNotifications = async () => {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      }

      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const { data: collabs, error } = await supabase
          .from('collaborations')
          .select('id, brand_name, posting_date')
          .in('posting_date', [todayStr, tomorrowStr]);

        if (error || !collabs) return;

        const notified = JSON.parse(localStorage.getItem('notified_collabs') || '{}');
        let updatedNotified = { ...notified };

        collabs.forEach(collab => {
          const isToday = collab.posting_date === todayStr;
          const status = isToday ? 'today' : 'tomorrow';
          const notificationKey = `${collab.id}_${status}`;

          if (!notified[notificationKey]) {
            new Notification(`Upcoming Collaboration!`, {
              body: `Reminder: You have a collaboration with ${collab.brand_name} scheduled for ${isToday ? 'Today' : 'Tomorrow'}.`,
              icon: '/icon white.png'
            });
            updatedNotified[notificationKey] = true;
          }
        });

        localStorage.setItem('notified_collabs', JSON.stringify(updatedNotified));
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    };

    checkNotifications();
  }, []);

  const { features } = useFeatures();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', feature: null },
    { icon: Users, label: 'Creators', path: '/creators', feature: 'creators' },
    { icon: Lightbulb, label: 'Content Ideas', path: '/ideas', feature: 'ideas' },
    { icon: Handshake, label: 'Collaborations', path: '/collaborations', feature: 'collaboration' },
    { icon: CalendarIcon, label: 'Calendar', path: '/calendar', feature: 'calendar' },
    { icon: Timer, label: 'Focus Room', path: '/focus', feature: 'focus_room' },
    { icon: Wrench, label: 'Tools', path: '/tools', feature: 'ai_assistant' },
    { icon: Settings, label: 'Settings', path: '/settings', feature: null },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      {isDemoMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500/90 text-white px-4 py-2 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="font-medium">
              Demo Mode Active: Viewing as {profile?.full_name || profile?.email || 'User'} (Read-Only)
            </span>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => {
              exitDemoMode();
              navigate('/admin/users');
            }}
            className="bg-white/20 hover:bg-white/30 border-none text-white shadow-none"
          >
            Exit Demo Mode
          </Button>
        </div>
      )}
      
      {/* Desktop Sidebar */}
      <aside id="desktop-sidebar" className={cn("boostd-sidebar hidden md:flex flex-col border-r border-white/10 bg-zinc-950/50 backdrop-blur-xl fixed h-full z-10", sidebarHidden && "is-collapsed")}>
        <button type="button" onClick={toggleSidebar} aria-label={sidebarHidden ? 'Expand sidebar' : 'Collapse sidebar'} aria-controls="desktop-sidebar" aria-expanded={!sidebarHidden} title={sidebarHidden ? 'Expand sidebar' : 'Collapse sidebar'} className="sidebar-toggle rounded-lg p-2 text-zinc-500 hover:text-orange-400 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-orange-400">{sidebarHidden ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
        <div className="sidebar-brand">
          <img src="/logo white.png" alt="BoostD" className="sidebar-full-logo" />
          <img src="/icon white.png" alt="" aria-hidden="true" className="sidebar-mini-logo" />
        </div>

        <nav className="sidebar-links flex-1 space-y-2" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              title={sidebarHidden ? item.label : undefined}
              
              className={({ isActive }) =>
                cn(
                  "sidebar-link flex items-center rounded-xl text-sm font-medium",
                  isActive
                    ? "bg-white/10 text-white shadow-sm border border-white/5"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer border-t border-white/10 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="sidebar-link justify-start text-zinc-500 hover:text-red-400 hover:bg-red-500/10 w-full"
            aria-label="Sign Out"
            title={sidebarHidden ? 'Sign Out' : undefined}
            onClick={handleLogoutClick}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="sidebar-label">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/logo white.png" alt="BoostD" className="h-7 w-auto max-w-[140px] object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell placement="bottom" />
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 top-16 bg-zinc-950 z-40 p-4"
          >
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-zinc-400"
                    )
                  }
                >
                  <item.icon className="w-6 h-6" />
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium text-red-400 w-full text-left"
              >
                <LogOut className="w-6 h-6" />
                Sign Out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-w-0 p-4 md:p-8 pt-20 md:pt-6 min-h-screen overflow-x-hidden flex flex-col",
        "sidebar-main", sidebarHidden && "sidebar-main-collapsed",
        isDemoMode && "mt-12",
        isSupportPage && "p-0 md:p-0 pt-16 md:pt-0",
        isFocusPage && "focus-layout-main"
      )}>
        {/* Desktop Top Bar */}
        {!isSupportPage && (
          <div className={cn("hidden md:flex justify-end max-w-7xl mx-auto w-full mb-6 relative z-50", isFocusPage && "focus-layout-notifications")}>
            <NotificationBell placement="bottom" />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn("w-full", isFocusPage ? "focus-layout-content" : !isSupportPage ? "max-w-7xl mx-auto space-y-8" : "h-[calc(100vh-4rem)] md:h-screen")}
        >
          {children}
        </motion.div>
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsLogoutModalOpen(false)}>
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Sign Out?</h3>
              <p className="text-zinc-400 mb-6">
                Are you sure you want to sign out of your account?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="px-5 py-2.5 rounded-xl font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!isSupportPage && <SupportChatWidget />}
    </div>
  );
};
