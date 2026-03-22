import { createClient } from '@supabase/supabase-js';

// These will be populated from the Settings page or environment variables
const supabaseUrl = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = localStorage.getItem('supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co';
};
