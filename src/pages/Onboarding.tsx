import WelcomeScreen from '@/components/WelcomeScreen';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Youtube, Instagram, Twitter, Linkedin, Facebook, Link2, ArrowRight, ArrowLeft, Camera, User, Palette, ImagePlus, Sparkles, CircleCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { v4 as uuidv4 } from 'uuid';
import './Onboarding.css';

const SOCIAL_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'hover:bg-red-500/10 hover:border-red-500 hover:text-red-500' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'hover:bg-pink-500/10 hover:border-pink-500 hover:text-pink-500' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: 'hover:bg-blue-400/10 hover:border-blue-400 hover:text-blue-400' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'hover:bg-blue-600/10 hover:border-blue-600 hover:text-blue-600' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-500' },
  { id: 'other', name: 'Other', icon: Link2, color: 'hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-500' }
];

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

/** Extract 3 dominant colors from an image using canvas pixel sampling */
function extractColorsFromImage(imgSrc: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        
        const size = 50;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        
        // Sample 3 regions: top-left, center, bottom-right
        const regions = [
          { x: Math.floor(size * 0.2), y: Math.floor(size * 0.2) },
          { x: Math.floor(size * 0.5), y: Math.floor(size * 0.5) },
          { x: Math.floor(size * 0.8), y: Math.floor(size * 0.8) },
        ];
        
        const colors = regions.map(({ x, y }) => {
          // Average a 5x5 block around the point
          let r = 0, g = 0, b = 0, count = 0;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const px = Math.max(0, Math.min(size - 1, x + dx));
              const py = Math.max(0, Math.min(size - 1, y + dy));
              const i = (py * size + px) * 4;
              r += data[i]; g += data[i + 1]; b += data[i + 2];
              count++;
            }
          }
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        });
        
        resolve(`linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imgSrc;
  });
}

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [step, setStep] = useState(0);
  const previewMode = new URLSearchParams(window.location.search).get('preview') === 'true';
  const [completed, setCompleted] = useState(() => previewMode && new URLSearchParams(window.location.search).get('welcome') === 'true');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [channels, setChannels] = useState<string[]>([]);
  const [extractedGradient, setExtractedGradient] = useState<string | null>(null);
  const manualColor = useRef(false);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    avatar_url: profile?.avatar_url || '',
    cover_gradient: profile?.cover_gradient || PRESET_GRADIENTS[2].css,
    source: '',
    domain_industry: profile?.domain_industry || '',
    occupation: profile?.occupation || '',
    primary_goal: '',
    additional_info: '',
    bio: profile?.bio || '',
    experience: '',
    posting_frequency: '',
    biggest_challenge: '',
    profile_link: ''
  });
  useEffect(() => setAvatarFailed(false), [formData.avatar_url]);
  useEffect(() => {
    if (!formData.avatar_url) return;
    let active = true;
    setExtractedGradient(null);
    void extractColorsFromImage(formData.avatar_url).then(gradient => {
      if (!active || !gradient) return;
      setExtractedGradient(gradient);
      if (!manualColor.current) setFormData(previous => ({ ...previous, cover_gradient: gradient }));
    });
    return () => { active = false; };
  }, [formData.avatar_url]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  // Total steps: 0=Name/Avatar, 1=Gradient, 2=Source, 3=Domain, 4=Occupation, 5=Goal, 6=Additional
  const TOTAL_STEPS = 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || uploadingImage || !isStepValid()) return;
    if (formData.profile_link) {
      try { const link = new URL(formData.profile_link); if (!['https:', 'http:'].includes(link.protocol)) throw new Error(); }
      catch { toast.error('Enter a valid public profile or website URL.'); return; }
    }
    if (step < TOTAL_STEPS - 1) {
      if (step === 0 && user) {
        if (previewMode) { handleNext(); return; }
        setLoading(true);
        try {
          const usernameInput = formData.username.trim().toLowerCase();
          if (!/^[a-zA-Z0-9_]+$/.test(usernameInput)) {
            toast.error("Username can only contain letters, numbers, and underscores.");
            return;
          }
          
          const { error } = await supabase
            .from('profiles')
            .update({ username: usernameInput })
            .eq('id', user.id);

          if (error) {
            if (error.code === '23505') {
              toast.error("This username is already taken. Please choose another one.");
              return;
            }
            throw error;
          }
          setFormData(prev => ({ ...prev, username: usernameInput }));
        } catch (err) {
          console.error("Error updating username:", err);
          toast.error("Failed to check username availability.");
          return;
        } finally {
          setLoading(false);
        }
      }
      handleNext();
      return;
    }

    if (!user || !profile) return;
    if (previewMode) { setCompleted(true); return; }
    
    setLoading(true);
    try {
      // 1. Insert survey response
      const { error: surveyError } = await supabase
        .from('onboarding_surveys')
        .insert({
          user_id: user.id,
          source: formData.source,
          primary_goal: formData.primary_goal,
          additional_info: [formData.additional_info, channels.length ? `Platforms: ${channels.join(', ')}` : '', formData.experience ? `Experience: ${formData.experience}` : '', formData.posting_frequency ? `Posting rhythm: ${formData.posting_frequency}` : '', formData.biggest_challenge ? `Biggest challenge: ${formData.biggest_challenge}` : '', formData.profile_link ? `Public profile: ${formData.profile_link}` : ''].filter(Boolean).join('\n')
        });

      if (surveyError) throw surveyError;

      // 2. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          cover_gradient: formData.cover_gradient,
          domain_industry: formData.domain_industry,
          occupation: formData.occupation,
          survey_completed: true
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      setCompleted(true);
    } catch (error: any) {
      console.error('Error saving onboarding data:', error);
      toast.error('Failed to save your answers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (previewMode) { toast.info('Uploads are disabled in preview mode.'); return; }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size must be less than 3 MB.');
      return;
    }

    try {
      setUploadingImage(true);

      const timer = setTimeout(() => {
        setUploadingImage(false);
        toast.error('Upload timed out. Make sure the avatars storage bucket exists in Supabase.');
      }, 15000);

      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      clearTimeout(timer);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      manualColor.current = false;
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Image uploaded successfully');

      // The avatar effect derives and selects this image's colors automatically.
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Make sure the "avatars" bucket exists in Supabase Storage and is set to Public.');
    } finally {
      setUploadingImage(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 0: return formData.full_name.trim().length > 0 && formData.username.trim().length > 0;
      case 1: return formData.cover_gradient.length > 0; // gradient
      case 2: return formData.source.length > 0;
      case 3: return formData.domain_industry.trim().length > 0;
      case 4: return formData.occupation.length > 0;
      case 5: return formData.primary_goal.trim().length > 0;
      case 6: return true; // optional
      case 7: return formData.full_name.trim().length > 0 && formData.username.trim().length > 0 && !!formData.source && !!formData.domain_industry.trim() && !!formData.occupation && !!formData.primary_goal.trim();
      default: return false;
    }
  };

  const stepTitles = [
    "Let's put a face to your name.",
    "Make this space your own.",
    "Where did you hear about us?",
    "What is your domain or industry?",
    "What is your current occupation?",
    "What is your primary goal?",
    "What would make creating easier?",
    "Your next chapter is ready.",
  ];

  const stepDescriptions = [
    "Tell us your name and add a profile picture.",
    "Choose your profile colors, or take inspiration from your avatar.",
    "Select the platform you found us on.",
    "Help us understand your niche.",
    "What best describes your current role?",
    "What do you want to achieve here?",
    "Share your biggest challenge and anything else we should know. These details are optional.",
    "Take a moment to review your profile and creative preferences.",
  ];

  const variants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  if (completed) return <WelcomeScreen name={formData.full_name} preview={previewMode} onContinue={() => navigate('/', { replace: true })} />;

  return (
    <div className="onboarding-page">
      <img className="onboarding-background-logo" src="/logo white.png" alt="" aria-hidden="true" />
      <div className="onboarding-shell">
      <div className="onboarding-form-panel">
        <header className="onboarding-form-top"><img src="/logo white.png" alt="BoostD"/><span>{previewMode ? 'PREVIEW · NOTHING IS SAVED' : 'YOUR CREATIVE JOURNEY STARTS HERE'}</span><small>{String(step+1).padStart(2,'0')} / 08</small></header>
        <div className="mb-8">
          <div className="onboarding-progress flex gap-2 mb-8" role="progressbar" aria-label="Profile setup progress" aria-valuemin={0} aria-valuemax={TOTAL_STEPS} aria-valuenow={step+1}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-orange-500' : 'bg-gray-800'}`}
              />
            ))}
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            {stepTitles[step]}
          </h1>
          <p className="text-gray-400">
            {stepDescriptions[step]}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form min-h-[250px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="onboarding-step-content"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {/* Step 0: Name & Avatar */}
              {step === 0 && (
                <div className="space-y-6 w-full max-w-md mx-auto">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full border-2 border-gray-800 bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                        {formData.avatar_url && !avatarFailed ? (
                          <img src={formData.avatar_url} onError={()=>setAvatarFailed(true)} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-gray-500" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        {uploadingImage ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                    <p className="text-sm text-gray-400">Upload Profile Picture (Optional)</p>
                  </div>
                  
                  <div className="space-y-4 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                      <input
                        type="text"
                        aria-label="Full name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. Jane Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                      <input
                        type="text"
                        aria-label="Username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. jane_doe123"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Gradient Picker */}
              {step === 1 && (
                <div className="space-y-5">
                  {/* Preview bar */}
                  <div className="onboarding-color-preview" style={{ background: formData.cover_gradient }}><img src="/icon white.png" alt="BoostD"/><span>Your profile. Your colors.</span></div>

                  {/* Auto-generated from avatar */}
                  {extractedGradient && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-400" /> Generated from your avatar
                      </p>
                      <button
                        type="button"
                        onClick={() => { manualColor.current = false; setFormData(prev => ({ ...prev, cover_gradient: extractedGradient })); }}
                        className={`w-full h-16 rounded-xl border-2 transition-all overflow-hidden ${formData.cover_gradient === extractedGradient ? 'border-orange-500 ring-2 ring-orange-500/50 scale-[1.02]' : 'border-gray-700 hover:border-gray-500'}`}
                        style={{ background: extractedGradient }}
                      />
                    </div>
                  )}

                  {/* Preset grid */}
                  <div>
                    <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-orange-400" /> Or pick a preset
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {PRESET_GRADIENTS.map((g) => (
                        <button
                          key={g.name}
                          type="button"
                          onClick={() => { manualColor.current = true; setFormData(prev => ({ ...prev, cover_gradient: g.css })); }}
                          className={`aspect-[2/1] rounded-xl border-2 transition-all ${formData.cover_gradient === g.css ? 'border-orange-500 ring-2 ring-orange-500/50 scale-105' : 'border-gray-700 hover:border-gray-500'}`}
                          style={{ background: g.css }}
                          title={g.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Upload image for extraction */}
                  {!extractedGradient && (
                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-orange-400 cursor-pointer transition-colors">
                        <ImagePlus className="w-4 h-4" />
                        <span>Upload an image to auto-generate a gradient</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = URL.createObjectURL(file);
                            const gradient = await extractColorsFromImage(url);
                            URL.revokeObjectURL(url);
                            if (gradient) {
                              manualColor.current = true;
                              setExtractedGradient(gradient);
                              setFormData(prev => ({ ...prev, cover_gradient: gradient }));
                              toast.success('Gradient generated from your image!');
                            } else {
                              toast.error('Could not extract colors from this image.');
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Source */}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const isSelected = formData.source === platform.name;
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, source: platform.name }))}
                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-200 ${
                          isSelected 
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400' 
                            : `bg-[#1a1a1a] border-gray-800 text-gray-400 ${platform.color}`
                        }`}
                      >
                        <platform.icon className="w-8 h-8" />
                        <span className="font-medium">{platform.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step 3: Domain/Industry */}
              {step === 3 && (
                <div className="onboarding-field-stack"><label htmlFor="onboarding-niche">Your main niche</label>
                <input
                  type="text"
                  name="domain_industry"
                  id="onboarding-niche"
                  autoFocus
                  required
                  value={formData.domain_industry}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-orange-500 text-lg"
                  placeholder="e.g. Tech, Marketing, Education"
                />
                <div className="onboarding-chips">{['Tech & AI','Lifestyle','Education','Design','Business','Gaming','Fitness','Food & travel'].map(niche => <button type="button" key={niche} aria-pressed={formData.domain_industry === niche} onClick={() => setFormData(prev=>({...prev,domain_industry:niche}))}>{niche}</button>)}</div><label htmlFor="onboarding-bio">A little about you <span>Optional · shown on your profile</span></label><textarea id="onboarding-bio" name="bio" value={formData.bio} onChange={handleChange} maxLength={500} placeholder="What do you create, and what makes it yours?" rows={3}/><small>{formData.bio.length}/500</small></div>
              )}

              {/* Step 4: Occupation */}
              {step === 4 && (
                <div className="onboarding-field-stack"><label htmlFor="onboarding-occupation">Your current role</label>
                <select
                  name="occupation"
                  id="onboarding-occupation"
                  required
                  value={formData.occupation}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-orange-500 text-lg"
                >
                  <option value="" disabled>Select your occupation...</option>
                  <option value="Student">Student</option>
                  <option value="Employee">Employee</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Business Owner">Business Owner</option>
                  <option value="Other">Other</option>
                </select>
                <label htmlFor="onboarding-experience">Experience creating content <span>Optional</span></label><select id="onboarding-experience" name="experience" value={formData.experience} onChange={handleChange}><option value="">Choose your experience</option>{['Just getting started','Less than 1 year','1–3 years','More than 3 years'].map(value=><option key={value}>{value}</option>)}</select><label htmlFor="onboarding-frequency">Your usual posting rhythm <span>Optional</span></label><select id="onboarding-frequency" name="posting_frequency" value={formData.posting_frequency} onChange={handleChange}><option value="">Choose your rhythm</option>{['Not posting yet','A few times a month','1–2 times a week','3–5 times a week','Every day'].map(value=><option key={value}>{value}</option>)}</select></div>
              )}

              {/* Step 5: Primary Goal */}
              {step === 5 && (
                <div className="onboarding-field-stack"><label htmlFor="onboarding-goal">Your main goal</label>
                <input
                  type="text"
                  name="primary_goal"
                  id="onboarding-goal"
                  autoFocus
                  required
                  value={formData.primary_goal}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-orange-500 text-lg"
                  placeholder="e.g. Grow my YouTube channel"
                />
                <div className="onboarding-chips">{['Grow my audience','Stay consistent','Plan my content','Manage collaborations','Improve my focus'].map(goal=><button key={goal} type="button" aria-pressed={formData.primary_goal===goal} onClick={()=>setFormData(prev=>({...prev,primary_goal:goal}))}>{goal}</button>)}</div><label>Your creative platforms <span>Optional · choose more than one</span></label><div className="onboarding-channels">{['YouTube','Instagram','TikTok','X','LinkedIn','Facebook','Other'].map(channel=><button type="button" key={channel} aria-pressed={channels.includes(channel)} onClick={()=>setChannels(previous=>previous.includes(channel)?previous.filter(item=>item!==channel):[...previous,channel])}>{channel}<span>{channels.includes(channel)?'✓':'+'}</span></button>)}</div><label htmlFor="onboarding-profile-link">Your main public profile or website <span>Optional</span></label><input id="onboarding-profile-link" type="url" name="profile_link" value={formData.profile_link} onChange={handleChange} placeholder="https://…"/></div>
              )}

              {/* Step 6: Additional Info */}
              {step === 6 && (
                <div className="onboarding-field-stack"><label htmlFor="onboarding-challenge">Your biggest challenge <span>Optional</span></label><select id="onboarding-challenge" name="biggest_challenge" value={formData.biggest_challenge} onChange={handleChange}><option value="">Choose what gets in your way</option>{['Finding fresh ideas','Staying consistent','Managing my time','Growing my audience','Organizing collaborations','Other'].map(value=><option key={value}>{value}</option>)}</select><label htmlFor="onboarding-additional">Anything else you'd like to share? <span>Optional</span></label>
                <textarea
                  name="additional_info"
                  id="onboarding-additional"
                  maxLength={2000}
                  autoFocus
                  value={formData.additional_info}
                  onChange={handleChange}
                  className="w-full bg-[#1a1a1a] text-white rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-orange-500 min-h-[120px] text-lg resize-none"
                  placeholder="Optional..."
                />
                <p className="onboarding-optional-note">These answers help us understand your creative work. You can leave them blank.</p></div>
              )}
              {step === 7 && <div className="onboarding-review"><div className="onboarding-review-person"><div className="onboarding-preview-avatar">{formData.avatar_url && !avatarFailed?<img src={formData.avatar_url} onError={()=>setAvatarFailed(true)} alt=""/>:<User size={24}/>}</div><div><h3>{formData.full_name}</h3><span>@{formData.username}</span></div><img src="/icon white.png" alt="BoostD"/></div><dl>{[['Niche',formData.domain_industry],['Role',formData.occupation],['Main goal',formData.primary_goal],['Platforms',channels.join(', ')||'Not specified'],['Experience',formData.experience||'Not specified'],['Posting rhythm',formData.posting_frequency||'Not specified'],['Biggest challenge',formData.biggest_challenge||'Not specified'],['Found us on',formData.source],['Public profile',formData.profile_link||'Not added']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{formData.bio&&<p>{formData.bio}</p>}<button type="button" className="onboarding-review-edit" onClick={()=>setStep(0)}>Edit your answers<ArrowLeft size={13}/></button></div>}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-4 mt-8 pt-4 border-t border-gray-800">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={handlePrev} disabled={loading || uploadingImage} className="px-6 border-gray-700 hover:bg-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button 
              type="submit" 
              className="onboarding-continue flex-1"
              disabled={!isStepValid() || loading || uploadingImage}
              isLoading={loading}
            >
              {step === TOTAL_STEPS - 1 ? previewMode ? 'Finish preview' : 'Let’s get started' : 'Continue'}
              {step < TOTAL_STEPS - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
