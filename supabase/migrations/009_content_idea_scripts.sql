-- Structured scripts share the idea's existing ownership and RLS policies.
alter table public.content_ideas
  add column if not exists script_hook text not null default '',
  add column if not exists script_body text not null default '',
  add column if not exists script_cta text not null default '';
