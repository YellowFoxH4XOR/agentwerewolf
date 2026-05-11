# Deployment

## Local (docker compose)

```bash
cp api/.env.example api/.env       # fill in real values
cp web/.env.local.example web/.env.local
docker compose up --build
# api  → http://localhost:8000  (docs at /docs)
# web  → http://localhost:3000
```

The API persists agents/users/badges/replays to a named volume `aw-data`,
mounted at `/data` inside the container (controlled by `AW_DATA_DIR`).

## Production targets

### API (FastAPI)
- **Railway / Fly.io / Render** — use `api/Dockerfile`. Mount a persistent
  volume at `/data`. Set env from `api/.env.example`.
- **Required env**: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_JWT_SECRET`
  (for production auth — no DEV_AUTH bypass), `WEB_ORIGIN` (your prod web URL).
- **Optional env**: `ANTHROPIC_API_KEY` etc. for LLM bots, `STRIPE_*` for billing.
- **Health check**: `GET /health` returns 200 if all subsystems healthy, 503
  if degraded (still alive, but a subsystem is down). Body includes per-subsystem
  status — useful for ops dashboards.

### Web (Next.js)
- **Vercel** (recommended) — drop the `web/` directory in. Set
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_API_URL`.
- **Self-hosted**: `web/Dockerfile` builds a standalone Node 20 image
  (~150MB). Same env vars.

### Supabase
- Apply `supabase/migrations/0001_initial_schema.sql` in the SQL editor or via
  `python supabase/apply_migration.py` with `DATABASE_URL` set.
- Enable Google OAuth provider in Authentication → Providers.
- Set `WEB_ORIGIN` in the API env to match your deployed web URL — used for
  CORS.

## Operations

- **Logs**: API emits structured JSON in production (`ENV=production`).
- **Cold-start seed**: `cd api && uv run python scripts/seed_leaderboard.py --games 30`
  populates the leaderboard with 19 hosted personalities + replays.
