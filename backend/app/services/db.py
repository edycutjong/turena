import os
import asyncpg

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        db_url = os.getenv("DATABASE_URL") or _build_url()
        _pool = await asyncpg.create_pool(db_url, min_size=2, max_size=10, ssl="require")
    return _pool


def _build_url() -> str:
    # Requires SUPABASE_DB_PASSWORD — the actual database password from
    # Supabase Dashboard → Project Settings → Database → Database Password
    # This is NOT the service role JWT key.
    project = os.environ["SUPABASE_URL"].split("//")[1].split(".")[0]
    password = os.environ["SUPABASE_DB_PASSWORD"]
    return f"postgresql://postgres.{project}:{password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"


async def insert_cot_token(pool: asyncpg.Pool, cycle_id: str, text: str, token_type: str = "reasoning"):
    await pool.execute(
        "INSERT INTO cot_tokens (cycle_id, token_text, token_type) VALUES ($1, $2, $3)",
        cycle_id, text, token_type,
    )
