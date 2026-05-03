"""Tests for app/services/deepseek.py — 100% coverage."""
import os
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import app.services.deepseek as ds_mod


class TestGetClient:
    """Tests for get_client()."""

    def test_creates_client_on_first_call(self):
        ds_mod._client = None
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-key"}):
            with patch("app.services.deepseek.AsyncOpenAI") as MockClient:
                mock_instance = MagicMock()
                MockClient.return_value = mock_instance
                result = ds_mod.get_client()
                assert result is mock_instance
                MockClient.assert_called_once_with(
                    api_key="test-key",
                    base_url="https://api.deepseek.com",
                )
        ds_mod._client = None  # cleanup

    def test_reuses_existing_client(self):
        mock = MagicMock()
        ds_mod._client = mock
        result = ds_mod.get_client()
        assert result is mock
        ds_mod._client = None  # cleanup


class TestStreamReasoning:
    """Tests for stream_reasoning()."""

    @pytest.mark.asyncio
    async def test_yields_reasoning_and_content_and_intent(self):
        # Build mock chunks
        chunk_reasoning = MagicMock()
        delta_r = MagicMock()
        delta_r.reasoning_content = "Let me think..."
        delta_r.content = None
        chunk_reasoning.choices = [MagicMock(delta=delta_r)]

        chunk_content = MagicMock()
        delta_c = MagicMock()
        delta_c.reasoning_content = None
        delta_c.content = '{"action": "long", "confidence": 0.8, "reason": "bullish"}'
        chunk_content.choices = [MagicMock(delta=delta_c)]

        # Create async iterator from chunks
        async def mock_stream():
            for c in [chunk_reasoning, chunk_content]:
                yield c

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        ds_mod._client = None
        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_reasoning("market data"):
                tokens.append((token_type, text))

        # Should have: reasoning, content, intent
        types = [t[0] for t in tokens]
        assert "reasoning" in types
        assert "content" in types
        assert "intent" in types

        # Verify intent parsed correctly
        intent_token = [t for t in tokens if t[0] == "intent"][0]
        parsed = json.loads(intent_token[1])
        assert parsed["action"] == "long"

    @pytest.mark.asyncio
    async def test_handles_empty_choices(self):
        chunk_empty = MagicMock()
        chunk_empty.choices = []

        async def mock_stream():
            yield chunk_empty

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_reasoning("data"):
                tokens.append((token_type, text))

        assert tokens == [("emotion", "CONFIDENT")]

    @pytest.mark.asyncio
    async def test_handles_no_delta(self):
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=None)]

        async def mock_stream():
            yield chunk

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_reasoning("data"):
                tokens.append((token_type, text))

        assert tokens == [("emotion", "CONFIDENT")]

    @pytest.mark.asyncio
    async def test_handles_invalid_json_intent(self):
        """Content with { and } but invalid JSON between them → triggers except branch."""
        chunk = MagicMock()
        delta = MagicMock()
        delta.reasoning_content = None
        delta.content = "I think {this is not: valid json} definitely"
        chunk.choices = [MagicMock(delta=delta)]

        async def mock_stream():
            yield chunk

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_reasoning("data"):
                tokens.append((token_type, text))

        types = [t[0] for t in tokens]
        assert "intent" not in types  # json.loads fails → no intent
        assert "content" in types

    @pytest.mark.asyncio
    async def test_handles_partial_json(self):
        """Content with { but no closing } should not yield intent."""
        chunk = MagicMock()
        delta = MagicMock()
        delta.reasoning_content = None
        delta.content = 'I think { this is incomplete'
        chunk.choices = [MagicMock(delta=delta)]

        async def mock_stream():
            yield chunk

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_reasoning("data"):
                tokens.append((token_type, text))

        types = [t[0] for t in tokens]
        assert "intent" not in types

    @pytest.mark.asyncio
    async def test_yields_emotion_from_reasoning(self):
        chunk_reasoning = MagicMock()
        delta_r = MagicMock()
        delta_r.reasoning_content = "[EMOTION: CAUTIOUS] Hmm..."
        delta_r.content = None
        chunk_reasoning.choices = [MagicMock(delta=delta_r)]

        async def mock_stream():
            yield chunk_reasoning

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_reasoning("data"):
                tokens.append((token_type, text))

        assert ("emotion", "CAUTIOUS") in tokens

