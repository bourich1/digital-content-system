import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Loader2, Save, User, Mail, Briefcase, Camera, Share2, Download, Copy, 
  Flame, Clock, Target, Star, Edit, Twitter, Linkedin, Instagram, X, CalendarDays, Palette
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';

const PRESET_GRADIENTS = [
  { name: 'Indigo orange', css: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)' },
  { name: 'Ocean',         css: 'linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6)' },
  { name: 'Sunset',        css: 'linear-gradient(135deg, #f97316, #ef4444, #ec4899)' },
  { name: 'Forest',        css: 'linear-gradient(135deg, #10b981, #059669, #0d9488)' },
  { name: 'Midnight',      css: 'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)' },
  { name: 'Golden',        css: 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)' },
  { name: 'Rose',          css: 'linear-gradient(135deg, #f43f5e, #e11d48, #be123c)' },
  { name: 'Slate',         css: 'linear-gradient(135deg, #475569, #334155, #1e293b)' },
];

const DEFAULT_GRADIENT = PRESET_GRADIENTS[0].css;

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    avatar_url: '',
    cover_gradient: DEFAULT_GRADIENT,
    domain_industry: '',
    occupation: '',
    theme_preference: 'system',
    notifications_enabled: true
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        cover_gradient: profile.cover_gradient || DEFAULT_GRADIENT,
        domain_industry: profile.domain_industry || '',
        occupation: profile.occupation || '',
        theme_preference: profile.theme_preference || 'system',
        notifications_enabled: profile.notifications_enabled ?? true
      });
    }
  }, [profile]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const checkUsernameUnique = async (username: string) => {
    const cleanUsername = username.replace(/@/g, '').trim();
    if (cleanUsername === profile?.username) return true;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .abortSignal(abortController.signal)
        .eq('username', cleanUsername)
        .single();

      if (error && error.code !== 'PGRST116') {
         console.warn('Unique check error:', error);
         return true;
      }
      return !data;
    } catch (e) {
      if ((e as any)?.name === 'AbortError') {
        console.warn('Username unique check timed out, letting it pass');
      }
      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    // Safety timeout to prevent infinite loading
    const timer = setTimeout(() => setLoading(false), 10000);

    try {
      const cleanUsername = formData.username.replace(/@/g, '').trim();

      if (cleanUsername && cleanUsername !== profile?.username) {
        const isUnique = await checkUsernameUnique(cleanUsername);
        if (!isUnique) {
          toast.error('Username is already taken');
          setLoading(false);
          clearTimeout(timer);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          username: cleanUsername,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          cover_gradient: formData.cover_gradient,
          domain_industry: formData.domain_industry,
          occupation: formData.occupation,
          theme_preference: formData.theme_preference,
          notifications_enabled: formData.notifications_enabled
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await refreshProfile();
      toast.success('Profile updated successfully');
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile: ' + (error.message || 'Unknown error'));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size must be less than 3 MB.');
      return;
    }

    setUploadingImage(true);

    const timer = setTimeout(() => {
      setUploadingImage(false);
      toast.error('Upload timed out. Make sure the avatars storage bucket exists in Supabase.');
    }, 15000);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Make sure the avatars bucket exists and is public.');
    } finally {
      clearTimeout(timer);
      setUploadingImage(false);
    }
  };

  const profileUrl = formData.username 
    ? `${window.location.origin}/u/${formData.username}`
    : window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied to clipboard!');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${formData.full_name}'s Profile`,
          text: formData.bio || 'Check out my profile!',
          url: profileUrl,
        });
      } catch (err) {
        console.error('Error sharing natively:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setIsGeneratingCard(true);
    toast.info('Generating card...', { duration: 2000 });
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      
      const link = document.createElement('a');
      link.download = `${formData.username || 'profile'}-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Card downloaded successfully!');
    } catch (error) {
      console.error('Error generating card:', error);
      toast.error('Failed to generate card image');
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown';

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* 1. Header Section */}
      <div className="relative bg-[#111] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Gradient Cover */}
        <div className="h-40 sm:h-48 w-full" style={{ background: formData.cover_gradient }} />
        
        <div className="px-6 pb-6 sm:px-10 sm:pb-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            <div className="flex items-end gap-6">
              <div className="relative">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#111] bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <User className="w-16 h-16 text-gray-500" />
                  )}
                </div>
              </div>
              
              <div className="pb-2">
                <h1 className="text-2xl sm:text-4xl font-bold text-white flex items-center gap-3">
                  {formData.full_name || 'Anonymous User'}
                  {profile?.role === 'admin' && (
                    <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-semibold uppercase tracking-wider">
                      Admin
                    </span>
                  )}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-gray-400 font-medium">
                  {formData.username ? <span>@{formData.username}</span> : <span className="opacity-50 italic">@add_username</span>}
                  {formData.occupation && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                      <span className="flex items-center gap-1"><Briefcase className="w-4 h-4"/> {formData.occupation}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-semibold hover:bg-gray-200 transition-colors self-start sm:self-end shadow-lg"
            >
              <Edit className="w-4 h-4" /> Edit Profile
            </button>
          </div>

          <div className="mt-6 max-w-3xl">
            <p className="text-gray-300 leading-relaxed text-lg">
              {formData.bio || <span className="text-gray-600 italic">No bio added yet. Click Edit Profile to tell the world about yourself.</span>}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-orange-500/50 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
              <Flame className="w-5 h-5" />
            </div>
            {profile?.day_streak ? <span className="text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full">Active</span> : null}
          </div>
          <div className="text-4xl font-black text-white tabular-nums">{profile?.day_streak || 0}</div>
          <div className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-wide">Day Streak</div>
        </div>

        <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-blue-500/50 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-white tabular-nums">{profile?.work_hours || 0}</div>
          <div className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-wide">Work Hours</div>
        </div>

        <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-white tabular-nums">{profile?.focus_sessions || 0}</div>
          <div className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-wide">Focus Sessions</div>
        </div>

        <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
              <Star className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-white tabular-nums">{profile?.points || 0}</div>
          <div className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-wide">Points</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 3. Shareable Profile Card Section */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-400" /> Share Profile Card
          </h2>
          <p className="text-gray-400 text-sm">Download your unique profile card or share it directly to your social networks.</p>
          
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-4 sm:p-6 flex flex-col items-center gap-6 shadow-2xl">
            
            {/* SCALED PREVIEW WRAPPER */}
            <div className="w-full overflow-hidden flex justify-center bg-black/50 rounded-2xl border border-gray-800 relative">
              
              <div className="relative w-full aspect-[1200/630] max-w-[800px] flex items-center justify-center overflow-hidden">
                 <div 
                   ref={cardRef}
                   className="absolute top-0 left-0 origin-top-left flex overflow-hidden"
                   style={{ 
                     transform: 'scale(min(1, 100% / 1200))', 
                     width: '1200px', 
                     height: '630px',
                     backgroundColor: '#0a0a0a',
                   }}
                 >
                    {/* Card Background Gradient — inline styles to avoid oklab() from Tailwind */}
                    <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(to bottom right, rgba(49,46,129,0.4), rgba(88,28,135,0.4), #0a0a0a)' }} />
                    
                    {/* Content inside the 1200x630 canvas */}
                    <div className="relative z-10 w-full h-full flex flex-col justify-between" style={{ padding: '64px' }}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center" style={{ gap: '32px' }}>
                          <div className="rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ width: '160px', height: '160px', border: '4px solid rgba(255,255,255,0.1)', backgroundColor: '#1f2937', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                            {formData.avatar_url ? (
                              <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" crossOrigin="anonymous" />
                            ) : (
                              <User style={{ width: '80px', height: '80px', color: '#6b7280' }} />
                            )}
                          </div>
                          <div>
                            <h1 style={{ fontSize: '60px', fontWeight: 700, color: '#ffffff', marginBottom: '16px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>{formData.full_name || 'Anonymous User'}</h1>
                            <div className="flex items-center" style={{ gap: '16px', fontSize: '24px', color: '#d8b4fe', fontWeight: 500 }}>
                              {formData.username && <span>@{formData.username}</span>}
                              {formData.occupation && (
                                <>
                                  <span className="rounded-full" style={{ width: '8px', height: '8px', backgroundColor: 'rgba(168,85,247,0.5)' }} />
                                  <span>{formData.occupation}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* QR Code */}
                        {formData.username && (
                          <div className="flex flex-col items-center" style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', gap: '8px' }}>
                            <QRCodeSVG value={profileUrl} size={110} />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#000000', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginTop: '4px' }}>Scan Me</span>
                          </div>
                        )}
                      </div>

                      <div className="flex" style={{ gap: '32px' }}>
                         <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '24px', minWidth: '220px' }}>
                            <div className="flex items-center" style={{ color: '#fb923c', gap: '12px', marginBottom: '8px' }}><Flame style={{ width: '40px', height: '40px' }}/></div>
                            <div style={{ fontSize: '60px', fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>{profile?.day_streak || 0}</div>
                            <div style={{ fontSize: '18px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Day Streak</div>
                         </div>
                         <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '24px', minWidth: '220px' }}>
                            <div className="flex items-center" style={{ color: '#facc15', gap: '12px', marginBottom: '8px' }}><Star style={{ width: '40px', height: '40px' }}/></div>
                            <div style={{ fontSize: '60px', fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>{profile?.points || 0}</div>
                            <div style={{ fontSize: '18px', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Points earned</div>
                         </div>
                      </div>

                      <div className="flex justify-between items-end" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '32px', marginTop: 'auto' }}>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                          BoostD
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 500, color: '#d8b4fe' }}>
                          {profileUrl.replace('https://', '').replace('http://', '')}
                        </div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full">
              <button
                onClick={handleDownloadCard}
                disabled={isGeneratingCard}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3.5 rounded-xl font-medium transition-colors shadow-lg"
              >
                {isGeneratingCard ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Download PNG
              </button>
              
              <button
                onClick={handleNativeShare}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-gray-800 text-white px-6 py-3.5 rounded-xl font-medium transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>

              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-gray-800 text-white px-6 py-3.5 rounded-xl font-medium transition-colors"
              >
                <Copy className="w-5 h-5" />
                Copy Link
              </button>
            </div>

            {/* Social Share Row */}
            <div className="flex flex-wrap items-center justify-center gap-4 w-full pt-4 border-t border-gray-800">
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out my profile on BoostD! ')}&url=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#1da1f2]/10 text-[#1da1f2] hover:bg-[#1da1f2] hover:text-white flex items-center justify-center transition-all">
                <Twitter className="w-5 h-5 fill-current" />
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#0077b5]/10 text-[#0077b5] hover:bg-[#0077b5] hover:text-white flex items-center justify-center transition-all">
                <Linkedin className="w-5 h-5 fill-current" />
              </a>
              <a href={`https://wa.me/?text=${encodeURIComponent('Check out my profile! ' + profileUrl)}`} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366] hover:text-white flex items-center justify-center transition-all">
                {/* Whatsapp Icon placeholder using MessageCircle */}
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </a>
            </div>
          </div>
        </div>

        {/* 4. Quick Info Section */}
        <div className="space-y-4">
           <h2 className="text-xl font-bold text-white">Quick Info</h2>
           <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-400 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">Email Address</div>
                  <div className="text-white font-medium break-all">{user?.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-400 shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">Joined Date</div>
                  <div className="text-white font-medium">{joinDate}</div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#111] border border-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0">
              <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="edit-profile-form" onSubmit={saveProfile} className="space-y-6">
                
                {/* Avatar Upload */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800">
                  <div className="w-24 h-24 rounded-full border-2 border-gray-700 bg-[#111] flex items-center justify-center overflow-hidden shrink-0">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gray-500" />
                    )}
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-xl cursor-pointer transition-colors font-medium">
                      {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      <span>{uploadingImage ? 'Uploading...' : 'Change Avatar'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-3">Recommended: Square image, 500x500px or larger. JPG, GIF or PNG. Max size 3MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleProfileChange}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-[#1a1a1a] text-white rounded-xl px-4 py-3.5 border border-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Username</label>
                    <div className="relative">
                       <span className="absolute left-4 top-3.5 text-gray-500 font-medium">@</span>
                       <input
                         type="text"
                         name="username"
                         value={formData.username}
                         onChange={handleProfileChange}
                         placeholder="username"
                         className="w-full bg-[#1a1a1a] text-white rounded-xl pl-9 pr-4 py-3.5 border border-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                       />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleProfileChange}
                    placeholder="e.g. Content Creator, Developer, Designer"
                    className="w-full bg-[#1a1a1a] text-white rounded-xl px-4 py-3.5 border border-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Short Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleProfileChange}
                    placeholder="Tell the community about yourself..."
                    className="w-full bg-[#1a1a1a] text-white rounded-xl px-4 py-3.5 border border-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
                  />
                </div>

                {/* Cover Gradient Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-orange-400" /> Cover Gradient
                  </label>
                  <div className="rounded-xl h-16 w-full overflow-hidden border border-gray-800 mb-4" style={{ background: formData.cover_gradient }} />
                  <div className="grid grid-cols-4 gap-3">
                    {PRESET_GRADIENTS.map((g) => (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, cover_gradient: g.css }))}
                        className={`aspect-[2/1] rounded-xl border-2 transition-all ${formData.cover_gradient === g.css ? 'border-orange-500 ring-2 ring-orange-500/50 scale-105' : 'border-gray-700 hover:border-gray-500'}`}
                        style={{ background: g.css }}
                        title={g.name}
                      />
                    ))}
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-gray-800 bg-[#0a0a0a] flex justify-end gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-6 py-3 rounded-xl font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                form="edit-profile-form"
                type="submit"
                disabled={loading}
                className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
