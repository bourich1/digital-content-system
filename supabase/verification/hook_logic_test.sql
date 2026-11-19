with claims as (
  select jsonb_build_object('aud','authenticated','role','authenticated','sub','7c07e867-3919-4caa-8214-6fdeeadc1ba4','session_id','3f6f322f-ff0f-43eb-9bf4-074ae7acb00d','client_id','8f0002d7-49bb-4966-86b8-0c76cfea2467') as c
),
case_matched as (
  select boostd_mcp_private.custom_access_token(jsonb_build_object('claims',(select c from claims),'user_id','7c07e867-3919-4caa-8214-6fdeeadc1ba4')) as out_event
),
case_other_client as (
  select boostd_mcp_private.custom_access_token(jsonb_build_object('claims',jsonb_set((select c from claims),'{client_id}',to_jsonb('3a591c2c-c3c0-4236-be80-7edf783b1a3f'::text)),'user_id','7c07e867-3919-4caa-8214-6fdeeadc1ba4')) as out_event
),
case_no_client as (
  select boostd_mcp_private.custom_access_token(jsonb_build_object('claims',jsonb_build_object('aud','authenticated','role','authenticated','sub','7c07e867-3919-4caa-8214-6fdeeadc1ba4','session_id','3f6f322f-ff0f-43eb-9bf4-074ae7acb00d'),'user_id','7c07e867-3919-4caa-8214-6fdeeadc1ba4')) as out_event
)
select 'matched' as scenario, (select out_event->'claims'->>'aud' from case_matched) as aud, (select out_event->'claims'->>'role' from case_matched) as role
union all select 'other_client', (select out_event->'claims'->>'aud' from case_other_client), (select out_event->'claims'->>'role' from case_other_client)
union all select 'no_client', (select out_event->'claims'->>'aud' from case_no_client), (select out_event->'claims'->>'role' from case_no_client)
