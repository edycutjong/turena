import os
import asyncpg

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        params = _build_params()
        _pool = await asyncpg.create_pool(**params, min_size=2, max_size=10, ssl="require")
    return _pool


def _build_params() -> dict:
    # Always use individual env vars to avoid URL-parsing issues with
    # special characters in the password (e.g. @, $).
    project = os.environ["SUPABASE_URL"].split("//")[1].split(".")[0]
    pooler_host = os.getenv("SUPABASE_POOLER_HOST", "aws-1-ap-southeast-2.pooler.supabase.com")
    return {
        "host": pooler_host,
        "port": 6543,
        "user": f"postgres.{project}",
        "password": os.environ["SUPABASE_DB_PASSWORD"],
        "database": "postgres",
    }


async def insert_cot_token(pool: asyncpg.Pool, cycle_id: str, text: str, token_type: str = "reasoning"):
    await pool.execute(
        "INSERT INTO cot_tokens (cycle_id, token_text, token_type) VALUES ($1, $2, $3)",
        cycle_id, text, token_type,
    )
