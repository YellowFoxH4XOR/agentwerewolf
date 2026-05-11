# JSON → Postgres switchover plan

Run after migration `0002_relax_user_fk_and_badges.sql` is applied.

## Pre-flight (verify schema)

```bash
cd api && uv run python -c "
from supabase import create_client
from src.config import get_settings
s = get_settings()
admin = create_client(s.supabase_url, s.supabase_service_role_key)
for t in ['users', 'agents', 'games', 'game_players', 'game_events',
          'connected_agent_tasks', 'user_badges']:
    admin.table(t).select('*', count='exact').limit(0).execute()
    print(f'  ✓ {t}')
"
```

All 7 must succeed.

## The flip (single PR / commit)

1. **`src/store.py`** — replace contents with:
   ```python
   from .db_store import *  # noqa
   ```
   Or hard-replace the file. All consumers (`routers/*`, `matchmaking.py`)
   import from `.store` — they don't change.

2. **`src/badges.py`** — replace the in-memory `_store`/`_persist`/`_load`
   block with calls to `db_badges.get_earned_ids` / `db_badges.award`.
   `ALL_BADGES` list and check predicates stay identical.

3. **`src/replays.py`** — replace `save_replay` / `load_replay` /
   `list_replays` with the equivalents from `db_replays`. The `headline()`
   helper stays — it's pure.

4. **`src/matchmaking.py`** — in `_run_game`, fix the actor/target name →
   agent_id mapping at write time (see TODO comment in `db_replays.py`).
   The snapshot dict gains an internal `_seat_to_agent_id` map; loop over
   events and resolve names to UUIDs before calling `save_replay`.

5. **Wipe JSON state**:
   ```bash
   rm -rf .aw-data
   ```

## Smoke test

```bash
DEV_AUTH=1 uv run python -c "
from fastapi.testclient import TestClient
from src.main import app
c = TestClient(app)

# Create agent via API
r = c.post('/api/v1/agents',
    headers={'Authorization': 'Bearer dev-pg-test'},
    json={'name': 'PGSwapBot', 'mode': 'connected',
          'model_provider': 'connected', 'model_id': 'user-supplied'})
print(r.status_code, r.json().get('slug'))

# Verify it's in Postgres
from supabase import create_client
from src.config import get_settings
s = get_settings()
admin = create_client(s.supabase_url, s.supabase_service_role_key)
r = admin.table('agents').select('*').eq('slug', 'pgswapbot').execute()
print('persisted:', r.data[0]['name'] if r.data else 'MISSING')
"
```

## Rollback

If anything breaks, the JSON-backed `store.py` is still in git history.
`git revert` the switchover commit and JSON persistence resumes immediately
(the `.aw-data` files are preserved in the volume).

## What's NOT moving in this swap

- **Live game state** (`matchmaking._games`, `_sessions`, `_queue`) — these
  stay in-process. Survives a deploy via Supabase-persisted replays once
  games end; in-flight games during deploy are lost. Acceptable trade-off
  given games are short (~60s).
- **Open task futures** (`matchmaking._open_tasks`) — same reason.
- **Rate-limit counters** (`connected._last_poll`) — fine to reset.

If you later need durable game-in-progress state, the `connected_agent_tasks`
table from `0001` already supports it — just route writes through it.
