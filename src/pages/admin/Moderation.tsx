import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShieldAlert, Trash2, Search, FileText, CheckSquare, Handshake, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function Moderation() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'ideas' | 'tasks' | 'collabs'>('ideas');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  const fetchData = async () => {
    setLoading(true);
    try {
      let query;
      if (activeTab === 'ideas') {
        query = supabase.from('content_ideas').select('*').order('created_at', { ascending: false }).limit(50);
      } else if (activeTab === 'tasks') {
        query = supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(50);
      } else {
        query = supabase.from('collaborations').select('*').order('created_at', { ascending: false }).limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const items = data || [];
      
      // Fetch profiles manually to avoid foreign key join errors
      if (items.length > 0) {
        const userIds = [...new Set(items.map(item => item.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
            
          if (profiles) {
            const profileMap = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
            
            items.forEach(item => {
              if (item.user_id && profileMap[item.user_id]) {
                item.profiles = profileMap[item.user_id];
              }
            });
          }
        }
      }
      
      setItems(items);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [activeTab, profile]);

  const deleteItem = (id: string) => {
    setConfirmModal({ isOpen: true, id });
  };

  const executeDeleteItem = async () => {
    const id = confirmModal.id;
    if (!id) return;
    
    setConfirmModal({ isOpen: false, id: null });
    
    try {
      const table = activeTab === 'ideas' ? 'content_ideas' : activeTab === 'tasks' ? 'tasks' : 'collaborations';
      const { error } = await supabase.from(table).delete().eq('id', id);
      
      if (error) throw error;
      
      toast.success('Content deleted successfully');
      fetchData();
    } catch (error) {
       console.error('Error deleting item:', error);
       toast.error('Failed to delete content');
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const title = (item.title || item.title || item.brand_name || '').toLowerCase();
    const user = (item.profiles?.full_name || item.profiles?.email || '').toLowerCase();
    return title.includes(q) || user.includes(q);
  });

  if (profile?.role !== 'admin') {
    return <div className="text-white p-8">Unauthorized access.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Content Moderation</h1>
        <p className="text-gray-400">Review user-generated content, enforce guidelines, and manage reports.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
            activeTab === 'ideas' ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <FileText className="w-5 h-5" />
          Ideas
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
            activeTab === 'tasks' ? 'text-pink-400 border-pink-500 bg-pink-500/5' : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          Tasks
        </button>
        <button
          onClick={() => setActiveTab('collabs')}
          className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
            activeTab === 'collabs' ? 'text-yellow-400 border-yellow-500 bg-yellow-500/5' : 'text-gray-400 border-transparent hover:text-white'
          }`}
        >
          <Handshake className="w-5 h-5" />
          Collaborations
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-[#111] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/50 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Content</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Author</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Date</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white line-clamp-1">
                        {item.title || item.brand_name || 'Untitled'}
                      </div>
                      {(item.notes || item.description || item.collaboration_goal) && (
                        <div className="text-sm text-gray-400 line-clamp-1 mt-1">
                          {item.notes || item.description || item.collaboration_goal}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white text-sm">{item.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs">{item.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
                        {item.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Content"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={executeDeleteItem}
        title="Delete Content"
        message="Are you sure you want to delete this content? This action cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
