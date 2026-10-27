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
import CollaborationOverview from '@/components/CollaborationOverview';
import CollaborationDrawer from '@/components/CollaborationDrawer';
import { collaborationStages, deadline, remainingBudget } from '@/lib/collaborationPresentation';
import './Collaborations.css';
import { useAuth } from '@/contexts/AuthContext';

export default function Collaborations() {
  const { session } = useAuth();
  const currentUser = session?.user;
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [savingCollab, setSavingCollab] = useState(false);
  const [stepError, setStepError] = useState('');
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


  // Add User icon to imports if missing, but we'll use a placeholder if avatar is null


  useEffect(() => {
    fetchCollaborations();
  }, []);

  const fetchCollaborations = async () => {
    try {
      setLoading(true);
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
    setWizardStep(0); setStepError('');
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
    if (savingCollab || uploadingImage) return;
    const error = formData.collab_type === 'influencer' && !selectedPartner ? 'Choose a partner to continue.' : formData.collab_type !== 'influencer' && !formData.brand_name?.trim() ? 'Enter the brand name to continue.' : wizardStep >= 1 && (!Number.isInteger(Number(formData.videos_count)) || Number(formData.videos_count) < 1) ? 'Quantity must be a whole number of at least 1.' : wizardStep >= 2 && (!Number.isFinite(Number(formData.budget)) || Number(formData.budget) < 0) ? 'Enter a valid budget of 0 or more.' : '';
    if (error) { setStepError(error); return; }
    setStepError('');
    if (wizardStep < 3) { setWizardStep(step => step + 1); return; }
    setSavingCollab(true);
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
    } finally {
      setSavingCollab(false);
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
    [c.brand_name, c.partner?.username, c.notes].some(value => value?.toLowerCase().includes(searchQuery.trim().toLowerCase())) &&
    (stageFilter === 'all' || c.status === stageFilter) &&
    (platformFilter === 'all' || c.platform === platformFilter) &&
    (paymentFilter === 'all' || (c.deal_type === 'paid' && (paymentFilter === 'unpaid' ? remainingBudget(c) > 0 : remainingBudget(c) === 0 && Number(c.budget) > 0)))
  );
  const activeCount = collaborations.filter(c => !['posted', 'completed'].includes(c.status)).length;
  const dueSoonCount = collaborations.filter(c => deadline(c).tone === 'soon').length;
  const outstanding = collaborations.filter(c => c.deal_type === 'paid').reduce((sum, c) => sum + remainingBudget(c), 0);

  return (
    <div className="collaborations-page space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Collaborations</h2>
          <p className="text-zinc-400 mt-1">Manage your brand and creator partnerships.</p>
        </div>
        <Button className="collab-create" onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Collaboration
        </Button>
      </div>

      <div className="collab-summary" aria-label="Collaboration overview"><div><span>IN PROGRESS</span><strong>{loading ? '—' : activeCount}</strong><p>Partnerships you're working on</p></div><div><span>PUBLISHING SOON</span><strong>{loading ? '—' : dueSoonCount}<small>next 7 days</small></strong><p>Keep your next deliverables in sight</p></div><div><span>OUTSTANDING PAYMENTS</span><strong>{loading ? '—' : '$' + outstanding.toLocaleString()}</strong><p>Remaining across paid partnerships</p></div></div>
      <div className="collab-toolbar"><div className="collab-search"><Search size={16} /><Input aria-label="Search collaborations" placeholder="Search brands, creators or notes…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></div><div className="collab-filters"><select aria-label="Filter by stage" value={stageFilter} onChange={event => setStageFilter(event.target.value)}><option value="all">All stages</option>{Object.entries(collaborationStages).map(([value, stage]) => <option key={value} value={value}>{stage.label}</option>)}</select><select aria-label="Filter by platform" value={platformFilter} onChange={event => setPlatformFilter(event.target.value)}><option value="all">All platforms</option>{['instagram','tiktok','youtube','facebook','linkedin','x'].map(platform => <option key={platform} value={platform}>{platform}</option>)}</select><select aria-label="Filter by payment" value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)}><option value="all">All payments</option><option value="paid">Paid in full</option><option value="unpaid">Outstanding</option></select><div className="collab-view-toggle"><button aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}>Cards</button><button aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}>List</button></div></div></div>
      <div className="collab-results-label"><span>{filteredCollabs.length} partnerships</span>{(searchQuery || stageFilter !== 'all' || platformFilter !== 'all' || paymentFilter !== 'all') && <button onClick={() => { setSearchQuery(''); setStageFilter('all'); setPlatformFilter('all'); setPaymentFilter('all'); }}>Clear filters</button>}</div>
      {loading ? (
        <div className="flex justify-center py-20 text-white">Loading...</div>
      ) : (
        <div className={viewMode === 'grid' ? 'collab-cards-grid' : 'collab-cards-list'}><AnimatePresence>{filteredCollabs.map(collab => <motion.div key={collab.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }}><CollaborationOverview collab={collab} currentUserId={currentUser?.id} onView={() => setViewingCollab(collab)} onEdit={() => handleOpenModal(collab)} onDelete={() => handleDeleteClick(collab.id)} onRespond={status => handlePartnerResponse(collab.id, status)} /></motion.div>)}</AnimatePresence>{filteredCollabs.length === 0 && <div className="collab-empty"><Handshake size={30} /><h3>{collaborations.length ? 'No partnerships match your filters' : 'Your next partnership starts here'}</h3><p>{collaborations.length ? 'Try another search or clear the filters.' : 'Keep your briefs, deadlines and payments together.'}</p>{!collaborations.length && <Button onClick={() => handleOpenModal()}>New collaboration</Button>}</div>}</div>
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

      <AnimatePresence>{viewingCollab && <CollaborationDrawer key={viewingCollab.id} collab={viewingCollab} onClose={() => setViewingCollab(null)} onEdit={() => { const collab = viewingCollab; setViewingCollab(null); handleOpenModal(collab); }} />}</AnimatePresence>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="collab-wizard-container w-full max-w-xl my-8"
            >
              <Card className="collab-wizard bg-zinc-900 border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-zinc-900 z-10 border-b border-white/5">
                  <CardTitle>{editingCollab ? 'Edit Collaboration' : 'Add Collaboration'}</CardTitle>
                  <Button variant="ghost" size="icon" aria-label="Close collaboration setup" disabled={savingCollab || uploadingImage} onClick={() => setIsModalOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4" aria-label="Collaboration setup">
                    <ol className="collab-wizard-progress" aria-label="Collaboration setup steps">{['Partner','Content','Details','Review'].map((label,index) => <li key={label} className={index === wizardStep ? 'current' : index < wizardStep ? 'done' : ''} aria-current={index === wizardStep ? 'step' : undefined}><span>{index < wizardStep ? '✓' : index + 1}</span><strong>{label}</strong></li>)}</ol>
                    <div className="collab-wizard-intro"><span>STEP {wizardStep + 1} OF 4</span><h3>{['Who are you working with?','What are you creating?','Set the finishing details.','Ready to make it happen?'][wizardStep]}</h3><p>{['Choose a brand or find your creator partner.','Set the content, stage and posting date.','Add the budget and anything you need to remember.','Review your collaboration before saving.'][wizardStep]}</p></div>
                    {wizardStep === 0 && <div className="collab-wizard-fields" key="step-0">
                    {/* Collab Type Toggle */}
                    <div className="flex p-1 bg-zinc-950/50 rounded-xl border border-white/5 mb-6">
                      <button
                        type="button"
                        aria-pressed={formData.collab_type !== 'influencer'}
                        onClick={() => { setSelectedPartner(null); setStepError(''); setFormData({...formData, collab_type: 'brand'}); }}
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
                        aria-pressed={formData.collab_type === 'influencer'}
                        onClick={() => { setStepError(''); setFormData({...formData, collab_type: 'influencer'}); }}
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


                    </div>}
                    {wizardStep === 1 && <div className="collab-wizard-fields" key="step-1">
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
                    </div>

                    </div>}
                    {wizardStep === 2 && <div className="collab-wizard-fields" key="step-2">
                      <Input 
                        label="Budget ($)" 
                        type="number"
                        value={formData.budget} 
                        onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                      />                    <Textarea 
                      label="Notes" 
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Collaboration details..."
                    />
                    

                    </div>}
                    {wizardStep === 3 && <div className="collab-wizard-review"><div className="collab-wizard-review-brand"><Handshake size={25} /><div><h4>{formData.collab_type === 'influencer' ? selectedPartner?.full_name || selectedPartner?.username : formData.brand_name}</h4><span>{formData.collab_type === 'influencer' ? 'Creator partnership' : 'Brand partnership'}</span></div></div><dl>{[['Deal',formData.deal_type],['Stage',collaborationStages[formData.status || 'new'].label],['Platform',formData.platform],['Content',String(formData.videos_count || 1) + ' × ' + formData.content_type],['Publish date',formData.posting_date ? new Date(formData.posting_date).toLocaleDateString() : 'Not scheduled'],['Budget','$' + Number(formData.budget || 0).toLocaleString()]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{formData.notes && <div className="collab-wizard-review-notes"><span>Notes</span><p>{formData.notes}</p></div>}</div>}
                    {stepError && <p role="alert" className="collab-wizard-error">{stepError}</p>}
                    <div className="collab-wizard-footer"><Button type="button" variant="ghost" disabled={savingCollab || uploadingImage} onClick={() => setIsModalOpen(false)}>Cancel</Button><div>{wizardStep > 0 && <Button type="button" variant="ghost" disabled={savingCollab || uploadingImage} onClick={() => { setStepError(''); setWizardStep(step => step - 1); }}>Back</Button>}<Button className="collab-wizard-next" type="submit" disabled={savingCollab || uploadingImage}>{savingCollab ? 'Saving…' : wizardStep < 3 ? 'Continue →' : editingCollab ? 'Save changes' : 'Create collaboration'}</Button></div></div>
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
