import '@/pages/admin/AdminWorkspace.css';
import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  ShieldAlert, 
  ClipboardList, 
  Trophy, 
  ToggleLeft, 
  Megaphone, 
  AlertTriangle, 
  Activity, 
  HeartPulse, 
  Settings,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Wrench,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem("boostd-admin-collapsed") === "true"; } catch { return false; } });
  const toggleSidebar = () => setCollapsed(value => { try { localStorage.setItem("boostd-admin-collapsed", String(!value)); } catch {} return !value; });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();

  const location = useLocation();
  const isSupportPage = location.pathname === '/admin/support';

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false);
    Object.keys(localStorage)
      .filter(key => key.startsWith('sb-'))
      .forEach(key => localStorage.removeItem(key));
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    window.location.href = window.location.origin + '/login';
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
    { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
    { icon: Users, label: 'User Management', path: '/admin/users' },
    { icon: ShieldAlert, label: 'Content Moderation', path: '/admin/moderation' },
    { icon: AlertTriangle, label: 'Reports', path: '/admin/reports' },
    { icon: Wrench, label: 'Manage Tools', path: '/admin/tools' },
    { icon: ToggleLeft, label: 'Feature Flags', path: '/admin/settings' },
    { icon: ClipboardList, label: 'Survey Analytics', path: '/admin/surveys' },
    { icon: MessageSquare, label: 'Support Inbox', path: '/admin/support' },
    { icon: ShieldCheck, label: 'Security', path: '/admin/security' },
  ];

  return (
    <div className={cn("admin-workspace min-h-screen bg-[#0a0a0a] text-white flex", collapsed && "admin-is-collapsed")}>
      {/* Desktop Sidebar */}
      <aside className="admin-sidebar hidden md:flex flex-col border-r border-gray-800 bg-[#111] fixed h-full z-10">
        <button className="admin-collapse" aria-label={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"} aria-expanded={!collapsed} onClick={toggleSidebar}>{collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}</button>
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <img src={collapsed ? "/icon white.png" : "/logo white.png"} alt="BoostD" className="admin-brand w-[150px] h-[60px] object-contain" />
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="admin-section-label">WORKSPACE</div>
          {navItems.map((item,index) => (
            <React.Fragment key={item.path}>{[2,5,7].includes(index) && <div className="admin-section-label">{index === 2 ? "COMMUNITY" : index === 5 ? "PLATFORM" : "INSIGHTS & SUPPORT"}</div>}
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-orange-500/10 text-orange-400"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="admin-nav-label">{item.label}</span></NavLink></React.Fragment>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white overflow-hidden shrink-0">
               {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogoutClick}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#111] border-b border-gray-800 flex items-center justify-between px-4 z-20">
        <img src="/logo white.png" alt="BoostD" className="w-[100px] h-[40px] object-contain" />
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="md:hidden fixed inset-y-0 left-0 w-[280px] bg-[#111] border-r border-gray-800 z-40 flex flex-col"
          >
            <div className="p-6 flex items-center justify-between border-b border-gray-800">
              <img src="/logo white.png" alt="BoostD" className="w-[120px] h-[48px] object-contain" />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Management</div>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200",
                      isActive
                        ? "bg-orange-500/10 text-orange-400"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )
                  }
                >
                  <item.icon className="w-6 h-6" />
                  {item.label}</NavLink>
          ))}
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-red-400 w-full text-left"
              >
                <LogOut className="w-6 h-6" />
                Sign Out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`admin-main flex-1 min-w-0 min-h-screen overflow-x-hidden ${isSupportPage ? '' : 'p-4 md:p-8 pt-20 md:pt-8'}`}>
        {!isSupportPage && <div className="admin-topbar"><span>ADMIN WORKSPACE <b>/</b> {navItems.find(item => item.path === location.pathname)?.label || 'Overview'}</span><div><i/>Administrator</div></div>}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={isSupportPage ? 'h-screen w-full' : 'max-w-7xl mx-auto space-y-8'}
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
    </div>
  );
};
