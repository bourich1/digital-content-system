import './Profile.css';
import { Link } from 'react-router-dom';
import { ProfileShareCard } from '@/components/profile/ProfileShareCard';
import { profileAccent, snapshotUrl, type ProfileSnapshot } from '@/lib/profilePresentation';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Loader2, Save, User, Briefcase, Camera, Share2, Download, Copy, 
  Flame, Clock, Target, Star, Edit, Twitter, Instagram, X, Palette, Settings as SettingsIcon, ArrowUpRight, Trophy, Facebook, MessageCircle
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(() => new URLSearchParams(window.location.search).get('edit') === 'true');
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(.5);
  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setPreviewScale(entries[0].contentRect.width / 1200));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  
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
    if (!file || !user) return;

    const fileExt = (file.name.split('.').pop() || '').toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileExt)) {
      toast.error('Use a PNG, JPG, WEBP or GIF image.');
      return;
    }

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
      const fileName = `${uuidv4()}.${fileExt}`;
      // Objects are stored under the caller's own user id so the storage policy
      // can refuse writes into another account's folder.
      const filePath = `${user.id}/${fileName}`;

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

  const accent = profileAccent(formData.cover_gradient);
  const snapshot: ProfileSnapshot = {
    name: (formData.full_name || 'Creator').slice(0, 100), username: formData.username.slice(0, 50),
    occupation: formData.occupation.slice(0, 100), bio: formData.bio.slice(0, 280), avatar: formData.avatar_url.slice(0, 1000), accent,
    streak: profile?.day_streak || 0, hours: profile?.work_hours || 0, sessions: profile?.focus_sessions || 0, points: profile?.points || 0,
  };
  const profileUrl = snapshotUrl(snapshot, window.location.origin);
  const streak = snapshot.streak;
  const milestone = streak < 7 ? 7 : streak < 30 ? 30 : Math.floor(streak / 30 + 1) * 30;
  const encouragement = streak >= 30 ? 'A month of momentum. Look how far you’ve come.' : streak >= 7 ? 'Seven days and counting. You showed up for yourself.' : streak > 0 ? 'You’re building something good. Keep your momentum.' : 'Every streak starts with one day. Make today yours.';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success('Profile link copied to clipboard!');
  };

  const createCardBlob = async () => {
    if (!cardRef.current) throw new Error('Card not ready');
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(cardRef.current, {
      scale: 1.5, useCORS: true, backgroundColor: '#101013', windowWidth: 1440, windowHeight: 900,
      onclone: document => {
        document.body.style.zoom = '1';
        document.documentElement.style.zoom = '1';
        const stage = document.getElementById('profile-export-stage');
        if (stage) { stage.style.left = '0'; stage.style.top = '0'; stage.style.position = 'absolute'; }
      },
    });
    return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not export image')), 'image/png'));
  };
  const handleDownloadCard = async () => {
    setIsGeneratingCard(true);
    try {
      const blob = await createCardBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${formData.username || 'profile'}-card.png`; link.href = url; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Your profile card is ready!');
    } catch { toast.error('Could not generate your card. Please try again.'); }
    finally { setIsGeneratingCard(false); }
  };
  const handleNativeShare = async () => {
    if (!navigator.share) { handleCopyLink(); return; }
    try { await navigator.share({ title: `${snapshot.name} on BoostD`, text: snapshot.bio, url: profileUrl }); }
    catch (error) { if ((error as Error).name !== 'AbortError') toast.error('Sharing is unavailable. Try copying your link.'); }
  };
  const handleInstagramShare = async () => {
    setIsGeneratingCard(true);
    try {
      const blob = await createCardBlob();
      const file = new File([blob], `${snapshot.username || 'profile'}-card.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${snapshot.name} on BoostD` });
      } else {
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success('Card downloaded. Add it to your Instagram post or story.');
      }
    } catch (error) { if ((error as Error).name !== 'AbortError') toast.error('Unable to share this image. Try Download PNG.'); }
    finally { setIsGeneratingCard(false); }
  };



  return (
    <div className="profile-page" style={{ '--profile-accent': accent } as React.CSSProperties}>
      <div className="profile-topline"><span>YOUR SPACE</span><Link to="/settings/account"><SettingsIcon size={15} />Account settings<ArrowUpRight size={13} /></Link></div>
      <section className="profile-identity">
        <div className="profile-atmosphere" aria-hidden="true" />
        <img className="profile-watermark" src="/icon%20white.png" alt="" aria-hidden="true" />
        <div className="profile-person">
          <div className="profile-avatar">{formData.avatar_url ? <img src={formData.avatar_url} alt={snapshot.name} /> : <span>{snapshot.name.slice(0, 2).toUpperCase()}</span>}</div>
          <div className="profile-name-block"><span className="profile-username">@{formData.username || 'your_username'}</span><h1>{snapshot.name}{profile?.role === 'admin' && <span className="profile-role">Admin</span>}</h1>{formData.occupation && <p className="profile-occupation"><Briefcase size={15} />{formData.occupation}</p>}</div>
          <button className="profile-edit" onClick={() => setIsEditModalOpen(true)}><Edit size={15} />Edit profile</button>
        </div>
        <p className="profile-bio">{formData.bio || 'Your story starts here. Add a little about yourself.'}</p>
        <div className="profile-stats">{[
          { label: 'Day streak', value: snapshot.streak, icon: Flame }, { label: 'Work hours', value: snapshot.hours, icon: Clock },
          { label: 'Focus sessions', value: snapshot.sessions, icon: Target }, { label: 'Points', value: snapshot.points, icon: Star },
        ].map(stat => <div key={stat.label}><stat.icon size={18} /><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div>
      </section>
      <div className="profile-lower-grid">
        <section className="profile-momentum"><span className="profile-section-label"><Flame size={15} /> YOUR MOMENTUM</span><div className="profile-milestone-icon"><Trophy size={27} /></div><h2>{streak >= 7 ? 'Look at you go.' : 'One day at a time.'}</h2><p>{encouragement}</p><div className="profile-milestone-label"><span>Next milestone</span><strong>{streak} / {milestone} days</strong></div><div className="profile-progress" role="progressbar" aria-label="Progress to next streak milestone" aria-valuemin={0} aria-valuemax={milestone} aria-valuenow={streak}><span style={{ width: `${Math.min(100, streak / milestone * 100)}%` }} /></div><div className="profile-milestone-badges"><span className={streak >= 7 ? 'earned' : ''}>7 days · Finding your rhythm</span><span className={streak >= 30 ? 'earned' : ''}>30 days · Building a habit</span></div><Link to="/focus">Make time for your next session<ArrowUpRight size={14} /></Link></section>
        <section className="profile-share"><div className="profile-share-heading"><div><span className="profile-section-label"><Share2 size={14} /> TAKE IT WITH YOU</span><h2>Your profile, ready to share.</h2></div></div><div className="profile-card-preview" ref={previewRef}><div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}><ProfileShareCard snapshot={snapshot} url={profileUrl} /></div></div><div className="profile-share-actions"><button className="profile-download" onClick={handleDownloadCard} disabled={isGeneratingCard}>{isGeneratingCard ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}Download PNG</button><button onClick={handleCopyLink}><Copy size={14} />Copy link</button><button onClick={handleNativeShare}><Share2 size={14} />Share</button></div><div className="profile-share-socials"><span>Share your profile</span><a href={`https://wa.me/?text=${encodeURIComponent(`${snapshot.name} on BoostD ${profileUrl}`)}`} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp"><MessageCircle size={17} /></a><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook"><Facebook size={17} /></a><button onClick={handleInstagramShare} disabled={isGeneratingCard} aria-label="Share profile image to Instagram"><Instagram size={17} /></button><a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}`} target="_blank" rel="noreferrer" aria-label="Share on X"><Twitter size={17} /></a><Link className="profile-share-preview" to={profileUrl.replace(window.location.origin, '')} target="_blank">Preview shared profile<ArrowUpRight size={12} /></Link></div><p className="profile-share-note">Your shared link shows a snapshot of this profile. Email and account details stay in settings.</p></section>
      </div>
      <div id="profile-export-stage" aria-hidden="true" style={{ position: 'absolute', left: -10000, top: 0, width: 1200, pointerEvents: 'none' }}><div ref={cardRef}><ProfileShareCard snapshot={snapshot} url={profileUrl} /></div></div>

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

                {/* Profile color Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-orange-400" /> Profile color
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
                        aria-label={`Use ${g.name} profile color`}
                        aria-pressed={formData.cover_gradient === g.css}
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
