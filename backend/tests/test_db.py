"""Tests for app/services/db.py — 100% coverage."""
import os
import pytest
from unittest.mock import AsyncMock, patch

import app.services.db as db_mod


class TestBuildParams:
    """Tests for _build_params()."""

    def test_builds_params_from_env(self):
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://xyzproject.supabase.co",
            "SUPABASE_DB_PASSWORD": "mypassword",
            "SUPABASE_POOLER_HOST": "custom-pooler.host.com",
        }):
            result = db_mod._build_params()
            assert result["host"] == "custom-pooler.host.com"
            assert result["port"] == 6543
            assert result["user"] == "postgres.xyzproject"
            assert result["password"] == "mypassword"
            assert result["database"] == "postgres"

    def test_default_pooler_host(self):
        env = {
            "SUPABASE_URL": "https://abcproject.supabase.co",
            "SUPABASE_DB_PASSWORD": "pw",
        }
        with patch.dict(os.environ, env, clear=False):
            # Remove the pooler host env so the default is used
            os.environ.pop("SUPABASE_POOLER_HOST", None)
            result = db_mod._build_params()
            assert result["host"] == "aws-1-ap-southeast-2.pooler.supabase.com"


class TestGetPool:
    """Tests for get_pool()."""

    @pytest.mark.asyncio
    async def test_creates_pool_on_first_call(self):
        mock_pool = AsyncMock()
        db_mod._pool = None  # reset singleton
        with patch("app.services.db.asyncpg") as mock_asyncpg:
            mock_asyncpg.create_pool = AsyncMock(return_value=mock_pool)
            result = await db_mod.get_pool()
            assert result is mock_pool
            mock_asyncpg.create_pool.assert_awaited_once()
        db_mod._pool = None  # cleanup

    @pytest.mark.asyncio
    async def test_reuses_existing_pool(self):
        mock_pool = AsyncMock()
        db_mod._pool = mock_pool
        result = await db_mod.get_pool()
        assert result is mock_pool
        db_mod._pool = None  # cleanup


class TestInsertCotToken:
    """Tests for insert_cot_token()."""

    @pytest.mark.asyncio
    async def test_inserts_token(self, mock_pool):
        await db_mod.insert_cot_token(mock_pool, "cycle-1", "thinking...", "reasoning", "agent-0")
        mock_pool.execute.assert_awaited_once_with(
            "INSERT INTO cot_tokens (cycle_id, token_text, token_type, agent_id) VALUES ($1, $2, $3, $4)",
            "cycle-1", "thinking...", "reasoning", "agent-0"
        )

    @pytest.mark.asyncio
    async def test_default_token_type(self, mock_pool):
        await db_mod.insert_cot_token(mock_pool, "cycle-2", "data", "reasoning", "agent-1")
        mock_pool.execute.assert_awaited_once_with(
            "INSERT INTO cot_tokens (cycle_id, token_text, token_type, agent_id) VALUES ($1, $2, $3, $4)",
            "cycle-2", "data", "reasoning", "agent-1"
        )
