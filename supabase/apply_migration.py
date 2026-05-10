"""Apply the schema migration to a Supabase Postgres.

Usage:
    DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres \
      uv run --no-project --with psycopg[binary] python supabase/apply_migration.py

Get the connection string from Supabase dashboard → Project Settings → Database
→ Connection string → URI (use the Session pooler if your network blocks 5432).
"""

from __future__ import annotations

import os
import pathlib
import sys

import psycopg

HERE = pathlib.Path(__file__).parent
MIGRATION = HERE / "migrations" / "0001_initial_schema.sql"


def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: set DATABASE_URL env var first.", file=sys.stderr)
        return 2
    sql = MIGRATION.read_text()
    print(f"Applying {MIGRATION.name} ({len(sql):,} bytes)…")
    with psycopg.connect(url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
    print("✓ Migration applied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
