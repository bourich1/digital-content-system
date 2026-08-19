import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://erzksxgbbdxzjdtssuyv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyemtzeGdiYmR4empkdHNzdXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDkxMjYsImV4cCI6MjA4ODQyNTEyNn0.UHV5IKrDgTCszULp0RGGibM1LaevzyHDVHbSO_23L0A';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co';
};
