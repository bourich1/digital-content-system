import SocialOrbit from '@/components/SocialOrbit';
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
            <img src="/logo white.png" alt="BoostD" className="h-12 w-auto object-contain " />
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

        <SocialOrbit />

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
