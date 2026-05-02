"""Tests for app/services/mantle.py — 100% coverage."""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import app.services.mantle as mantle_mod


class TestNextNonce:
    """Tests for _next_nonce()."""

    @pytest.mark.asyncio
    async def test_uses_on_chain_nonce_when_none(self):
        mantle_mod._nonce = None
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(side_effect=[5, 3])

        with patch("app.services.mantle.AsyncWeb3") as MockAW3:
            MockAW3.to_checksum_address = MagicMock(return_value="0xAbc")
            result = await mantle_mod._next_nonce(mock_w3, "0xabc")
        assert result == 5
        assert mantle_mod._nonce == 6  # incremented after use
        mantle_mod._nonce = None  # cleanup

    @pytest.mark.asyncio
    async def test_uses_on_chain_when_higher(self):
        mantle_mod._nonce = 3
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(side_effect=[10, 8])

        with patch("app.services.mantle.AsyncWeb3") as MockAW3:
            MockAW3.to_checksum_address = MagicMock(return_value="0xAbc")
            result = await mantle_mod._next_nonce(mock_w3, "0xabc")
        assert result == 10
        assert mantle_mod._nonce == 11
        mantle_mod._nonce = None  # cleanup

    @pytest.mark.asyncio
    async def test_uses_cached_nonce_when_higher(self):
        mantle_mod._nonce = 20
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(side_effect=[5, 5])

        with patch("app.services.mantle.AsyncWeb3") as MockAW3:
            MockAW3.to_checksum_address = MagicMock(return_value="0xAbc")
            result = await mantle_mod._next_nonce(mock_w3, "0xabc")
        assert result == 20
        assert mantle_mod._nonce == 21
        mantle_mod._nonce = None  # cleanup


class TestGetW3:
    """Tests for get_w3()."""

    def test_creates_w3_with_default_rpc(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("MANTLE_RPC_URL", None)
            w3 = mantle_mod.get_w3()
            assert w3 is not None

    def test_creates_w3_with_custom_rpc(self):
        with patch.dict(os.environ, {"MANTLE_RPC_URL": "https://custom-rpc.example.com"}):
            w3 = mantle_mod.get_w3()
            assert w3 is not None


class TestGetAccount:
    """Tests for get_account()."""

    def test_creates_account_from_key(self):
        with patch.dict(os.environ, {"DEPLOYER_PRIVATE_KEY": "0x" + "ab" * 32}):
            w3 = MagicMock()
            mock_acct = MagicMock()
            w3.eth.account.from_key = MagicMock(return_value=mock_acct)
            result = mantle_mod.get_account(w3)
            assert result is mock_acct


class TestRecordTrade:
    """Tests for record_trade()."""

    @pytest.mark.asyncio
    async def test_record_trade_sends_transaction(self):
        mantle_mod._nonce = None
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=0)
        mock_w3.eth.send_raw_transaction = AsyncMock(return_value=b"\xab" * 32)

        mock_contract = MagicMock()
        mock_contract.functions.recordTrade.return_value.build_transaction = AsyncMock(return_value={"data": "0x"})
        mock_w3.eth.contract = MagicMock(return_value=mock_contract)

        mock_account = MagicMock()
        mock_account.address = "0x" + "aa" * 20
        signed = MagicMock()
        signed.raw_transaction = b"\x00" * 100
        mock_account.sign_transaction = MagicMock(return_value=signed)

        with patch("app.services.mantle.get_w3", return_value=mock_w3), \
             patch("app.services.mantle.get_account", return_value=mock_account), \
             patch("app.services.mantle.AsyncWeb3") as MockAsyncWeb3:
            MockAsyncWeb3.to_checksum_address = MagicMock(return_value="0x" + "00" * 20)
            result = await mantle_mod.record_trade(0, True, 1000)

        assert isinstance(result, str)
        mock_w3.eth.send_raw_transaction.assert_awaited_once()
        mantle_mod._nonce = None  # cleanup


class TestRecordSelfCorrection:
    """Tests for record_self_correction()."""

    @pytest.mark.asyncio
    async def test_record_self_correction_sends_transaction(self):
        mantle_mod._nonce = None
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=0)
        mock_w3.eth.send_raw_transaction = AsyncMock(return_value=b"\xcd" * 32)

        mock_contract = MagicMock()
        mock_contract.functions.recordSelfCorrection.return_value.build_transaction = AsyncMock(return_value={"data": "0x"})
        mock_w3.eth.contract = MagicMock(return_value=mock_contract)

        mock_account = MagicMock()
        mock_account.address = "0x" + "bb" * 20
        signed = MagicMock()
        signed.raw_transaction = b"\x01" * 100
        mock_account.sign_transaction = MagicMock(return_value=signed)

        with patch("app.services.mantle.get_w3", return_value=mock_w3), \
             patch("app.services.mantle.get_account", return_value=mock_account), \
             patch("app.services.mantle.AsyncWeb3") as MockAsyncWeb3:
            MockAsyncWeb3.to_checksum_address = MagicMock(return_value="0x" + "00" * 20)
            result = await mantle_mod.record_self_correction(0, "risk_weight", 100, 85, 600, "{}")

        assert isinstance(result, str)
        mantle_mod._nonce = None  # cleanup


class TestSettleCycle:
    """Tests for settle_cycle()."""

    @pytest.mark.asyncio
    async def test_settle_cycle_sends_transaction(self):
        mantle_mod._nonce = None
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=0)
        mock_w3.eth.send_raw_transaction = AsyncMock(return_value=b"\xef" * 32)

        mock_contract = MagicMock()
        mock_contract.functions.settle.return_value.build_transaction = AsyncMock(return_value={"data": "0x"})
        mock_w3.eth.contract = MagicMock(return_value=mock_contract)

        mock_account = MagicMock()
        mock_account.address = "0x" + "cc" * 20
        signed = MagicMock()
        signed.raw_transaction = b"\x02" * 100
        mock_account.sign_transaction = MagicMock(return_value=signed)

        with patch("app.services.mantle.get_w3", return_value=mock_w3), \
             patch("app.services.mantle.get_account", return_value=mock_account), \
             patch("app.services.mantle.AsyncWeb3") as MockAsyncWeb3:
            MockAsyncWeb3.to_checksum_address = MagicMock(return_value="0x" + "00" * 20)
            result = await mantle_mod.settle_cycle(1, True)

        assert isinstance(result, str)
        mantle_mod._nonce = None  # cleanup


class TestABIs:
    """Tests for ABI constants."""

    def test_agent_abi_is_list(self):
        assert isinstance(mantle_mod.AGENT_ABI, list)
        assert len(mantle_mod.AGENT_ABI) == 2

    def test_escrow_abi_is_list(self):
        assert isinstance(mantle_mod.ESCROW_ABI, list)
        assert len(mantle_mod.ESCROW_ABI) == 1
