-- 0002 — relax users.id FK + add badges table + headline column
--
-- Drops the FK from public.users.id → auth.users.id so:
--   • dev/test code can INSERT users without going through Supabase Auth
--   • soft-deletes work: a deleted auth.users row leaves public.users intact
--     (so leaderboard history doesn't vanish on account deletion)
--
-- The on-signup trigger still works — it inserts using new.id from auth.users,
-- which is a valid UUID; we just no longer FK-enforce that linkage.

-- 1) Drop the FK constraint on users.id ------------------------------------

alter table public.users
  drop constraint if exists users_id_fkey;

-- 2) Badges table ----------------------------------------------------------

create table if not exists public.user_badges (
  user_id     uuid not null references public.users(id) on delete cascade,
  badge_id    text not null,
  earned_at   timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create index if not exists user_badges_user_idx on public.user_badges (user_id);

alter table public.user_badges enable row level security;

-- Public read for the profile page; only service role writes.
create policy "user_badges public read"
  on public.user_badges for select using (true);

-- 3) Add headline + elo_changes to games for the share viewer --------------

alter table public.games
  add column if not exists headline       text,
  add column if not exists elo_changes    jsonb;
