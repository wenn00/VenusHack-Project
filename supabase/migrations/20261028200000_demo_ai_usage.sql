-- Per-visitor AI call counter for the conference demo. Only the ai-chat
-- Edge Function (service role) touches it: visitors can neither read nor
-- reset their own count from the app.
begin;
create table public.demo_ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calls integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.demo_ai_usage enable row level security;
revoke all on public.demo_ai_usage from anon, authenticated;

-- Record one call and return the new total in a single statement, so
-- concurrent requests from the same visitor cannot both read a stale count.
create function public.increment_demo_ai_usage(p_user_id uuid)
returns integer
language sql
set search_path = ''
as $$
  insert into public.demo_ai_usage (user_id, calls, updated_at)
  values (p_user_id, 1, now())
  on conflict (user_id) do update
    set calls = public.demo_ai_usage.calls + 1, updated_at = now()
  returning calls;
$$;
revoke execute on function public.increment_demo_ai_usage(uuid) from public, anon, authenticated;
grant execute on function public.increment_demo_ai_usage(uuid) to service_role;
commit;
