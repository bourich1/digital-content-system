import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Collaboration, CollaborationStatus, DealType, CollabPlatform } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, ExternalLink, Trash2, Edit2, Eye, X, Handshake, Briefcase, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export default function Collaborations() {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaboration | null>(null);
  
  const [viewingCollab, setViewingCollab] = useState<Collaboration | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [collabToDelete, setCollabToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Collaboration>>({
    brand_name: '',
    brand_image: '',
    deal_type: 'paid',
    status: 'new',
    platform: 'instagram',
    content_type: 'post',
    videos_count: 1,
    posting_date: '',
    budget: 0,
    notes: ''
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // Partner Search State
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [partnerSearchResults, setPartnerSearchResults] = useState<any[]>([]);
  const [isSearchingPartner, setIsSearchingPartner] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Add User icon to imports if missing, but we'll use a placeholder if avatar is null


  useEffect(() => {
    fetchCollaborations();
  }, []);

  const fetchCollaborations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error } = await supabase
        .from('collaborations')
        .select('*, partner:profiles!partner_id(username, full_name, avatar_url), sender:profiles!user_id(username, full_name, avatar_url)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollaborations(data || []);
    } catch (error: any) {
      toast.error('Failed to load collaborations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchPartners = async (query: string) => {
    setPartnerSearchQuery(query);
    if (query.trim().length < 2) {
      setPartnerSearchResults([]);
      return;
    }
    
    setIsSearchingPartner(true);
    try {
      const { data, error } = await supabase.rpc('search_users_by_username', { search_query: query });
      if (error) throw error;
      setPartnerSearchResults(data || []);
    } catch (error) {
      console.error('Error searching partners:', error);
    } finally {
      setIsSearchingPartner(false);
    }
  };

  const handlePartnerResponse = async (collabId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase.rpc('respond_to_collaboration', {
        collab_id: collabId,
        response_status: status
      });

      if (error) throw error;
      toast.success(`Collaboration ${status} successfully.`);
      fetchCollaborations();
    } catch (error: any) {
      toast.error('Error updating status: ' + error.message);
    }
  };

  const handleOpenModal = (collab?: Collaboration) => {
    setPartnerSearchQuery('');
    setPartnerSearchResults([]);
    if (collab) {
      setEditingCollab(collab);
      setFormData({
        ...collab,
        posting_date: collab.posting_date ? new Date(collab.posting_date).toISOString().split('T')[0] : '',
        collab_type: collab.partner_id ? 'influencer' : 'brand'
      });
      if (collab.partner) {
        setSelectedPartner({ id: collab.partner_id, ...collab.partner });
      } else {
        setSelectedPartner(null);
      }
    } else {
      setEditingCollab(null);
      setSelectedPartner(null);
      setFormData({
        brand_name: '',
        brand_image: '',
        deal_type: 'paid',
        status: 'new',
        platform: 'instagram',
        content_type: 'post',
        videos_count: 1,
        posting_date: '',
        budget: 0,
        notes: '',
        partner_id: undefined,
        collab_type: 'brand'
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `collaborations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('collaboration_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('collaboration_images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, brand_image: publicUrl }));
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Make sure the "collaboration_images" storage bucket exists.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Remove generated/computed columns from payload
      const payload = { ...formData };
      delete payload.id;
      delete payload.remaining_amount;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.partner; // Don't try to insert the partner object
      delete payload.collab_type; // collab_type is UI state, inferred from partner_id

      if (formData.collab_type === 'influencer' && selectedPartner) {
        payload.brand_name = selectedPartner.full_name || selectedPartner.username;
        payload.brand_image = selectedPartner.avatar_url || '';
      }

      if (selectedPartner) {
        payload.partner_id = selectedPartner.id;
      } else {
        payload.partner_id = null as any;
      }

      if (editingCollab) {
        const { error } = await supabase
          .from('collaborations')
          .update(payload)
          .eq('id', editingCollab.id);
        if (error) throw error;
        toast.success('Collaboration updated successfully');
      } else {
        const { error } = await supabase
          .from('collaborations')
          .insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;
        toast.success('Collaboration added successfully');
      }
      setIsModalOpen(false);
      fetchCollaborations();
    } catch (error: any) {
      toast.error('Error saving collaboration: ' + error.message);
    }
  };

  const handleDeleteClick = (id: string) => {
    setCollabToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (collabToDelete) {
      try {
        const { error } = await supabase
          .from('collaborations')
          .delete()
          .eq('id', collabToDelete);
        if (error) throw error;
        toast.success('Collaboration deleted successfully');
        fetchCollaborations();
      } catch (error: any) {
        toast.error('Failed to delete collaboration: ' + error.message);
      } finally {
        setCollabToDelete(null);
        setIsDeleteModalOpen(false);
      }
    }
  };

  const filteredCollabs = collaborations.filter(c => 
    c.brand_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Collaborations</h2>
          <p className="text-zinc-400 mt-1">Manage your brand and creator partnerships.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Collaboration
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input 
          placeholder="Search collaborations by brand..." 
          className="pl-10 max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-white">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredCollabs.map((collab) => (
              <motion.div
                key={collab.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card hoverEffect className={`h-full flex flex-col transition-all ${collab.partner ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)] bg-orange-950/5' : ''}`}>
                  <CardContent className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      {collab.partner_status === 'accepted' ? (
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-3 shrink-0">
                            {/* Sender Avatar */}
                            {collab.sender?.avatar_url ? (
                              <img src={collab.sender.avatar_url} className="w-12 h-12 rounded-xl object-cover border-2 border-orange-500/50 relative z-10 bg-zinc-900 shadow-[0_0_10px_rgba(249,115,22,0.3)]" />
                            ) : (
                               <div className="w-12 h-12 rounded-xl bg-zinc-800 border-2 border-orange-500/50 relative z-10 flex items-center justify-center text-zinc-400 shadow-[0_0_10px_rgba(249,115,22,0.3)]"><User className="w-6 h-6"/></div>
                            )}
                            {/* Partner Avatar */}
                            {collab.partner?.avatar_url ? (
                              <img src={collab.partner.avatar_url} className="w-12 h-12 rounded-xl object-cover border-2 border-yellow-500/50 relative z-0 bg-zinc-900 shadow-[0_0_10px_rgba(234,179,8,0.3)]" />
                            ) : (
                               <div className="w-12 h-12 rounded-xl bg-zinc-800 border-2 border-yellow-500/50 relative z-0 flex items-center justify-center text-zinc-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]"><User className="w-6 h-6"/></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white truncate max-w-[150px]">Collaboration</h3>
                            <p className="text-xs font-medium text-orange-400 truncate max-w-[150px]">{collab.sender?.username || 'You'} × {collab.partner?.username}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {collab.brand_image ? (
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                              <img src={collab.brand_image} alt={collab.brand_name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5 text-orange-400 shrink-0">
                              <Handshake className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-white truncate max-w-[150px]">{collab.brand_name}</h3>
                            <p className="text-xs text-zinc-500 uppercase">{collab.deal_type}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Partner Tag */}
                      {collab.partner && (
                        <div className="flex flex-col gap-2 mt-3 p-3 rounded-lg bg-black/20 border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {collab.partner.avatar_url ? (
                                <img src={collab.partner.avatar_url} alt={collab.partner.username} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                                  <User className="w-3 h-3" />
                                </div>
                              )}
                              <span className="text-xs font-medium text-orange-200">
                                with <span className="text-orange-400">@{collab.partner.username}</span>
                              </span>
                            </div>
                            
                            {/* Status Badge for Sender */}
                            {currentUser?.id === collab.user_id && collab.partner_status === 'pending' && (
                              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Pending Approval</Badge>
                            )}
                            {currentUser?.id === collab.user_id && collab.partner_status === 'declined' && (
                              <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Declined</Badge>
                            )}
                            {collab.partner_status === 'accepted' && (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Accepted</Badge>
                            )}
                          </div>

                          {/* Action Buttons for Receiver */}
                          {currentUser?.id === collab.partner_id && collab.partner_status === 'pending' && (
                            <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                              <Button 
                                size="sm" 
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white h-7 text-xs"
                                onClick={() => handlePartnerResponse(collab.id, 'accepted')}
                              >
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 border-white/10 hover:bg-white/5 h-7 text-xs"
                                onClick={() => handlePartnerResponse(collab.id, 'declined')}
                              >
                                Decline
                              </Button>
                            </div>
                          )}
                          
                          {/* Declined status for Receiver */}
                          {currentUser?.id === collab.partner_id && collab.partner_status === 'declined' && (
                            <div className="mt-1 text-xs text-red-400 font-medium">You declined this collaboration.</div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-1 mt-4 md:mt-0 absolute right-4 top-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300 bg-black/20" onClick={() => setViewingCollab(collab)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white bg-black/20" onClick={() => handleOpenModal(collab)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 bg-black/20" onClick={() => handleDeleteClick(collab.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    
                    <div className="flex gap-2 flex-wrap mt-2">
                      <Badge variant="secondary" className="bg-white/5">{collab.status}</Badge>
                      <Badge variant="secondary" className="bg-white/5">{collab.platform} {collab.content_type}</Badge>
                      {collab.videos_count > 1 && (
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-400">x{collab.videos_count}</Badge>
                      )}
                    </div>
                    {collab.posting_date && (
                      <p className="text-xs text-zinc-400 mt-2 font-medium">📅 Date: {new Date(collab.posting_date).toLocaleDateString()}</p>
                    )}

                    <p className="text-sm text-zinc-300 line-clamp-2">
                      {collab.notes || "No notes."}
                    </p>
                    
                    <div className="pt-4 mt-auto border-t border-white/5 flex justify-between items-center">
                       <div className="text-sm font-medium text-white">
                         ${collab.budget || 0}
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            {filteredCollabs.length === 0 && (
              <div className="col-span-full py-10 text-center text-zinc-500">
                No collaborations found.
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

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
                  <CardTitle>Delete Collaboration?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 mb-6">
                    Are you sure you want to delete this collaboration? This action cannot be undone.
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

      {/* View Modal */}
      <AnimatePresence>
        {viewingCollab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Collaboration Details</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setViewingCollab(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    {viewingCollab.brand_image ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                        <img src={viewingCollab.brand_image} alt={viewingCollab.brand_name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/10 text-orange-400 shrink-0">
                        <Briefcase className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white">{viewingCollab.brand_name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge>{viewingCollab.deal_type}</Badge>
                        <Badge variant="secondary">{viewingCollab.status}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Platform</label>
                      <p className="text-white capitalize">{viewingCollab.platform}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Budget</label>
                      <p className="text-white">${viewingCollab.budget || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Notes</label>
                    <div className="p-4 rounded-xl bg-zinc-950/50 border border-white/5 text-zinc-300 whitespace-pre-wrap">
                      {viewingCollab.notes || "No notes."}
                    </div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-lg my-8"
            >
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-zinc-900 z-10 border-b border-white/5">
                  <CardTitle>{editingCollab ? 'Edit Collaboration' : 'Add Collaboration'}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Collab Type Toggle */}
                    <div className="flex p-1 bg-zinc-950/50 rounded-xl border border-white/5 mb-6">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, collab_type: 'brand'})}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                          formData.collab_type !== 'influencer' 
                            ? 'bg-zinc-800 text-white shadow-sm' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        Brand Collab
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, collab_type: 'influencer'})}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                          formData.collab_type === 'influencer' 
                            ? 'bg-orange-500 text-white shadow-sm' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        Influencer Collab
                      </button>
                    </div>

                    {formData.collab_type !== 'influencer' ? (
                      <>
                        <Input 
                          label="Brand Name" 
                          value={formData.brand_name} 
                          onChange={e => setFormData({...formData, brand_name: e.target.value})}
                          required 
                        />
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-400">Brand Image</label>
                          <div className="flex gap-3">
                            <Input 
                              placeholder="Paste image URL here..." 
                              value={formData.brand_image || ''} 
                              onChange={e => setFormData({...formData, brand_image: e.target.value})}
                              className="flex-1"
                            />
                            <div className="relative">
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploadingImage}
                              />
                              <Button type="button" variant="secondary" className="whitespace-nowrap" disabled={uploadingImage}>
                                {uploadingImage ? 'Uploading...' : 'Upload File'}
                              </Button>
                            </div>
                          </div>
                          {formData.brand_image && (
                            <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-black/50">
                              <img src={formData.brand_image} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Deal Type</label>
                        <select 
                          className="flex h-10 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          value={formData.deal_type}
                          onChange={e => setFormData({...formData, deal_type: e.target.value as DealType})}
                        >
                          <option value="paid">Paid</option>
                          <option value="creator">Creator</option>
                          <option value="affiliate">Affiliate</option>
                          <option value="services">Services</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Status</label>
                        <select 
                          className="flex h-10 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as CollaborationStatus})}
                        >
                          <option value="new">New</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="accepted">Accepted</option>
                          <option value="filming">Filming</option>
                          <option value="editing">Editing</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="posted">Posted</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Platform</label>
                        <select 
                          className="flex h-10 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          value={formData.platform}
                          onChange={e => setFormData({...formData, platform: e.target.value as CollabPlatform})}
                        >
                          <option value="instagram">Instagram</option>
                          <option value="tiktok">TikTok</option>
                          <option value="youtube">YouTube</option>
                          <option value="facebook">Facebook</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="x">X</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Content Type</label>
                        <select 
                          className="flex h-10 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          value={formData.content_type}
                          onChange={e => setFormData({...formData, content_type: e.target.value as any})}
                        >
                          <option value="story">Story</option>
                          <option value="reel">Reel</option>
                          <option value="video">Video</option>
                          <option value="post">Post</option>
                          <option value="carousel">Carousel</option>
                          <option value="short">Short</option>
                        </select>
                      </div>
                      
                      <Input 
                        label="Quantity (How many?)" 
                        type="number"
                        min={1}
                        value={formData.videos_count} 
                        onChange={e => setFormData({...formData, videos_count: Number(e.target.value)})}
                      />

                      <Input 
                        label="Target Date" 
                        type="date"
                        value={formData.posting_date} 
                        onChange={e => setFormData({...formData, posting_date: e.target.value})}
                      />

                      <Input 
                        label="Budget ($)" 
                        type="number"
                        value={formData.budget} 
                        onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                      />
                      </div>

                      {formData.collab_type === 'influencer' && (
                        <div className="space-y-2 border-t border-white/5 pt-4">
                          <label className="text-sm font-medium text-zinc-400">Tag a Partner</label>
                          
                          {selectedPartner ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                              <div className="flex items-center gap-3">
                                {selectedPartner.avatar_url ? (
                                  <img src={selectedPartner.avatar_url} alt={selectedPartner.username} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                                    <User className="w-5 h-5" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-white">{selectedPartner.full_name || selectedPartner.username}</p>
                                  <p className="text-xs text-orange-400/80">@{selectedPartner.username}</p>
                                </div>
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                                onClick={() => setSelectedPartner(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                              <Input 
                                placeholder="Search by username..." 
                                className="pl-10"
                                value={partnerSearchQuery}
                                onChange={(e) => searchPartners(e.target.value)}
                              />
                              
                              {partnerSearchQuery.length >= 2 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                                  {isSearchingPartner ? (
                                    <div className="p-4 text-center text-sm text-zinc-400">Searching...</div>
                                  ) : partnerSearchResults.length > 0 ? (
                                    partnerSearchResults.map((user) => (
                                      <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedPartner(user);
                                          setPartnerSearchQuery('');
                                          setPartnerSearchResults([]);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                                      >
                                        {user.avatar_url ? (
                                          <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                            <User className="w-4 h-4" />
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-sm font-medium text-white">{user.full_name || user.username}</p>
                                          <p className="text-xs text-zinc-500">@{user.username}</p>
                                        </div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="p-4 text-center text-sm text-zinc-400">No users found.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    <Textarea 
                      label="Notes" 
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Collaboration details..."
                    />
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                      <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                      <Button type="submit">{editingCollab ? 'Save Changes' : 'Add Collaboration'}</Button>
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
