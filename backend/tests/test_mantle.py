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
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=5)

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
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=10)

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
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=5)

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


class TestRecordEmotionalState:
    """Tests for record_emotional_state()."""

    @pytest.mark.asyncio
    async def test_record_emotional_state_sends_transaction(self):
        mantle_mod._nonce = None
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=0)
        mock_w3.eth.send_raw_transaction = AsyncMock(return_value=b"\xab" * 32)

        mock_contract = MagicMock()
        mock_contract.functions.recordEmotionalState.return_value.build_transaction = AsyncMock(return_value={"data": "0x"})
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
            result = await mantle_mod.record_emotional_state(0, "CONFIDENT")

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


class TestCommitPrediction:
    @pytest.mark.asyncio
    async def test_commit_prediction(self):
        mantle_mod._nonce = None
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=0)
        mock_w3.eth.send_raw_transaction = AsyncMock(return_value=b"\x12" * 32)
        mock_w3.solidity_keccak = MagicMock(return_value=b"hash")

        mock_contract = MagicMock()
        mock_contract.functions.commit.return_value.build_transaction = AsyncMock(return_value={"data": "0x"})
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
            result = await mantle_mod.commit_prediction(1, 0, "LONG", 100, 123)

        assert isinstance(result, str)
        mantle_mod._nonce = None

class TestRevealPrediction:
    @pytest.mark.asyncio
    async def test_reveal_prediction(self):
        mantle_mod._nonce = None
        mock_w3 = MagicMock()
        mock_w3.eth.get_transaction_count = AsyncMock(return_value=0)
        mock_w3.eth.send_raw_transaction = AsyncMock(return_value=b"\x34" * 32)

        mock_contract = MagicMock()
        mock_contract.functions.reveal.return_value.build_transaction = AsyncMock(return_value={"data": "0x"})
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
            result = await mantle_mod.reveal_prediction(1, 0, "LONG", 100, 123, True)

        assert isinstance(result, str)
        mantle_mod._nonce = None

class TestABIs:
    """Tests for ABI constants."""

    def test_agent_abi_is_list(self):
        assert isinstance(mantle_mod.AGENT_ABI, list)
        assert len(mantle_mod.AGENT_ABI) == 3

    def test_escrow_abi_is_list(self):
        assert isinstance(mantle_mod.ESCROW_ABI, list)
        assert len(mantle_mod.ESCROW_ABI) == 1
        
    def test_prediction_registry_abi_loads(self):
        # Even if file is missing, fallback handles it
        assert isinstance(mantle_mod.PREDICTION_REGISTRY_ABI, list)
        
    def test_abi_fallback(self):
        with patch("os.path.exists", return_value=False):
            # We can't trivially reload the module inside the test to hit the 'else' branch,
            # but we can manually trigger the branch logic to get coverage on it.
            # Actually, because Python modules only evaluate at import, we'll manually emulate the branch.
            from importlib import reload
            import app.services.mantle as m
            reload(m)
            assert isinstance(m.PREDICTION_REGISTRY_ABI, list)
            assert m.PREDICTION_REGISTRY_ABI == []
            reload(mantle_mod) # restore normal state
