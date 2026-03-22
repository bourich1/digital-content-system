import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, ExternalLink, Trash2, Edit2, Youtube, Instagram, Twitter, Video, Eye, X } from 'lucide-react';
import { Creator, Platform } from '@/types';
import { generateId } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// Mock data
const initialCreators: Creator[] = [];

export default function Creators() {
  const [creators, setCreators] = useState<Creator[]>(() => {
    const saved = localStorage.getItem('content_circle_creators');
    return saved ? JSON.parse(saved) : initialCreators;
  });

  useEffect(() => {
    localStorage.setItem('content_circle_creators', JSON.stringify(creators));
  }, [creators]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  
  // View State
  const [viewingCreator, setViewingCreator] = useState<Creator | null>(null);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [creatorToDelete, setCreatorToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Creator>>({
    name: '',
    platform: 'YouTube',
    profile_url: '',
    description: ''
  });

  const handleOpenModal = (creator?: Creator) => {
    if (creator) {
      setEditingCreator(creator);
      setFormData(creator);
    } else {
      setEditingCreator(null);
      setFormData({ name: '', platform: 'YouTube', profile_url: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleViewCreator = (creator: Creator) => {
    setViewingCreator(creator);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCreator) {
      setCreators(creators.map(c => c.id === editingCreator.id ? { ...c, ...formData } as Creator : c));
      toast.success('Creator updated successfully');
    } else {
      const newCreator: Creator = {
        id: generateId(),
        ...formData as Omit<Creator, 'id'>
      };
      setCreators([newCreator, ...creators]);
      toast.success('Creator added successfully');
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setCreatorToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (creatorToDelete) {
      setCreators(creators.filter(c => c.id !== creatorToDelete));
      setCreatorToDelete(null);
      setIsDeleteModalOpen(false);
      toast.success('Creator deleted successfully');
    }
  };

  const filteredCreators = creators.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'YouTube': return <Youtube className="w-5 h-5 text-red-500" />;
      case 'Instagram': return <Instagram className="w-5 h-5 text-pink-500" />;
      case 'X': return <Twitter className="w-5 h-5 text-blue-400" />;
      case 'TikTok': return <Video className="w-5 h-5 text-black dark:text-white" />;
      default: return <ExternalLink className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Creators</h2>
          <p className="text-zinc-400 mt-1">Manage your inspiration sources.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Creator
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input 
          placeholder="Search creators..." 
          className="pl-10 max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredCreators.map((creator) => (
            <motion.div
              key={creator.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card hoverEffect className="h-full flex flex-col">
                <CardContent className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
                        {getPlatformIcon(creator.platform)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{creator.name}</h3>
                        <p className="text-xs text-zinc-500">{creator.platform}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => handleViewCreator(creator)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => handleOpenModal(creator)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleDeleteClick(creator.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-zinc-300 line-clamp-3">
                    {creator.description}
                  </p>
                  
                  <div className="pt-4 mt-auto">
                    <a 
                      href={creator.profile_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                    >
                      Visit Profile <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewingCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Creator Details</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setViewingCreator(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                      {getPlatformIcon(viewingCreator.platform)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{viewingCreator.name}</h3>
                      <Badge className="mt-1">{viewingCreator.platform}</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Description</label>
                    <p className="text-zinc-300 leading-relaxed">
                      {viewingCreator.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <a 
                      href={viewingCreator.profile_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Profile
                    </a>
                  </div>
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
                  <CardTitle>Delete Creator?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 mb-6">
                    Are you sure you want to delete this creator? This action cannot be undone.
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

      {/* Modal */}
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
                  <CardTitle>{editingCreator ? 'Edit Creator' : 'Add New Creator'}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                    <Trash2 className="w-4 h-4 rotate-45" /> {/* Using Trash icon rotated as X for simplicity, or just import X */}
                  </Button>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input 
                      label="Creator Name" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required 
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Platform</label>
                      <select 
                        className="flex h-10 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        value={formData.platform}
                        onChange={e => setFormData({...formData, platform: e.target.value as Platform})}
                      >
                        <option value="YouTube">YouTube</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">TikTok</option>
                        <option value="X">X (Twitter)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <Input 
                      label="Profile URL" 
                      value={formData.profile_url} 
                      onChange={e => setFormData({...formData, profile_url: e.target.value})}
                      placeholder="https://..."
                    />
                    <Textarea 
                      label="Description" 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Why does this creator inspire you?"
                    />
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                      <Button type="submit">{editingCreator ? 'Save Changes' : 'Add Creator'}</Button>
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
