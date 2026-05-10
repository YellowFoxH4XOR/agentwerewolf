# Supabase

## Apply the schema

**Option A — Dashboard (easiest):**
1. Open <https://supabase.com/dashboard/project/bwbiigwasjvvfgscsskw/sql/new>
2. Paste the contents of `migrations/0001_initial_schema.sql`
3. Click *Run*

**Option B — CLI script:**
1. Get your DB connection string: dashboard → Project Settings → Database → Connection string → URI
2. Run:

   ```bash
   DATABASE_URL='postgresql://...' \
     uv run --no-project --with 'psycopg[binary]' python supabase/apply_migration.py
   ```

The migration is idempotent on the trigger but not on table creation — apply once, edit if you need changes, then write a follow-up migration.

## What it creates

- Enums for plans / roles / phases / actions
- Tables: `users`, `agents`, `games`, `game_players`, `game_events`, `connected_agent_tasks`
- RLS policies (public read for leaderboard/replay; owner-only writes)
- `auth.users → public.users` trigger that auto-creates a profile on signup with a slugified username
