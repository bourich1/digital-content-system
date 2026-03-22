import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Users, Lightbulb, Eye, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data for demo
const mockChartData = [];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCreators: 0,
    activeIdeas: 0,
    totalViews: '0',
    engagementRate: '0%'
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-zinc-400 mt-1">Welcome back, Creator.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Inspiration Creators', value: stats.totalCreators, icon: Users, color: 'text-blue-400' },
          { title: 'Active Ideas', value: stats.activeIdeas, icon: Lightbulb, color: 'text-yellow-400' },
          { title: 'Total Views', value: stats.totalViews, icon: Eye, color: 'text-emerald-400' },
          { title: 'Engagement', value: stats.engagementRate, icon: TrendingUp, color: 'text-purple-400' },
        ].map((stat, index) => (
          <Card key={index} hoverEffect>
            <CardContent className="p-0 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400 font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Views Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="views" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500">No recent activity.</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-500/20">
            <CardContent className="flex items-start gap-4">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <ArrowUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-400">Growth Insight</h4>
                <p className="text-sm text-emerald-200/70 mt-1">
                  Not enough data to generate insights yet.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
