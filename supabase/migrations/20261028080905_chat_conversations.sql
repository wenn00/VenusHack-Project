-- Requires the existing public.chat_messages table. Apply and verify on staging
-- before shipping the conversations UI. No existing messages are deleted.
begin;
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now(),
  client_request_id text not null,
  unique (user_id, client_request_id),
  unique (user_id, id)
);
alter table public.chat_conversations enable row level security;
revoke all on public.chat_conversations from anon, authenticated;
grant select, insert, update, delete on public.chat_conversations to authenticated;
create policy conversations_select on public.chat_conversations for select to authenticated
  using ((select auth.uid()) = user_id);
create policy conversations_insert on public.chat_conversations for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy conversations_update on public.chat_conversations for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy conversations_delete on public.chat_conversations for delete to authenticated
  using ((select auth.uid()) = user_id);
create index chat_conversations_user_created on public.chat_conversations(user_id, created_at desc);

alter table public.chat_messages add column conversation_id uuid;
alter table public.chat_messages add column client_request_id text;
-- Composite foreign key prevents attaching one's own message to another user's
-- conversation, even if a malicious client knows that conversation's UUID.
alter table public.chat_messages add constraint chat_messages_conversation_owner
  foreign key (user_id, conversation_id)
  references public.chat_conversations(user_id, id) on delete cascade;
alter table public.chat_messages add constraint chat_messages_request_unique
  unique (user_id, client_request_id);
create index chat_messages_conversation_time on public.chat_messages(user_id, conversation_id, created_at desc, id desc);

-- Keep null conversation_id for legacy rows and old clients. New clients expose
-- these as a read-only "Earlier conversation", without guessing thread boundaries.
-- Restrictive policies enforce ownership alongside any pre-existing permissive
-- policies instead of relying on their undocumented production definitions.
alter table public.chat_messages enable row level security;
create policy chat_message_owner_guard on public.chat_messages as restrictive
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy chat_message_owner_access on public.chat_messages
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.chat_messages from anon;
grant select, insert, update, delete on public.chat_messages to authenticated;
commit;
