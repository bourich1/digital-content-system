import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Activity, Users, FileText, CheckSquare, Handshake, Monitor, Smartphone } from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];

export default function Analytics() {
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    ideas: 0,
    tasks: 0,
    collabs: 0,
    reports: 0
  });

  const [weeklyEngagement, setWeeklyEngagement] = useState<any[]>([]);
  const [featureUsage, setFeatureUsage] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAnalytics();
    }
  }, [profile]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch exact counts
      const [
        { count: usersCount },
        { count: ideasCount },
        { count: tasksCount },
        { count: collabsCount },
        { count: reportsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('content_ideas').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('collaborations').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true })
      ]);

      const currentStats = {
        users: usersCount || 0,
        ideas: ideasCount || 0,
        tasks: tasksCount || 0,
        collabs: collabsCount || 0,
        reports: reportsCount || 0
      };

      setStats(currentStats);

      // Feature Usage Pie Chart Data
      setFeatureUsage([
        { name: 'Ideas', value: currentStats.ideas },
        { name: 'Tasks', value: currentStats.tasks },
        { name: 'Collabs', value: currentStats.collabs },
        { name: 'Reports', value: currentStats.reports }
      ].filter(item => item.value > 0)); // Only show features that have > 0 items

      // Weekly Engagement (Mocking the trend based on total users for now, or we could fetch created_at if we want real time-series)
      // To get real time-series, we would query the last 7 days of users/content.
      // For simplicity, we'll fetch recently created ideas to build a small trend.
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentIdeas } = await supabase
        .from('content_ideas')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());
        
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const trendMap: Record<string, number> = {};
      
      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        trendMap[days[d.getDay()]] = 0;
      }
      
      if (recentIdeas) {
        recentIdeas.forEach(idea => {
          const dayName = days[new Date(idea.created_at).getDay()];
          if (trendMap[dayName] !== undefined) {
            trendMap[dayName]++;
          }
        });
      }
      
      setWeeklyEngagement(Object.entries(trendMap).map(([name, active]) => ({ name, active })));

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return <div className="text-white p-8">Unauthorized access.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Platform Analytics</h1>
        <p className="text-gray-400">Deep dive into real platform usage and content metrics.</p>
      </div>

      {loading ? (
        <div className="text-white">Loading analytics data...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Total Users</h3>
                <Users className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-white">{stats.users}</p>
              </div>
            </div>

            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Content Ideas</h3>
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-white">{stats.ideas}</p>
              </div>
            </div>

            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Total Tasks</h3>
                <CheckSquare className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-white">{stats.tasks}</p>
              </div>
            </div>

            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-400">Collaborations</h3>
                <Handshake className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-white">{stats.collabs}</p>
              </div>
            </div>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Trend */}
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <h3 className="text-xl font-semibold text-white mb-6">New Content Ideas (Last 7 Days)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyEngagement} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#666" tick={{fill: '#888'}} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="active" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Feature Usage Pie Chart */}
            <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
              <h3 className="text-xl font-semibold text-white mb-6">Data Distribution</h3>
              <div className="h-80 w-full flex items-center justify-center">
                {featureUsage.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={featureUsage}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name} (${value})`}
                        labelLine={false}
                      >
                        {featureUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500">No data available yet</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
