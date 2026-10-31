import { PGlite } from './node_modules/@electric-sql/pglite/dist/index.js';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
const ddl = `
create role anon; create role authenticated;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.role() returns text language sql stable as $$select auth.jwt()->>'role'$$;
create function storage.foldername(text) returns text[] language sql as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
create table public.profiles(id uuid primary key default gen_random_uuid(),role text default 'user',status text default 'active',can_access_tools boolean default true,blocked_features text[] default '{}',email text,created_at timestamptz default now(),full_name text,username text,avatar_url text,points integer default 0,day_streak integer default 0,work_hours integer default 0,focus_sessions integer default 0,survey_completed boolean default false);
create table public.collaborations(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,partner_id uuid references profiles,partner_status text default 'pending',title text not null,brand_name text,notes text);
create table public.collaboration_images(id uuid primary key default gen_random_uuid(),collaboration_id uuid references collaborations on delete cascade,url text);
create table public.support_messages(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,sender_id uuid references profiles,content text,is_read boolean default false);
create table public.onboarding_surveys(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,source text,goals text[],experience_level text,primary_platform text,country text,language text,profession text,satisfaction integer);
create table public.focus_sessions(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,duration_minutes integer,completed boolean);
create table public.in_app_notifications(id uuid primary key default gen_random_uuid(),user_id uuid references profiles,collab_id uuid,title text,message text);
create table public.conversations(id uuid primary key default gen_random_uuid(),participant_hash text unique);
create table public.conversation_participants(conversation_id uuid references conversations,user_id uuid references profiles,last_read_at timestamptz,unique(conversation_id,user_id));
create table public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid,content text,is_read boolean);
create table public.tasks(id uuid primary key default gen_random_uuid(),user_id uuid);
create table public.calendar_events(id uuid primary key default gen_random_uuid(),user_id uuid);
create table public.content_ideas(id uuid primary key default gen_random_uuid(),user_id uuid);
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid,status text);
create table public.support_tickets(id uuid primary key default gen_random_uuid(),user_id uuid);
create table public.platform_settings(id text primary key,setting_value jsonb);
create table public.feature_flags(id uuid primary key default gen_random_uuid());
create table public.tools(id uuid primary key default gen_random_uuid());
create table public.products(id uuid primary key default gen_random_uuid());
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to anon,authenticated;
grant all on all tables in schema public to authenticated;
grant all on all tables in schema storage to authenticated;
`;
try {
  await db.exec(ddl);
  for (const table of ['profiles','collaborations','collaboration_images','support_messages','onboarding_surveys','focus_sessions','tasks','calendar_events','content_ideas','reports','support_tickets','platform_settings','feature_flags','tools','products']) {
    await db.exec(`alter table public.${table} enable row level security;`);
  }
  const files = ['001_profile_self_escalation_guard.sql','002_private_profiles_and_access_guards.sql','003_security_definer_search_path_and_legacy_tables.sql','004_rpc_authorization.sql','005_admin_audit_log.sql','006_avatars_bucket_hardening.sql','007_admin_mfa_enforcement.sql','008_comprehensive_security_hardening.sql'];
  for (const file of files) {
    if(file.startsWith('004_')) {
      // Minimal 004 prerequisite for 008. The unrelated search RPC in the
      // repository's 004 contains a pre-existing btrim(leading ...) syntax error.
      await db.exec(`create table public.rpc_rate_limit(user_id uuid not null,operation text not null,window_start timestamptz not null,calls integer not null default 0,primary key(user_id,operation)); alter table rpc_rate_limit enable row level security; revoke all on rpc_rate_limit from public,anon,authenticated;`);
      continue;
    }
    await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
  }
  await db.exec(`
    revoke all on function public.respond_to_collaboration(uuid,text),public.get_or_create_direct_conversation(uuid),public.get_profiles_by_usernames(text[]) from public,anon;
    grant execute on function public.respond_to_collaboration(uuid,text),public.get_or_create_direct_conversation(uuid),public.get_profiles_by_usernames(text[]) to authenticated;
    create policy own_profile_read on profiles for select using(id=auth.uid() or public.is_admin());
    create policy own_profile_update on profiles for update using(id=auth.uid() or public.is_admin());
    create policy own_surveys on onboarding_surveys for all using(user_id=auth.uid()) with check(user_id=auth.uid());
    create policy own_support_read on support_messages for select using(user_id=auth.uid());
    insert into profiles(role,username,email) values('admin','fixture_admin','admin@example.invalid'),('user','fixture_owner','owner@example.invalid'),('user','fixture_partner','partner@example.invalid');
  `);
  const script = await readFile('supabase/verification/2026-10-30_008_comprehensive_security_verification.sql','utf8');
  const snapshot = async () => (await db.query(`select jsonb_build_object('profiles',(select jsonb_agg(to_jsonb(p) order by id) from profiles p),'collaborations',(select count(*) from collaborations),'audit',(select count(*) from admin_audit_log),'surveys',(select count(*) from onboarding_surveys),'focus',(select count(*) from focus_sessions),'messages',(select count(*) from support_messages),'notifications',(select count(*) from in_app_notifications),'rate',(select count(*) from rpc_rate_limit)) as s`)).rows[0].s;
  const before = await snapshot();
  const output = await db.exec(script);
  const detail = output.find(x=>x.rows?.[0]?.test_id);
  const summary = output.find(x=>x.rows?.[0]?.migration_008_verification)?.rows[0].migration_008_verification;
  assert.ok(detail && summary,'Both result sets must exist');
  assert.deepEqual(await snapshot(),before,'ALL application rows/counters/audits must roll back');
  const unexpected = detail.rows.filter(x=>x.result==='FAIL' && x.category!=='legacy_tables');
  console.log(JSON.stringify({summary,unexpected},null,2));
  assert.deepEqual(unexpected,[],'Unexpected verification failures');
  assert.equal(detail.rows.find(x=>x.test_id==='T11.products').result,'FAIL','Must detect 003 legacy OR-policy bypass');
  // Negative control: deliberately reopen partner UPDATE in the disposable DB.
  await db.exec(`create policy unsafe_partner_update on collaborations for update using(partner_id=auth.uid()); create policy unsafe_partner_delete on collaborations for delete using(partner_id=auth.uid());`);
  const negative = await db.exec(script);
  const negativeDetails = negative.find(x=>x.rows?.[0]?.test_id).rows;
  assert.equal(negativeDetails.find(x=>x.test_id==='T03.partner_owner_fields_denied').result,'FAIL');
  assert.equal(negativeDetails.find(x=>x.test_id==='T03.partner_delete_denied').result,'FAIL');
  assert.deepEqual(await snapshot(),before,'Even unexpectedly permitted writes must roll back');
  await db.exec('drop policy unsafe_partner_update on collaborations; drop policy unsafe_partner_delete on collaborations');
  await db.exec(`create function public.unknown_probe_trigger() returns trigger language plpgsql as $$begin return new; end$$; create trigger unknown_probe before update on profiles for each row execute function public.unknown_probe_trigger();`);
  const unsafe = await db.exec(script);
  const unsafeDetails=unsafe.find(x=>x.rows?.[0]?.test_id).rows;
  assert.equal(unsafeDetails.find(x=>x.test_id==='T00.safe_write_preflight').result,'MANUAL_CHECK');
  assert.equal(unsafeDetails.find(x=>x.test_id==='T07.valid_60_minutes').result,'MANUAL_CHECK');
  assert.deepEqual(await snapshot(),before);
  await db.exec('drop trigger unknown_probe on profiles; drop function public.unknown_probe_trigger()');
  // Missing identities: independent positive tests must become MANUAL_CHECK.
  await db.exec(`update profiles set role='admin' where role='user'`);
  const missing = await db.exec(script);
  assert.equal(missing.find(x=>x.rows?.[0]?.test_id).rows.find(x=>x.test_id==='T03.owner_read').result,'MANUAL_CHECK');
  await writeFile('artifacts/verification-runtime/results.json',JSON.stringify({summary,details:detail.rows,rollback_verified:true,negative_control_verified:true,missing_accounts_verified:true,unknown_trigger_safety_verified:true},null,2));
  console.log('PASS: real PostgreSQL execution, rollback equality, unsafe-policy negative control, missing-account handling.');
} catch (error) {
  console.error(error.message, error.cause || '', error.where || '', error.position || '');
  process.exitCode=1;
} finally { await db.close(); }
