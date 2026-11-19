-- Seed one task for the MCP flow test account, and remove the synthetic
-- binding row used for the earlier logic probe (only hook-recorded bindings
-- should remain).
insert into public.tasks (user_id, title, is_completed)
values ('f93533a0-250c-48f2-90f2-7e52958a72b7', 'Verify Boostd MCP staging flow', false)
returning id, title
