import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://erzksxgbbdxzjdtssuyv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyemtzeGdiYmR4empkdHNzdXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDkxMjYsImV4cCI6MjA4ODQyNTEyNn0.UHV5IKrDgTCszULp0RGGibM1LaevzyHDVHbSO_23L0A';

// Reuse the client across Vite hot reloads so obsolete clients cannot retain
// token refresh timers and compete for the same browser auth lock.
const hot = (import.meta as ImportMeta & { hot?: { data: { supabaseClient?: SupabaseClient } } }).hot;
export const supabase = hot?.data.supabaseClient || createClient(supabaseUrl, supabaseKey);
if (hot) hot.data.supabaseClient = supabase;

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co';
};
