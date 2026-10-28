-- Run AFTER both migrations, or prepend them without their BEGIN/COMMIT lines.
-- All rows below are synthetic, all identifiers are random, and ROLLBACK is mandatory.
-- Verify auth.users insert triggers have no nontransactional external side effects first.
begin;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
select set_config('kairos.test_user_a', gen_random_uuid()::text, true),
       set_config('kairos.test_user_b', gen_random_uuid()::text, true),
       set_config('kairos.test_visit_a', gen_random_uuid()::text, true),
       set_config('kairos.test_visit_b', gen_random_uuid()::text, true),
       set_config('kairos.test_chat_a', gen_random_uuid()::text, true),
       set_config('kairos.test_chat_b', gen_random_uuid()::text, true),
       set_config('kairos.test_message_a', gen_random_uuid()::text, true),
       set_config('kairos.test_message_b', gen_random_uuid()::text, true),
       set_config('kairos.test_legacy_a', gen_random_uuid()::text, true);

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
select current_setting('kairos.test_user_a')::uuid,
       'kairos-test-' || current_setting('kairos.test_user_a') || '@example.invalid',
       'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"Synthetic rollback test A"}'::jsonb
union all
select current_setting('kairos.test_user_b')::uuid,
       'kairos-test-' || current_setting('kairos.test_user_b') || '@example.invalid',
       'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb,
       '{"full_name":"Synthetic rollback test B"}'::jsonb;

-- Seed B as the SQL Editor's privileged role so A can attempt forbidden access.
insert into public.appointments(id,user_id,title,visit_date)
values(current_setting('kairos.test_visit_b')::uuid,current_setting('kairos.test_user_b')::uuid,'Synthetic B',current_date);
insert into public.chat_conversations(id,user_id,title,client_request_id)
values(current_setting('kairos.test_chat_b')::uuid,current_setting('kairos.test_user_b')::uuid,'Synthetic B','synthetic-b');
insert into public.chat_messages(id,user_id,conversation_id,role,content,client_request_id)
values(current_setting('kairos.test_message_b')::uuid,current_setting('kairos.test_user_b')::uuid,current_setting('kairos.test_chat_b')::uuid,'user','Synthetic B','synthetic-b');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('kairos.test_user_a'), true),
       set_config('request.jwt.claims', json_build_object('sub',current_setting('kairos.test_user_a'),'role','authenticated')::text,true);

