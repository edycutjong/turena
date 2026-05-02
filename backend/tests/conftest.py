"""Shared fixtures for Turena backend tests."""
import os
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Set required env vars BEFORE any app imports
os.environ.setdefault("SUPABASE_URL", "https://testproject.supabase.co")
os.environ.setdefault("SUPABASE_DB_PASSWORD", "test-password")
os.environ.setdefault("DEPLOYER_PRIVATE_KEY", "0x" + "ab" * 32)
os.environ.setdefault("TURING_AGENT_ADDRESS", "0x" + "00" * 20)
os.environ.setdefault("ESCROW_ADDRESS", "0x" + "00" * 20)
os.environ.setdefault("DEEPSEEK_API_KEY", "test-key")
os.environ.setdefault("BYBIT_API_KEY", "test-key")
os.environ.setdefault("BYBIT_API_SECRET", "test-secret")


@pytest.fixture
def mock_pool():
    """Create a mock asyncpg pool with common methods."""
    pool = AsyncMock()
    pool.execute = AsyncMock()
    pool.fetchrow = AsyncMock(return_value=None)
    pool.fetch = AsyncMock(return_value=[])
    return pool


@pytest.fixture
def mock_w3():
    """Create a mock AsyncWeb3 instance."""
    w3 = MagicMock()
    w3.eth = MagicMock()
    w3.eth.get_transaction_count = AsyncMock(return_value=0)
    w3.eth.send_raw_transaction = AsyncMock(return_value=b"\xab" * 32)
    w3.eth.contract = MagicMock()
    return w3


@pytest.fixture
def mock_account():
    """Create a mock account."""
    account = MagicMock()
    account.address = "0x" + "aa" * 20
    signed = MagicMock()
    signed.raw_transaction = b"\x00" * 100
    account.sign_transaction = MagicMock(return_value=signed)
    return account
