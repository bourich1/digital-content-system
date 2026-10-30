import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMfa } from '@/contexts/MfaContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import TurnstileCaptcha from '@/components/TurnstileCaptcha';
import { ShieldCheck, AlertCircle, Eye, EyeOff, Lock } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { refresh: refreshMfa } = useMfa();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captchaSiteKey && !captchaToken) {
      setError('Please complete security verification.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const options = captchaSiteKey ? { captchaToken } : undefined;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options,
      });

      if (authError || !authData.session) {
        setError('Invalid credentials.');
        return;
      }

      // Strictly verify administrator role server/database-side
      const { data: isAdmin, error: roleError } = await supabase.rpc('verify_admin_access');

      if (roleError || !isAdmin) {
        // Normal user attempted admin login: DENY ACCESS & immediately terminate session
        await supabase.auth.signOut();
        // Do not leak whether the email exists or is an administrator
        setError('Invalid credentials.');
        return;
      }

      // Admin verified: refresh auth and MFA context
      await refreshProfile();
      await refreshMfa();

      // Navigate to admin workspace; decideAccess will gate on MFA (aal2)
      navigate('/admin', { replace: true });
    } catch {
      setError('Invalid credentials.');
    } finally {
      setLoading(false);
      setCaptchaToken('');
      setCaptchaReset(value => value + 1);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-6 text-white font-sans selection:bg-orange-500/30">
      <div className="w-full max-w-md bg-[#0e0e10] border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle orange accent glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-4 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Administrator Access</h1>
          <p className="text-zinc-400 text-sm mt-1">Authorized personnel only. Multi-factor authentication enforced.</p>
        </div>

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-red-400 text-sm mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Admin Email"
            type="email"
            autoComplete="username"
            placeholder="admin@boostd.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="bg-black/60 border-zinc-800 focus:border-orange-500 text-white"
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="bg-black/60 border-zinc-800 focus:border-orange-500 text-white"
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-zinc-500 hover:text-white transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          {captchaSiteKey && (
            <div className="flex justify-center pt-2">
              <TurnstileCaptcha
                siteKey={captchaSiteKey}
                theme="dark"
                action="admin-login"
                resetKey={captchaReset}
                onToken={setCaptchaToken}
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || Boolean(captchaSiteKey && !captchaToken)}
            isLoading={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-5 text-base font-semibold rounded-xl shadow-lg shadow-orange-600/20 transition-all mt-2"
          >
            Authenticate
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-zinc-600">
          <Link to="/" className="hover:text-zinc-400 transition-colors">
            ← Return to BoostD
          </Link>
        </div>
      </div>
    </div>
  );
}

