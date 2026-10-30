import { supabase } from '@/lib/supabase';

// RLS still authorizes every request. Explicit ownership filters are also
// required because an administrator's session can read more than one workspace.
export function workspaceRows(table: 'content_ideas' | 'tasks' | 'collaborations', userId: string, columns = '*') {
  if (!userId) throw new Error('A workspace user is required');
  const query = supabase.from(table).select(columns);
  return table === 'collaborations'
    ? query.or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    : query.eq('user_id', userId);
}
