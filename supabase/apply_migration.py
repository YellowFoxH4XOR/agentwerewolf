"""Apply all schema migrations to Supabase Postgres in order.

Usage:
    DATABASE_URL='postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres' \
      uv run --no-project --with 'psycopg[binary]' python supabase/apply_migration.py

    # Apply only one file:
    DATABASE_URL='...' python supabase/apply_migration.py 0002_relax_user_fk_and_badges.sql

Get the connection string: Supabase dashboard → Project Settings → Database
→ Connection string → URI. If your network blocks port 5432, switch to the
"Transaction" or "Session" pooler tab and use port 6543.

All migrations in this repo are idempotent (`if (not) exists` everywhere), so
re-running this script is safe and is the simplest "apply latest" pattern.
"""

from __future__ import annotations

import os
import pathlib
import sys

import psycopg

HERE = pathlib.Path(__file__).parent
MIGRATIONS_DIR = HERE / "migrations"


def list_migrations() -> list[pathlib.Path]:
    return sorted(p for p in MIGRATIONS_DIR.glob("*.sql"))


def apply_one(conn: psycopg.Connection, path: pathlib.Path) -> None:
    sql = path.read_text()
    print(f"  → {path.name} ({len(sql):,} bytes)")
    with conn.cursor() as cur:
        cur.execute(sql)
    print(f"    ✓ ok")


def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: set DATABASE_URL env var first.", file=sys.stderr)
        print(
            "Get it from: Supabase dashboard → Project Settings → Database\n"
            "             → Connection string → URI",
            file=sys.stderr,
        )
        return 2

    # Specific file vs all
    if len(sys.argv) > 1:
        target = MIGRATIONS_DIR / sys.argv[1]
        if not target.exists():
            print(f"ERROR: {target} not found.", file=sys.stderr)
            return 2
        migrations = [target]
    else:
        migrations = list_migrations()

    print(f"Applying {len(migrations)} migration(s) to {url.split('@')[1] if '@' in url else url}…")
    with psycopg.connect(url, autocommit=True) as conn:
        for path in migrations:
            apply_one(conn, path)
    print("✓ Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
