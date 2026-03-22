import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2 } from 'lucide-react';
import { AnalyticsData } from '@/types';
import { generateId } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// Mock data
const initialData: AnalyticsData[] = [];

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData[]>(() => {
    const saved = localStorage.getItem('content_circle_analytics');
    return saved ? JSON.parse(saved) : initialData;
  });

  useEffect(() => {
    localStorage.setItem('content_circle_analytics', JSON.stringify(data));
  }, [data]);

  const [isAdding, setIsAdding] = useState(false);
  const [newData, setNewData] = useState<Partial<AnalyticsData>>({
    video_title: '',
    views: 0,
    likes: 0,
    comments: 0,
    date: new Date().toISOString().split('T')[0]
  });

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState<string | null>(null);

  const handleAddData = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: AnalyticsData = {
      id: generateId(),
      ...newData as Omit<AnalyticsData, 'id'>
    };
    setData([...data, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setIsAdding(false);
    setNewData({ video_title: '', views: 0, likes: 0, comments: 0, date: new Date().toISOString().split('T')[0] });
    toast.success('Analytics entry added successfully');
  };

  const handleDeleteClick = (id: string) => {
    setDataToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (dataToDelete) {
      setData(data.filter(d => d.id !== dataToDelete));
      setDataToDelete(null);
      setIsDeleteModalOpen(false);
      toast.success('Analytics entry deleted successfully');
    }
  };

  // Calculate stats
  const totalViews = data.reduce((acc, curr) => acc + Number(curr.views), 0);
  const avgViews = Math.round(totalViews / data.length) || 0;
  
  // Prepare chart data
  const chartData = data.map(d => ({
    name: d.video_title.substring(0, 10) + '...',
    views: d.views,
    engagement: d.likes + d.comments,
    date: d.date
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Analytics</h2>
          <p className="text-zinc-400 mt-1">Track your content performance.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Data
        </Button>
      </div>

      {/* Add Data Form */}
      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6">
              <form onSubmit={handleAddData} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2">
                  <Input 
                    label="Video Title" 
                    value={newData.video_title} 
                    onChange={e => setNewData({...newData, video_title: e.target.value})}
                    required
                  />
                </div>
                <Input 
                  label="Views" 
                  type="number" 
                  value={newData.views} 
                  onChange={e => setNewData({...newData, views: Number(e.target.value)})}
                />
                <Input 
                  label="Likes" 
                  type="number" 
                  value={newData.likes} 
                  onChange={e => setNewData({...newData, likes: Number(e.target.value)})}
                />
                <Button type="submit">Save Entry</Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Total Views</p>
            <h3 className="text-3xl font-bold text-white mt-1">{(totalViews / 1000).toFixed(1)}K</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Average Views</p>
            <h3 className="text-3xl font-bold text-white mt-1">{(avgViews / 1000).toFixed(1)}K</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-400">Total Videos</p>
            <h3 className="text-3xl font-bold text-white mt-1">{data.length}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Views Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="views" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorViews2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement (Likes + Comments)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{fill: '#ffffff10'}}
                />
                <Bar dataKey="engagement" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-zinc-400">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Likes</th>
                  <th className="px-4 py-3 text-right">Comments</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 font-medium text-white">{row.video_title}</td>
                    <td className="px-4 py-3 text-right">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{row.likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{row.comments.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteClick(row.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm"
            >
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>Delete Entry?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 mb-6">
                    Are you sure you want to delete this analytics entry? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
