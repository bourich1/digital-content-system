import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'motion/react';
import { 
  AlertCircle, Eye, EyeOff, Facebook, Instagram, 
  Twitter, Linkedin, Youtube, Mail, Lock
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('signup') === 'true';
  });
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('signup') === 'true') {
      setIsSignUp(true);
    }
  }, [location.search]);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    const errorMsg = hashParams.get('error_description') || hashParams.get('error') || 
                     queryParams.get('error_description') || queryParams.get('error');
                     
    if (errorMsg) {
      setError("Google/Supabase Error: " + decodeURIComponent(errorMsg).replace(/\+/g, ' '));
      setIsSignUp(true);
      window.history.replaceState(null, '', window.location.pathname);
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        navigate('/');
      }
    });
    
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingEmail(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoadingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex w-full overflow-hidden font-sans">
      
      {/* Left Column - Authentication Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 z-10 relative">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain brightness-0 invert" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isSignUp ? "Create your account!" : "Login to your account!"}
            </h1>
            <p className="text-zinc-400 text-sm">
              Enter your registered email address and password to {isSignUp ? "sign up" : "login"}!
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 text-red-400 text-sm mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="break-words w-full font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-4">
              <Input 
                label="Email" 
                type="email" 
                placeholder="eg. user@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="bg-zinc-900 border-zinc-800 focus:border-orange-500 text-white"
              />
              <Input 
                label="Password" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="bg-zinc-900 border-zinc-800 focus:border-orange-500 text-white"
                endIcon={
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="hover:text-white focus:outline-none transition-colors flex items-center justify-center text-zinc-500"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-orange-600 focus:ring-orange-600 focus:ring-offset-black" />
                  <span className="text-zinc-400 group-hover:text-white transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-orange-500 hover:text-orange-400 font-medium transition-colors">
                  Forgot Password ?
                </a>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-500 text-white py-6 text-lg font-semibold rounded-xl shadow-lg shadow-orange-600/20" 
              isLoading={isLoadingEmail}
            >
              {isSignUp ? 'Sign Up' : 'Login'}
            </Button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-black px-4 text-zinc-500">Or {isSignUp ? 'sign up' : 'login'} with</span>
              </div>
            </div>

            <Button 
              type="button"
              onClick={handleGoogleLogin} 
              className="w-full bg-[#0a0a0a] border border-zinc-800 hover:bg-zinc-900 text-white flex items-center justify-center gap-3 py-6 text-base rounded-xl transition-colors"
              isLoading={isLoadingGoogle}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
            
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-zinc-400 hover:text-white transition-colors text-sm"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>

            <div className="text-center mt-6 text-xs text-zinc-500 space-x-3">
              <Link to="/privacy" className="hover:text-zinc-400 underline underline-offset-2 transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-zinc-400 underline underline-offset-2 transition-colors">
                Terms of Service
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column - Promotional Graphic */}
      <div className="hidden lg:flex w-1/2 bg-[#0a0a0a] m-4 rounded-[2rem] border border-gray-800 relative overflow-hidden flex-col items-center justify-between p-12">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Top Text */}
        <div className="text-center z-10 mt-12">
          <h2 className="text-4xl font-bold text-white tracking-tight">
            Let's grow your <span className="text-orange-500">social media</span><br />with manage content
          </h2>
        </div>

        {/* Orbit Graphic */}
        <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center z-10 my-8">
          
          {/* Central Logo */}
          <div className="relative z-20 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="App Logo" 
              className="w-24 h-24 object-contain brightness-0 invert drop-shadow-[0_0_30px_rgba(234,88,12,0.8)]" 
            />
          </div>

          {/* Inner Ring */}
          <div className="absolute w-[50%] h-[50%] rounded-full border border-white/10 animate-[spin_30s_linear_infinite]" />
          <div className="absolute w-[50%] h-[50%] rounded-full animate-[spin_30s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#1877F2] rounded-full flex items-center justify-center animate-[spin_30s_linear_infinite_reverse] shadow-lg">
              {/* Facebook */}
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/>
              </svg>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 bg-black border border-gray-700 rounded-full flex items-center justify-center animate-[spin_30s_linear_infinite_reverse] shadow-lg">
              {/* X / Twitter */}
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
          </div>

          {/* Middle Ring */}
          <div className="absolute w-[75%] h-[75%] rounded-full border border-white/5 animate-[spin_45s_linear_infinite_reverse]" />
          <div className="absolute w-[75%] h-[75%] rounded-full animate-[spin_45s_linear_infinite_reverse]">
             <div className="absolute top-[15%] right-[5%] w-12 h-12 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] rounded-full flex items-center justify-center animate-[spin_45s_linear_infinite] shadow-lg">
              {/* Instagram */}
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.181a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/>
              </svg>
            </div>
            <div className="absolute bottom-[15%] left-[5%] w-12 h-12 bg-[#0077b5] rounded-full flex items-center justify-center animate-[spin_45s_linear_infinite] shadow-lg">
              {/* LinkedIn */}
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286z"/>
              </svg>
            </div>
          </div>

          {/* Outer Ring */}
          <div className="absolute w-[100%] h-[100%] rounded-full border border-white/10 animate-[spin_60s_linear_infinite]" />
          <div className="absolute w-[100%] h-[100%] rounded-full animate-[spin_60s_linear_infinite]">
            <div className="absolute bottom-[5%] right-[20%] w-12 h-12 bg-white rounded-full flex items-center justify-center animate-[spin_60s_linear_infinite_reverse] shadow-lg">
              {/* YouTube */}
              <svg className="w-12 h-12 text-[#FF0000]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.498 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div className="absolute top-[15%] left-[5%] w-12 h-12 bg-black border border-gray-700 rounded-full flex items-center justify-center animate-[spin_60s_linear_infinite_reverse] shadow-lg">
              {/* TikTok */}
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.23-.9 4.45-2.39 6.08-1.5 1.65-3.6 2.65-5.83 2.9-2.26.24-4.58-.2-6.47-1.4-1.9-1.23-3.23-3.21-3.67-5.4-.44-2.18-.08-4.51 1.05-6.39 1.14-1.89 3.04-3.3 5.16-3.83 2.1-.53 4.36-.34 6.27.67l.03 4.12c-1.34-1.07-3.21-1.39-4.83-.8-1.63.58-2.9 2.01-3.3 3.66-.4 1.66.02 3.46 1.19 4.73 1.17 1.28 2.99 1.83 4.69 1.49 1.7-.34 3.12-1.57 3.73-3.18.6-1.62.53-3.44.5-5.15.01-4.71.01-9.42.02-14.13z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="text-center z-10 mb-8 max-w-sm">
          <p className="text-zinc-400 text-sm">
            Compatible with <span className="font-semibold text-white">Instagram, Twitter, LinkedIn</span> and most <span className="font-semibold text-white">web platforms</span> for a seamless content managing experience everywhere.
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-6 h-1.5 rounded-full bg-orange-600"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
          </div>
        </div>
      </div>

    </div>
  );
}
