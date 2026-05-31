"""Tests for app/services/spectator.py."""
import asyncio
import os
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.spectator import run_spectator_loop, _generate_messages, ChatMessage

class TestSpectator:
    @pytest.mark.asyncio
    async def test_generate_messages_no_api_key(self):
        with patch.dict(os.environ, {}, clear=True):
            messages = await _generate_messages("id1", "VERDICT", [], [])
            assert messages == []

    @pytest.mark.asyncio
    async def test_generate_messages_success(self):
        mock_response = MagicMock()
        mock_msg = ChatMessage(username="TestDegen", message="NGMI", sentiment="BEARISH")
        mock_response.choices = [MagicMock(message=MagicMock(parsed=MagicMock(messages=[mock_msg])))]

        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}), \
             patch("app.services.spectator.AsyncOpenAI") as mock_openai:
            
            mock_client = AsyncMock()
            mock_client.api_key = "test-key"
            mock_client.beta.chat.completions.parse = AsyncMock(return_value=mock_response)
            mock_openai.return_value = mock_client

            messages = await _generate_messages("id1", "VERDICT", ["thinking"], ["fud"])
            assert len(messages) == 1
            assert messages[0].username == "TestDegen"

    @pytest.mark.asyncio
    async def test_generate_messages_error(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}), \
             patch("app.services.spectator.AsyncOpenAI") as mock_openai:
            mock_client = AsyncMock()
            mock_client.api_key = "test-key"
            mock_client.beta.chat.completions.parse = AsyncMock(side_effect=Exception("API Error"))
            mock_openai.return_value = mock_client

            messages = await _generate_messages("id1", "VERDICT", [], [])
            assert messages == []

    @pytest.mark.asyncio
    async def test_run_spectator_loop(self):
        # We want to run the loop for exactly one successful iteration and then cancel it.
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value={"id": "cycle1", "phase": "SABOTAGE_WINDOW"})
        mock_pool.fetch = AsyncMock(return_value=[{"text": "cot1", "card_type": "fud1"}])
        mock_pool.execute = AsyncMock()

        mock_msg = ChatMessage(username="User1", message="WAGMI", sentiment="BULLISH")

        with patch("app.services.spectator.get_pool", return_value=mock_pool), \
             patch("app.services.spectator._generate_messages", new_callable=AsyncMock) as mock_gen, \
             patch("app.services.spectator.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            
            mock_gen.return_value = [mock_msg]
            # Cancel loop after one full cycle by throwing CancelledError during the second sleep
            mock_sleep.side_effect = [None, asyncio.CancelledError()]

            with pytest.raises(asyncio.CancelledError):
                await run_spectator_loop()

            # Verify it fetched active cycle
            mock_pool.fetchrow.assert_called_once()
            # Verify it fetched recent context (2 calls)
            assert mock_pool.fetch.call_count == 2
            # Verify it inserted the chat message
            mock_pool.execute.assert_called_once()
            
    @pytest.mark.asyncio
    async def test_run_spectator_loop_no_cycle(self):
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value=None)

        with patch("app.services.spectator.get_pool", return_value=mock_pool), \
             patch("app.services.spectator.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            
            # First sleep succeeds so we hit `continue`, second sleep throws so we exit
            mock_sleep.side_effect = [None, asyncio.CancelledError()]

            with pytest.raises(asyncio.CancelledError):
                await run_spectator_loop()
                
            assert mock_pool.fetchrow.call_count == 2
            
    @pytest.mark.asyncio
    async def test_run_spectator_loop_exception(self):
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(side_effect=Exception("DB Error"))

        with patch("app.services.spectator.get_pool", return_value=mock_pool), \
             patch("app.services.spectator.asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            
            mock_sleep.side_effect = asyncio.CancelledError()

            with pytest.raises(asyncio.CancelledError):
                await run_spectator_loop()
                
            mock_pool.fetchrow.assert_called_once()
