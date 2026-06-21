import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Lightbulb, Brain, FileText, Video, Clapperboard, CheckCircle2, SendHorizonal } from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Creator, ContentIdea, IdeaStatus } from '@/types';

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
  const [creators, setCreators] = useState<Creator[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);

  useEffect(() => {
    const savedCreators = localStorage.getItem('content_circle_creators');
    const savedIdeas = localStorage.getItem('content_circle_ideas');
    if (savedCreators) setCreators(JSON.parse(savedCreators));
    if (savedIdeas) setIdeas(JSON.parse(savedIdeas));
  }, []);

  const statusCounts = STATUS_ORDER.map(status => ({
    name: status,
    value: ideas.filter(i => i.status === status).length,
    color: STATUS_COLORS[status],
  }));

  const totalIdeas = ideas.length;
  const totalCreators = creators.length;

  const statCards = [
    { 
      title: 'Total Creators', 
      value: totalCreators, 
      icon: Users, 
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    { 
      title: 'Total Ideas', 
      value: totalIdeas, 
      icon: Lightbulb, 
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-zinc-400 mt-1">Overview of your content pipeline.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hoverEffect>
              <CardContent className="p-0 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400 font-medium">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-white mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Ideas Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
                        formatter={(value: number, name: string) => [value, name]}
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
          transition={{ delay: 0.3 }}
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
