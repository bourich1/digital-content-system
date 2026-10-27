import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Users, 
  Lightbulb, 
  Brain, 
  FileText, 
  Video, 
  Clapperboard, 
  CheckCircle2, 
  SendHorizonal, 
  ListTodo, 
  Handshake, 
  Circle, 
  ArrowRight, 
  Plus, 
  CheckCircle,
  Clock,
  Briefcase,
  DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Creator, ContentIdea, IdeaStatus, Collaboration } from '@/types';
import { DailyQuoteBanner } from '@/components/DailyQuoteBanner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

const STATUS_ICONS: Record<IdeaStatus, typeof Brain> = {
  Idea: Brain,
  Script: FileText,
  Filmed: Video,
  Edited: Clapperboard,
  Ready: CheckCircle2,
  Posted: SendHorizonal,
};

const STATUS_COLORS: Record<IdeaStatus, string> = {
  Idea: '#a78bfa',
  Script: '#60a5fa',
  Filmed: '#f59e0b',
  Edited: '#10b981',
  Ready: '#06b6d4',
  Posted: '#ec4899',
};

const STATUS_ORDER: IdeaStatus[] = ['Idea', 'Script', 'Filmed', 'Edited', 'Ready', 'Posted'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    // 1. Load Creators
    const savedCreators = localStorage.getItem('content_circle_creators');
    if (savedCreators) {
      try {
        setCreators(JSON.parse(savedCreators));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Load Ideas (Supabase or LocalStorage fallback)
    if (isSupabaseConfigured()) {
      try {
        const { data: ideasData } = await supabase
          .from('content_ideas')
          .select('*')
          .order('created_at', { ascending: false });
        if (ideasData && ideasData.length > 0) {
          setIdeas(ideasData);
        } else {
          const savedIdeas = localStorage.getItem('content_circle_ideas');
          if (savedIdeas) setIdeas(JSON.parse(savedIdeas));
        }
      } catch (e) {
        const savedIdeas = localStorage.getItem('content_circle_ideas');
        if (savedIdeas) setIdeas(JSON.parse(savedIdeas));
      }
    } else {
      const savedIdeas = localStorage.getItem('content_circle_ideas');
      if (savedIdeas) setIdeas(JSON.parse(savedIdeas));
    }

    // 3. Load Tasks (Supabase or LocalStorage fallback)
    if (isSupabaseConfigured()) {
      try {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        if (tasksData) {
          setTasks(tasksData);
        }
      } catch (e) {
        const mockTasks = localStorage.getItem('mock_tasks');
        if (mockTasks) setTasks(JSON.parse(mockTasks));
      }
    } else {
      const mockTasks = localStorage.getItem('mock_tasks');
      if (mockTasks) {
        setTasks(JSON.parse(mockTasks));
      } else {
        const initialTasks: Task[] = [
          { id: '1', title: 'Record vlog intro', is_completed: false, created_at: new Date().toISOString() },
          { id: '2', title: 'Reply to sponsor email', is_completed: true, created_at: new Date().toISOString() }
        ];
        setTasks(initialTasks);
        localStorage.setItem('mock_tasks', JSON.stringify(initialTasks));
      }
    }

    // 4. Load Collaborations (Supabase or LocalStorage fallback)
    if (isSupabaseConfigured()) {
      try {
        const { data: collabsData } = await supabase
          .from('collaborations')
          .select('*')
          .order('created_at', { ascending: false });
        if (collabsData) {
          setCollaborations(collabsData);
        }
      } catch (e) {
        console.error('Error fetching collaborations:', e);
      }
    }

    setLoading(false);
  };

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t));

    if (!isSupabaseConfigured()) {
      const updated = tasks.map(t => t.id === taskId ? { ...t, is_completed: newStatus } : t);
      localStorage.setItem('mock_tasks', JSON.stringify(updated));
      toast.success(newStatus ? 'Task completed!' : 'Task uncompleted');
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_completed: newStatus })
        .eq('id', taskId);
      if (error) throw error;
      toast.success(newStatus ? 'Task completed!' : 'Task marked as pending');
    } catch (error: any) {
      toast.error('Failed to update task: ' + error.message);
      // Revert state on error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: currentStatus } : t));
    }
  };

  const statusCounts = STATUS_ORDER.map(status => ({
    name: status,
    value: ideas.filter(i => i.status === status).length,
    color: STATUS_COLORS[status],
  }));

  const totalIdeas = ideas.length;
  const totalCreators = creators.length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => !t.is_completed);
  const completedTasksCount = tasks.filter(t => t.is_completed).length;
  const totalCollaborations = collaborations.length;
  const activeCollaborations = collaborations.filter(c => c.status !== 'completed' && c.status !== 'posted');

  const statCards = [
    { 
      title: 'Content Ideas', 
      value: totalIdeas,
      subtitle: `${ideas.filter(i => i.status === 'Ready' || i.status === 'Posted').length} Ready / Posted`,
      icon: Lightbulb, 
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      link: '/ideas'
    },
    { 
      title: 'Pending Tasks', 
      value: pendingTasks.length,
      subtitle: `${completedTasksCount} of ${totalTasks} completed`,
      icon: ListTodo, 
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      badge: pendingTasks.length > 0 ? `${pendingTasks.length} To Do` : 'All Done',
      badgeColor: pendingTasks.length > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400',
      link: '/tasks'
    },
    { 
      title: 'Collaborations', 
      value: totalCollaborations,
      subtitle: `${activeCollaborations.length} Active Deals`,
      icon: Handshake, 
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      badge: totalCollaborations > 0 ? `${totalCollaborations} Total` : 'None',
      badgeColor: 'bg-blue-500/20 text-blue-400',
      link: '/collaborations'
    },
    { 
      title: 'Creators Network', 
      value: totalCreators, 
      subtitle: 'Profiles in directory',
      icon: Users, 
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      link: '/creators'
    },
  ];

  return (
    <div className="space-y-8">
      <DailyQuoteBanner />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-zinc-400 mt-1">Welcome back to your centralized content &amp; task overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <ListTodo className="w-4 h-4 text-orange-400" />
            Manage Tasks
          </button>
          <button 
            onClick={() => navigate('/collaborations')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-sm font-medium text-white shadow-lg shadow-orange-600/20 transition-colors cursor-pointer"
          >
            <Handshake className="w-4 h-4" />
            Collaborations
          </button>
        </div>
      </div>

      {/* Stats Grid (4 Cards: Ideas, Pending Tasks, Collaborations, Creators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={() => navigate(stat.link)}
            className="cursor-pointer"
          >
            <Card hoverEffect className={`border ${stat.border} transition-all duration-200 hover:scale-[1.02]`}>
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{stat.title}</p>
                    <h3 className="text-3xl font-extrabold text-white mt-1.5">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">{stat.subtitle}</span>
                  {stat.badge ? (
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${stat.badgeColor}`}>
                      {stat.badge}
                    </span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Two Widgets: Pending Tasks & Recent Collaborations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Widget 1: Pending Tasks (المهام غير المنجزة) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">Pending Tasks</CardTitle>
                  <p className="text-xs text-zinc-400">Tasks waiting to be completed ({pendingTasks.length})</p>
                </div>
              </div>
              <Link 
                to="/tasks" 
                className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">All caught up!</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">You have completed all your tasks. Great job staying on top of your workflow.</p>
                  <Button 
                    onClick={() => navigate('/tasks')}
                    size="sm"
                    className="mt-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add New Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        <button
                          onClick={() => toggleTaskCompletion(task.id, task.is_completed)}
                          className="text-zinc-500 hover:text-orange-400 transition-colors cursor-pointer flex-shrink-0"
                          title="Click to mark as done"
                        >
                          <Circle className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-zinc-200 truncate group-hover:text-white">
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 flex-shrink-0 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}

                  {pendingTasks.length > 5 && (
                    <div className="text-center pt-2">
                      <Link to="/tasks" className="text-xs text-zinc-400 hover:text-white underline underline-offset-2">
                        + {pendingTasks.length - 5} more pending tasks
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Widget 2: Collaborations Summary (التعاونات والشراكات) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="h-full flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Handshake className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">Brand Collaborations</CardTitle>
                  <p className="text-xs text-zinc-400">Sponsorships &amp; partnerships ({totalCollaborations})</p>
                </div>
              </div>
              <Link 
                to="/collaborations" 
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              {collaborations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">No collaborations yet</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">Track your sponsorships, brand deals, and creator partnerships in one place.</p>
                  <Button 
                    onClick={() => navigate('/collaborations')}
                    size="sm"
                    className="mt-4 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Collaboration
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {collaborations.slice(0, 5).map((collab) => (
                    <div
                      key={collab.id}
                      onClick={() => navigate('/collaborations')}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {collab.brand_image ? (
                          <img src={collab.brand_image} alt={collab.brand_name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0">
                            {collab.brand_name?.charAt(0) || 'B'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                            {collab.brand_name}
                          </p>
                          <p className="text-[11px] text-zinc-400 capitalize">
                            {collab.deal_type} • {collab.platform || 'General'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {collab.budget > 0 && (
                          <span className="text-xs font-semibold text-emerald-400 font-mono">
                            ${collab.budget}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                          collab.status === 'completed' || collab.status === 'posted'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : collab.status === 'accepted'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {collab.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {collaborations.length > 5 && (
                    <div className="text-center pt-2">
                      <Link to="/collaborations" className="text-xs text-zinc-400 hover:text-white underline underline-offset-2">
                        + {collaborations.length - 5} more collaborations
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Ideas Breakdown & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Ideas by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {totalIdeas === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-zinc-500">No ideas yet. Start creating!</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusCounts.filter(s => s.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusCounts.filter(s => s.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any, name: any) => [value, name]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value: string) => (
                          <span className="text-zinc-400 text-xs">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Breakdown - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Status Counts</CardTitle>
            </CardHeader>
            <CardContent>
              {totalIdeas === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-zinc-500">No data to display.</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusCounts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#666" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                        {statusCounts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Status Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {statusCounts.map((status) => {
                const Icon = STATUS_ICONS[status.name as IdeaStatus];
                return (
                  <div
                    key={status.name}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Icon className="w-5 h-5" style={{ color: status.color }} />
                    <span className="text-2xl font-bold text-white">{status.value}</span>
                    <span className="text-xs text-zinc-500">{status.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
