-- Apply only after reviewing the grants against the target database.
begin;

-- Existing policies call these helpers as anonymous and signed-in users.
grant execute on function public.is_admin(), public.is_conversation_participant(uuid)
  to anon, authenticated, service_role;
revoke execute on function public.is_admin(), public.is_conversation_participant(uuid)
  from public;

-- Existing triggers execute these functions through their registered bindings.
revoke execute on function
  public.auto_reply_support_message(),
  public.handle_new_user(),
  public.handle_ticket_reply(),
  public.notify_on_collaboration_request(),
  public.notify_user_on_admin_message(),
  public.write_admin_audit_log()
  from public;

commit;
