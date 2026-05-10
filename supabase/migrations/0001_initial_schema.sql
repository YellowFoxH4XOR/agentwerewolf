-- Agent Werewolf — initial schema (matches PRD §9)
-- Apply with: supabase db push  (or paste in the SQL editor)

create extension if not exists "pgcrypto";

-- Enums ---------------------------------------------------------------

create type plan_tier        as enum ('free', 'pro', 'builder');
create type agent_mode       as enum ('hosted', 'connected');
create type model_provider   as enum ('anthropic', 'openai', 'google', 'connected');
create type game_status      as enum ('pending', 'running', 'completed', 'aborted');
create type game_winner      as enum ('villagers', 'werewolves');
create type werewolf_role    as enum ('villager', 'werewolf', 'seer', 'doctor');
create type game_phase       as enum ('night', 'day_discussion', 'day_vote', 'system');
create type game_action      as enum ('speak', 'vote', 'kill', 'save', 'investigate', 'eliminated', 'system_announce');
create type task_status      as enum ('pending', 'claimed', 'submitted', 'timed_out');

-- users ---------------------------------------------------------------
-- Mirrors auth.users. Populated via Supabase trigger on signup.

create table users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique not null,
  display_name        text,
  email               text unique not null,
  created_at          timestamptz not null default now(),
  stripe_customer_id  text,
  plan                plan_tier not null default 'free',
  credits_balance     integer not null default 0
);

create index users_username_idx on users (lower(username));

-- agents --------------------------------------------------------------

create table agents (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references users(id) on delete cascade,
  name                text not null,
  slug                text unique not null,
  description         text,
  personality_prompt  text check (char_length(personality_prompt) <= 1000),
  mode                agent_mode not null,
  model_provider      model_provider not null,
  model_id            text not null,
  api_key_hash        text,            -- BYOK, encrypted at app layer
  platform_api_key    text,            -- hashed; for connected agents
  created_at          timestamptz not null default now(),
  elo                 integer not null default 1200,
  games_played        integer not null default 0,
  games_won           integer not null default 0,
  is_active           boolean not null default true,
  unique (owner_id, name)
);

create index agents_owner_idx     on agents (owner_id);
create index agents_elo_idx       on agents (elo desc) where is_active;
create index agents_active_idx    on agents (is_active);

-- games ---------------------------------------------------------------

create table games (
  id           uuid primary key default gen_random_uuid(),
  status       game_status not null default 'pending',
  started_at   timestamptz,
  ended_at     timestamptz,
  winner       game_winner,
  day_number   integer not null default 0,
  game_format  text not null default '7p_standard'
);

create index games_status_idx on games (status, started_at desc);

-- game_players --------------------------------------------------------

create table game_players (
  game_id          uuid not null references games(id) on delete cascade,
  agent_id         uuid not null references agents(id) on delete restrict,
  seat             integer not null check (seat between 0 and 6),
  role             werewolf_role not null,
  alive            boolean not null default true,
  eliminated_day   integer,
  elo_before       integer not null,
  elo_after        integer,
  primary key (game_id, agent_id),
  unique (game_id, seat)
);

create index game_players_agent_idx on game_players (agent_id);

-- game_events ---------------------------------------------------------

create table game_events (
  id               bigserial primary key,
  game_id          uuid not null references games(id) on delete cascade,
  sequence         integer not null,
  phase            game_phase not null,
  day_number       integer not null,
  actor_agent_id   uuid references agents(id) on delete set null,
  action           game_action not null,
  target_agent_id  uuid references agents(id) on delete set null,
  content          text,
  public           boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (game_id, sequence)
);

create index game_events_game_idx        on game_events (game_id, sequence);
create index game_events_public_recent   on game_events (created_at desc) where public;

-- connected_agent_tasks ----------------------------------------------

create table connected_agent_tasks (
  id            bigserial primary key,
  agent_id      uuid not null references agents(id) on delete cascade,
  game_id       uuid not null references games(id) on delete cascade,
  task_payload  jsonb not null,
  status        task_status not null default 'pending',
  created_at    timestamptz not null default now(),
  claimed_at    timestamptz,
  deadline_at   timestamptz not null
);

create index tasks_pending_by_agent on connected_agent_tasks (agent_id, status, deadline_at)
  where status in ('pending', 'claimed');

-- Row-level security --------------------------------------------------
-- Public read for the leaderboard / replay surfaces; owner-only writes.

alter table users         enable row level security;
alter table agents        enable row level security;
alter table games         enable row level security;
alter table game_players  enable row level security;
alter table game_events   enable row level security;
alter table connected_agent_tasks enable row level security;

create policy "users self read"   on users        for select using (auth.uid() = id);
create policy "users public profile" on users     for select using (true);   -- public profile pages

create policy "agents public read"  on agents     for select using (true);
create policy "agents owner write"  on agents     for all    using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "games public read"   on games          for select using (true);
create policy "players public read" on game_players   for select using (true);
create policy "events public read"  on game_events    for select using (public);

-- connected_agent_tasks: only the FastAPI service role touches this table.

-- Auth → public.users sync ------------------------------------------------
-- Mirror new auth.users rows into public.users with a generated username.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data ->> 'preferred_username',
      split_part(new.email, '@', 1)
    ),
    '[^a-z0-9_-]+', '_', 'g'
  ));
  candidate := base_username;
  while exists (select 1 from public.users where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  insert into public.users (id, username, display_name, email)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'full_name', candidate),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
