import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, Filter, X, Loader2, Eye, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { ContentIdea, IdeaStatus } from '@/types';
import { generateId, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const statuses: IdeaStatus[] = ['Idea', 'Script', 'Filmed', 'Edited', 'Ready', 'Posted'];

const getFaviconUrl = (url?: string) => {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (e) {
    return null;
  }
};

export default function ContentIdeas() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localIdeasToMigrate, setLocalIdeasToMigrate] = useState<ContentIdea[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    fetchIdeas();
    checkLocalIdeas();
  }, []);

  const checkLocalIdeas = () => {
    try {
      const saved = localStorage.getItem('content_circle_ideas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalIdeasToMigrate(parsed);
        }
      }
    } catch (e) {
      console.error('Error parsing local ideas', e);
    }
  };

  const migrateLocalIdeas = async () => {
    if (!isSupabaseConfigured() || localIdeasToMigrate.length === 0) return;
    
    setIsMigrating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const ideasToInsert = localIdeasToMigrate.map(idea => ({
        user_id: userData.user.id,
        title: idea.title,
        status: idea.status,
        source_url: idea.source_url,
        notes: idea.notes,
        created_at: idea.created_at || new Date().toISOString()
      }));

      const { error } = await supabase
        .from('content_ideas')
        .insert(ideasToInsert);

      if (error) throw error;

      toast.success(`${ideasToInsert.length} ideas migrated successfully!`);
      localStorage.removeItem('content_circle_ideas');
      setLocalIdeasToMigrate([]);
      fetchIdeas();
    } catch (err: any) {
      toast.error(err.message || 'Failed to migrate ideas');
    } finally {
      setIsMigrating(false);
    }
  };

  const fetchIdeas = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data if Supabase isn't configured
      const saved = localStorage.getItem('content_circle_ideas');
      if (saved) setIdeas(JSON.parse(saved));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('content_ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIdeas(data || []);
    } catch (err: any) {
      toast.error('Failed to load ideas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null);

  // View State
  const [viewingIdea, setViewingIdea] = useState<ContentIdea | null>(null);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<ContentIdea>>({
    title: '',
    status: 'Idea',
    source_url: '',
    notes: ''
  });

  const handleOpenModal = (idea?: ContentIdea) => {
    if (idea) {
      setEditingIdea(idea);
      setFormData(idea);
    } else {
      setEditingIdea(null);
      setFormData({ title: '', status: 'Idea', source_url: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!isSupabaseConfigured()) {
      // Fallback for local storage if no supabase
      let updatedIdeas = [];
      if (editingIdea) {
        updatedIdeas = ideas.map(i => i.id === editingIdea.id ? { ...i, ...formData } as ContentIdea : i);
        toast.success('Idea updated locally');
      } else {
        const newIdea = { id: generateId(), ...formData as Omit<ContentIdea, 'id'>, created_at: new Date().toISOString() };
        updatedIdeas = [newIdea, ...ideas];
        toast.success('Idea created locally');
      }
      setIdeas(updatedIdeas);
      localStorage.setItem('content_circle_ideas', JSON.stringify(updatedIdeas));
      setIsSubmitting(false);
      setIsModalOpen(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      if (editingIdea) {
        const { error } = await supabase
          .from('content_ideas')
          .update({
            title: formData.title,
            status: formData.status,
            source_url: formData.source_url,
            notes: formData.notes
          })
          .eq('id', editingIdea.id);

        if (error) throw error;
        toast.success('Idea updated successfully');
      } else {
        const { error } = await supabase
          .from('content_ideas')
          .insert([{
            user_id: userData.user.id,
            title: formData.title,
            status: formData.status,
            source_url: formData.source_url,
            notes: formData.notes
          }]);

        if (error) throw error;
        toast.success('Idea created successfully');
      }
      
      await fetchIdeas();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setIdeaToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!ideaToDelete) return;

    if (!isSupabaseConfigured()) {
      const updatedIdeas = ideas.filter(i => i.id !== ideaToDelete);
      setIdeas(updatedIdeas);
      localStorage.setItem('content_circle_ideas', JSON.stringify(updatedIdeas));
      setIdeaToDelete(null);
      setIsDeleteModalOpen(false);
      toast.success('Idea deleted locally');
      return;
    }

    try {
      const { error } = await supabase
        .from('content_ideas')
        .delete()
        .eq('id', ideaToDelete);

      if (error) throw error;
      
      setIdeaToDelete(null);
      setIsDeleteModalOpen(false);
      toast.success('Idea deleted successfully');
      await fetchIdeas();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete idea');
    }
  };

  const filteredIdeas = ideas.filter(i => {
    const matchesSearch = i.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Main Content Area */}
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-3xl font-bold text-white">Content Ideas</h2>
            <p className="text-zinc-400 mt-1">Track your production workflow.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              New Idea
            </Button>
          </div>
        </div>

        <div className="flex gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search ideas..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="h-10 rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as IdeaStatus | 'All')}
          >
            <option value="All">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Migration Banner */}
        {localIdeasToMigrate.length > 0 && isSupabaseConfigured() && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-orange-400 font-medium">Local ideas found</h4>
              <p className="text-sm text-zinc-400 mt-1">
                We found {localIdeasToMigrate.length} ideas saved in your browser that aren't in your database yet.
              </p>
            </div>
            <Button 
              onClick={migrateLocalIdeas} 
              disabled={isMigrating}
              className="whitespace-nowrap bg-orange-600 hover:bg-orange-700"
            >
              {isMigrating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isMigrating ? 'Moving...' : 'Move to Database'}
            </Button>
          </div>
        )}

        {/* Kanban-ish List */}
        <div className="space-y-3 pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500 mr-2" />
              Loading ideas...
            </div>
          ) : (
            <AnimatePresence>
              {filteredIdeas.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                  <p>No ideas found. Start creating!</p>
                </div>
              ) : (
                filteredIdeas.map((idea) => (
                  <motion.div
                    key={idea.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleOpenModal(idea)}
                    className="group cursor-pointer"
                  >
                    <Card hoverEffect className="py-4 px-5 flex items-center justify-between border-l-4 border-l-transparent hover:border-l-orange-500 transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          {idea.source_url && getFaviconUrl(idea.source_url) && (
                            <img 
                              src={getFaviconUrl(idea.source_url)!} 
                              alt="Source Icon" 
                              className="w-5 h-5 rounded-sm bg-white/10 object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <h3 className="font-medium text-white group-hover:text-orange-300 transition-colors">{idea.title}</h3>
                          <Badge status={idea.status}>{idea.status}</Badge>
                        </div>
                        {idea.notes && (
                          <p className="text-sm text-zinc-500 line-clamp-1">{idea.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-blue-400 hover:text-blue-300"
                          onClick={(e) => { e.stopPropagation(); setViewingIdea(idea); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-zinc-400 hover:text-white"
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(idea); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-400 hover:text-red-300"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(idea.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewingIdea && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Idea Details</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setViewingIdea(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{viewingIdea.title}</h3>
                    <Badge status={viewingIdea.status}>{viewingIdea.status}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Notes / Script</label>
                    <div className="p-4 rounded-xl bg-zinc-950/50 border border-white/5 text-zinc-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                      {viewingIdea.notes || "No notes added."}
                    </div>
                  </div>

                  {viewingIdea.source_url && (
                    <div className="pt-4 border-t border-white/5">
                      <a 
                        href={viewingIdea.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                      >
                        {getFaviconUrl(viewingIdea.source_url) ? (
                          <img 
                            src={getFaviconUrl(viewingIdea.source_url)!} 
                            alt="" 
                            className="w-4 h-4 rounded-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                        View Source
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <CardTitle>Delete Idea?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 mb-6">
                    Are you sure you want to delete this idea? This action cannot be undone.
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

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-lg"
            >
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{editingIdea ? 'Edit Idea' : 'New Idea'}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input 
                      label="Title" 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      required 
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {statuses.map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormData({...formData, status: s})}
                            className={cn(
                              "px-2 py-2 rounded-lg text-xs font-medium border transition-all",
                              formData.status === s 
                                ? "bg-orange-600 border-orange-500 text-white" 
                                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input 
                      label="Source URL (Optional)" 
                      value={formData.source_url} 
                      onChange={e => setFormData({...formData, source_url: e.target.value})}
                      placeholder="https://..."
                    />
                    <Textarea 
                      label="Notes / Script" 
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="min-h-[150px]"
                    />
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                        ) : (
                          editingIdea ? 'Save Changes' : 'Create Idea'
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