class TestStreamInitialAnalysis:
    """Tests for stream_initial_analysis()."""

    @pytest.mark.asyncio
    async def test_yields_reasoning_and_content_and_complete(self):
        chunk_reasoning = MagicMock()
        delta_r = MagicMock()
        delta_r.reasoning_content = "[EMOTION: CAUTIOUS] Hmm..."
        delta_r.content = None
        chunk_reasoning.choices = [MagicMock(delta=delta_r)]

        chunk_content = MagicMock()
        delta_c = MagicMock()
        delta_c.reasoning_content = None
        delta_c.content = "Initial thought"
        chunk_content.choices = [MagicMock(delta=delta_c)]

        async def mock_stream():
            for c in [chunk_reasoning, chunk_content]:
                yield c

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_initial_analysis("market data", 1):
                tokens.append((token_type, text))

        types = [t[0] for t in tokens]
        assert "emotion" in types
        assert "reasoning" in types
        assert "content" in types
        assert "analysis_complete" in types

        # Check analysis_complete contains the full text
        complete_token = [t for t in tokens if t[0] == "analysis_complete"][0]
        assert "[EMOTION: CAUTIOUS] Hmm...Initial thought" == complete_token[1]

    @pytest.mark.asyncio
    async def test_handles_no_delta(self):
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=None)]

        async def mock_stream():
            yield chunk

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_initial_analysis("data", 0):
                tokens.append((token_type, text))

        types = [t[0] for t in tokens]
        assert types == ["emotion", "analysis_complete"]

class TestStreamVerdict:
    """Tests for stream_verdict()."""

    @pytest.mark.asyncio
    async def test_yields_reasoning_and_content_and_intent(self):
        chunk_reasoning = MagicMock()
        delta_r = MagicMock()
        delta_r.reasoning_content = "Verdict reasoning..."
        delta_r.content = None
        chunk_reasoning.choices = [MagicMock(delta=delta_r)]

        chunk_content = MagicMock()
        delta_c = MagicMock()
        delta_c.reasoning_content = None
        delta_c.content = '{"action": "long", "confidence": 0.9, "reason": "ignore fud"}'
        chunk_content.choices = [MagicMock(delta=delta_c)]

        async def mock_stream():
            for c in [chunk_reasoning, chunk_content]:
                yield c

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_verdict("initial", "fud", 0):
                tokens.append((token_type, text))

        types = [t[0] for t in tokens]
        assert "reasoning" in types
        assert "content" in types
        assert "intent" in types

        intent_token = [t for t in tokens if t[0] == "intent"][0]
        parsed = json.loads(intent_token[1])
        assert parsed["action"] == "long"

    @pytest.mark.asyncio
    async def test_handles_no_delta_and_invalid_intent(self):
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=None)]

        async def mock_stream():
            yield chunk

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_verdict("initial", None, 0):
                tokens.append((token_type, text))

        assert tokens == []

    @pytest.mark.asyncio
    async def test_handles_invalid_json_intent_valueerror(self):
        """Content with { but invalid JSON between them triggers ValueError or JSONDecodeError."""
        chunk = MagicMock()
        delta = MagicMock()
        delta.reasoning_content = None
        delta.content = "I think {this is invalid json}"
        chunk.choices = [MagicMock(delta=delta)]

        async def mock_stream():
            yield chunk

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        with patch("app.services.deepseek.get_client", return_value=mock_client):
            tokens = []
            async for token_type, text in ds_mod.stream_verdict("initial", "fud", 0):
                tokens.append((token_type, text))

        types = [t[0] for t in tokens]
        assert "intent" not in types
        assert "content" in types
