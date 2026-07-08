import React, { useState, useEffect } from 'react';
import { Plus, ExternalLink, Image as ImageIcon, Loader2, Trash2, Search, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { Tool, ToolCategory } from '@/types';
import { toast } from 'sonner';

const CATEGORIES: ToolCategory[] = [
  'Video Editing', 'Development', 'Design', 'AI Tools', 'Gaming', 'Extensions', 'Other'
];

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [newTool, setNewTool] = useState<Partial<Tool>>({
    name: '',
    url: '',
    description: '',
    logo_url: '',
    category: 'Other'
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch tools: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMetadata = async () => {
    if (!newTool.url) {
      toast.error('Please enter a URL first');
      return;
    }

    setFetchingInfo(true);
    try {
      // Ensure the URL has a protocol
      let urlToFetch = newTool.url;
      if (!/^https?:\/\//i.test(urlToFetch)) {
        urlToFetch = 'https://' + urlToFetch;
        setNewTool(prev => ({ ...prev, url: urlToFetch }));
      }

      const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(urlToFetch)}`);
      const data = await response.json();

      if (data.status === 'success') {
        const { title, description, logo, image } = data.data;
        setNewTool(prev => ({
          ...prev,
          name: title || prev.name,
          description: description || prev.description,
          logo_url: logo?.url || image?.url || prev.logo_url
        }));
        toast.success('Metadata fetched successfully!');
      } else {
        toast.error('Could not fetch metadata for this URL.');
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      toast.error('Failed to fetch metadata. You may need to enter details manually.');
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleAddTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTool.name || !newTool.url) {
      toast.error('Please fill in at least the name and URL');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const toolData = {
        user_id: userData.user.id,
        name: newTool.name,
        url: newTool.url,
        description: newTool.description,
        logo_url: newTool.logo_url,
        category: newTool.category || 'Other'
      };

      const { data, error } = await supabase
        .from('tools')
        .insert([toolData])
        .select()
        .single();

      if (error) throw error;

      setTools([data, ...tools]);
      setIsAddModalOpen(false);
      setNewTool({ name: '', url: '', description: '', logo_url: '', category: 'Other' });
      toast.success('Tool added successfully!');
    } catch (error: any) {
      toast.error('Failed to add tool: ' + error.message);
    }
  };

  const handleDeleteTool = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;

    try {
      const { error } = await supabase
        .from('tools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTools(tools.filter(t => t.id !== id));
      toast.success('Tool deleted successfully!');
    } catch (error: any) {
      toast.error('Failed to delete tool: ' + error.message);
    }
  };

  const filteredTools = tools.filter(tool => {
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Tools</h1>
          <p className="text-zinc-400 mt-1">Manage and organize your useful resources and tools.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Tool
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 sm:pb-0 hide-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'All' ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
          >
            All
          </button>
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">No tools found</h3>
          <p className="text-zinc-400 max-w-sm mx-auto mb-6">
            {searchQuery || selectedCategory !== 'All'
              ? 'No tools match your current filters. Try adjusting your search or category.'
              : 'Keep all your important tools and resources in one place. Add your first tool to get started.'}
          </p>
          {!(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-colors"
            >
              Add Your First Tool
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900/50 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors group relative flex flex-col h-full"
            >
              <button
                onClick={() => handleDeleteTool(tool.id)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Tool"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4 mb-3">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                  {tool.logo_url ? (
                    <img src={tool.logo_url} alt={tool.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 pr-6">
                  <h3 className="font-bold text-lg leading-tight mb-1">{tool.name}</h3>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-zinc-300">
                    {tool.category}
                  </span>
                </div>
              </div>

              <p className="text-sm text-zinc-400 flex-1 line-clamp-3 mb-4">
                {tool.description || 'No description provided.'}
              </p>

              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Tool
              </a>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Tool Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-xl font-bold">Add New Tool</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddTool} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newTool.url}
                      onChange={(e) => setNewTool({ ...newTool, url: e.target.value })}
                      className="flex-1 bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                      placeholder="https://..."
                      required
                    />
                    <button
                      type="button"
                      onClick={handleFetchMetadata}
                      disabled={fetchingInfo || !newTool.url}
                      className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {fetchingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Fetch Info
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Enter a URL and click "Fetch Info" to auto-fill the details.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newTool.name}
                    onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="e.g. Figma"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Category</label>
                  <select
                    value={newTool.category}
                    onChange={(e) => setNewTool({ ...newTool, category: e.target.value as ToolCategory })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-white appearance-none"
                  >
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                  <textarea
                    value={newTool.description}
                    onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all min-h-[80px]"
                    placeholder="Brief description of the tool..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Logo URL (Optional)</label>
                  <input
                    type="url"
                    value={newTool.logo_url}
                    onChange={(e) => setNewTool({ ...newTool, logo_url: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Save Tool
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