do $$
declare n integer; same_id uuid; denied boolean;
begin
  if auth.uid() <> current_setting('kairos.test_user_a')::uuid then raise exception 'JWT A not applied'; end if;
  insert into public.appointments(id,user_id,title,visit_date,provider,notes)
  values(current_setting('kairos.test_visit_a')::uuid,auth.uid(),'Synthetic A',current_date,'Synthetic provider','Synthetic note');
  update public.appointments set summary='{"summary":{"patient_context":["Synthetic only"],"urgent_concerns":[]},"bpRows":[],"moodRows":[],"generatedAt":"2026-10-28T00:00:00Z"}'::jsonb
  where id=current_setting('kairos.test_visit_a')::uuid;
  get diagnostics n = row_count;
  if n<>1 then raise exception 'Own appointment update failed'; end if;
  if not exists(select 1 from public.appointments where id=current_setting('kairos.test_visit_a')::uuid and summary->'summary'->'patient_context'->>0='Synthetic only') then raise exception 'Summary roundtrip failed'; end if;
  if exists(select 1 from public.appointments where id=current_setting('kairos.test_visit_b')::uuid) then raise exception 'A can read B appointment'; end if;
  update public.appointments set title='Forbidden' where id=current_setting('kairos.test_visit_b')::uuid;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'A can update B appointment'; end if;
  delete from public.appointments where id=current_setting('kairos.test_visit_b')::uuid;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'A can delete B appointment'; end if;
  denied=false;
  begin
    insert into public.appointments(user_id,title,visit_date) values(current_setting('kairos.test_user_b')::uuid,'Forbidden',current_date);
  exception when insufficient_privilege then denied=true; end;
  if not denied then raise exception 'A can insert B appointment'; end if;
  denied=false;
  begin
    update public.appointments set user_id=current_setting('kairos.test_user_b')::uuid where id=current_setting('kairos.test_visit_a')::uuid;
  exception when insufficient_privilege then denied=true; end;
  if not denied then raise exception 'A can transfer appointment ownership'; end if;
  denied=false;
  begin
    insert into public.appointments(user_id,title,visit_date) values(auth.uid(),'',current_date);
  exception when check_violation then denied=true; end;
  if not denied then raise exception 'Empty appointment title accepted'; end if;

  insert into public.chat_conversations(id,user_id,title,client_request_id)
  values(current_setting('kairos.test_chat_a')::uuid,auth.uid(),'Synthetic A','synthetic-a');
  insert into public.chat_conversations(user_id,title,client_request_id)
  values(auth.uid(),'Synthetic A retry','synthetic-a')
  on conflict(user_id,client_request_id) do update set title=excluded.title returning id into same_id;
  if same_id<>current_setting('kairos.test_chat_a')::uuid then raise exception 'Conversation retry duplicated'; end if;
  insert into public.chat_messages(id,user_id,conversation_id,role,content,client_request_id)
  values(current_setting('kairos.test_message_a')::uuid,auth.uid(),current_setting('kairos.test_chat_a')::uuid,'user','Synthetic A','synthetic-a');
  insert into public.chat_messages(user_id,conversation_id,role,content,client_request_id)
  values(auth.uid(),current_setting('kairos.test_chat_a')::uuid,'user','Synthetic A retry','synthetic-a')
  on conflict(user_id,client_request_id) do update set content=excluded.content returning id into same_id;
  if same_id<>current_setting('kairos.test_message_a')::uuid then raise exception 'Message retry duplicated'; end if;
  if not exists(select 1 from public.chat_messages where id=same_id and content='Synthetic A retry') then raise exception 'Message roundtrip failed'; end if;
  -- Legacy rows remain writable by old clients and readable by their owner.
  insert into public.chat_messages(id,user_id,role,content)
  values(current_setting('kairos.test_legacy_a')::uuid,auth.uid(),'user','Synthetic legacy A');
  if not exists(select 1 from public.chat_messages where id=current_setting('kairos.test_legacy_a')::uuid and conversation_id is null) then raise exception 'Legacy compatibility failed'; end if;
  if exists(select 1 from public.chat_conversations where id=current_setting('kairos.test_chat_b')::uuid) then raise exception 'A can read B conversation'; end if;
  if exists(select 1 from public.chat_messages where id=current_setting('kairos.test_message_b')::uuid) then raise exception 'A can read B message'; end if;
  update public.chat_messages set content='Forbidden' where id=current_setting('kairos.test_message_b')::uuid;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'A can update B message'; end if;
  delete from public.chat_conversations where id=current_setting('kairos.test_chat_b')::uuid;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'A can delete B conversation'; end if;
  denied=false;
  begin
    insert into public.chat_conversations(user_id,title,client_request_id) values(current_setting('kairos.test_user_b')::uuid,'Forbidden','forbidden');
  exception when insufficient_privilege then denied=true; end;
  if not denied then raise exception 'A can insert B conversation'; end if;
  denied=false;
  begin
    update public.chat_conversations set user_id=current_setting('kairos.test_user_b')::uuid where id=current_setting('kairos.test_chat_a')::uuid;
  exception when insufficient_privilege then denied=true; end;
  if not denied then raise exception 'A can transfer conversation ownership'; end if;
  denied=false;
  begin
    insert into public.chat_messages(user_id,conversation_id,role,content) values(auth.uid(),current_setting('kairos.test_chat_b')::uuid,'user','Forbidden cross-owner attachment');
  exception when foreign_key_violation then denied=true; end;
  if not denied then raise exception 'Cross-owner conversation attachment accepted'; end if;
  denied=false;
  begin
    insert into public.chat_messages(user_id,conversation_id,role,content) values(current_setting('kairos.test_user_b')::uuid,current_setting('kairos.test_chat_b')::uuid,'user','Forbidden sender');
  exception when insufficient_privilege then denied=true; end;
  if not denied then raise exception 'A can insert B message'; end if;
  delete from public.chat_conversations where id=current_setting('kairos.test_chat_a')::uuid;
  if exists(select 1 from public.chat_messages where id=current_setting('kairos.test_message_a')::uuid) then raise exception 'Conversation delete did not cascade'; end if;
  if not exists(select 1 from public.chat_messages where id=current_setting('kairos.test_legacy_a')::uuid) then raise exception 'Conversation delete removed legacy row'; end if;
end $$;

-- Repeat isolation from B and confirm A's malicious attempts did not alter B.
select set_config('request.jwt.claim.sub', current_setting('kairos.test_user_b'), true),
       set_config('request.jwt.claims', json_build_object('sub',current_setting('kairos.test_user_b'),'role','authenticated')::text,true);
do $$
begin
  if exists(select 1 from public.appointments where id=current_setting('kairos.test_visit_a')::uuid) then raise exception 'B can read A appointment'; end if;
  if exists(select 1 from public.chat_messages where id=current_setting('kairos.test_legacy_a')::uuid) then raise exception 'B can read A legacy row'; end if;
  if not exists(select 1 from public.appointments where id=current_setting('kairos.test_visit_b')::uuid and title='Synthetic B') then raise exception 'B appointment altered'; end if;
  if not exists(select 1 from public.chat_messages where id=current_setting('kairos.test_message_b')::uuid and content='Synthetic B') then raise exception 'B message altered'; end if;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{"role":"anon"}',true);
do $$
begin
  begin
    if exists(select 1 from public.appointments where id=current_setting('kairos.test_visit_a')::uuid) then raise exception 'Unauthenticated appointment access'; end if;
  exception when insufficient_privilege then null; end;
  begin
    if exists(select 1 from public.chat_conversations where id=current_setting('kairos.test_chat_b')::uuid) then raise exception 'Unauthenticated conversation access'; end if;
  exception when insufficient_privilege then null; end;
  begin
    if exists(select 1 from public.chat_messages where id=current_setting('kairos.test_message_b')::uuid) then raise exception 'Unauthenticated message access'; end if;
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: ownership, constraints, upsert, summary, legacy and cascade; rolling back all synthetic rows' as validation;
rollback;
