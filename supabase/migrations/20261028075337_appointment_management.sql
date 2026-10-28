-- Apply to the intended Kairos database after reviewing its existing schema.
begin;
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  visit_date date not null,
  provider text not null default '' check (char_length(provider) <= 200),
  notes text not null default '' check (char_length(notes) <= 2000),
  summary jsonb,
  created_at timestamptz not null default now()
);
create index appointments_user_date on public.appointments(user_id, visit_date desc);
alter table public.appointments enable row level security;
create policy "Own appointments" on public.appointments for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.appointments from anon, authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
commit;
