import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, Activity, FileText, Database, Handshake, ListTodo, Timer, Calendar as CalendarIcon, Sparkles, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalIdeas: 0,
    totalCreators: 0,
    totalCollabs: 0,
    totalTasks: 0,
    totalFocus: 0, // Placeholder
    totalCalendar: 0, // Placeholder
    totalAI: 0 // Placeholder
  });

  // Mock data for charts since we need historical data
  const userGrowthData = [
    { name: 'Jan', users: 400 },
    { name: 'Feb', users: 600 },
    { name: 'Mar', users: 850 },
    { name: 'Apr', users: 1200 },
    { name: 'May', users: 1600 },
    { name: 'Jun', users: 2100 },
    { name: 'Jul', users: 2800 },
  ];

  const featureUsageData = [
    { name: 'Ideas', usage: 4500 },
    { name: 'Tasks', usage: 8200 },
    { name: 'Collabs', usage: 1200 },
    { name: 'Focus', usage: 3400 },
    { name: 'Calendar', usage: 2100 },
    { name: 'AI', usage: 6700 },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      // Basic stats
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: activeUsersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active');
      const { count: ideasCount } = await supabase.from('content_ideas').select('*', { count: 'exact', head: true });
      const { count: creatorsCount } = await supabase.from('creators').select('*', { count: 'exact', head: true });
      const { count: collabsCount } = await supabase.from('collaborations').select('*', { count: 'exact', head: true });
      const { count: tasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
      const { count: focusCount } = await supabase.from('focus_sessions').select('*', { count: 'exact', head: true });
      const { count: calendarCount } = await supabase.from('calendar_events').select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: usersCount || 0,
        activeUsers: activeUsersCount || 0,
        totalIdeas: ideasCount || 0,
        totalCreators: creatorsCount || 0,
        totalCollabs: collabsCount || 0,
        totalTasks: tasksCount || 0,
        totalFocus: focusCount || 0,
        totalCalendar: calendarCount || 0,
        totalAI: 0 // No AI table yet
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile]);

  if (profile?.role !== 'admin') {
    return <div className="text-white p-8">Unauthorized access.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
        <p className="text-gray-400">High-level KPIs and analytics across the SaaS platform.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white">
          Loading dashboard...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Total Users</h3>
                <Users className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Active Users</h3>
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.activeUsers}</p>
            </div>
            
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Total Ideas</h3>
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalIdeas}</p>
            </div>
            
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Collaborations</h3>
                <Handshake className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalCollabs}</p>
            </div>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Total Tasks</h3>
                <ListTodo className="w-5 h-5 text-pink-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalTasks}</p>
            </div>
            
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Focus Sessions</h3>
                <Timer className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalFocus}</p>
            </div>
            
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Calendar Events</h3>
                <CalendarIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalCalendar}</p>
            </div>
            
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">AI Requests</h3>
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalAI}</p>
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
               <h3 className="text-xl font-semibold text-white mb-6">User Growth</h3>
               <div className="h-80 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={userGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                     <defs>
                       <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                     <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                     <YAxis stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                     <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                        itemStyle={{ color: '#8b5cf6' }}
                     />
                     <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
               <h3 className="text-xl font-semibold text-white mb-6">Feature Usage</h3>
               <div className="h-80 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={featureUsageData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                     <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                     <YAxis stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                     <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                        cursor={{fill: '#222'}}
                     />
                     <Bar dataKey="usage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
