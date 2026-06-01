import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def main():
    db_password = os.getenv("SUPABASE_DB_PASSWORD")
    db_host = os.getenv("SUPABASE_POOLER_HOST", "aws-0-ap-southeast-1.pooler.supabase.com")
    db_user = "postgres.jytcwnlkskndvntjntqk"
    # Wait, the DB connection string in db.py probably has the correct details.
    # Let's import get_pool from app.services.db instead to be safe.
    from app.services.db import get_pool
    pool = await get_pool()
    with open('../supabase/migrations/008_multi_agent_support.sql', 'r') as f:
        sql = f.read()
    await pool.execute(sql)
    print("Migration applied successfully.")
    # Actually wait, app.services.db might not be available if not in backend/ module path.
    # Let's run it from backend dir.

if __name__ == "__main__":
    asyncio.run(main())
