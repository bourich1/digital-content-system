import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, CalendarDays, User, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import './Profile.css';

export default function AccountSettings() {
  const { user, profile, isDemoMode } = useAuth();
  const email = isDemoMode ? profile?.email : user?.email;
  const joined = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not available';
  return <div className="profile-account-page"><span className="profile-section-label">ACCOUNT SETTINGS</span><h1>Account</h1><p>Your account details, in one place.</p><section className="profile-account-card"><h2>Quick information</h2><div><span><Mail size={18} />Email address</span><strong>{email || 'Not available'}</strong></div><div><span><CalendarDays size={18} />Joined BoostD</span><strong>{joined}</strong></div><div><span><User size={18} />Username</span><strong>@{profile?.username || 'not set'}</strong></div><Link to="/settings?edit=true">Edit profile details<ArrowUpRight size={14} /></Link></section></div>;
}

