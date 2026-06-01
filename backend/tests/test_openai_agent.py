import json
import pytest
from unittest.mock import AsyncMock, patch
from app.services.openai_agent import stream_initial_analysis, stream_verdict

class TestOpenAIAgent:
    @pytest.mark.asyncio
    async def test_stream_initial_analysis(self):
        mock_chunk = AsyncMock()
        mock_chunk.choices = [AsyncMock()]
        mock_chunk.choices[0].delta = AsyncMock()
        mock_chunk.choices[0].delta.content = "analysis content "
        
        mock_chunk2 = AsyncMock()
        mock_chunk2.choices = [AsyncMock()]
        mock_chunk2.choices[0].delta = AsyncMock()
        mock_chunk2.choices[0].delta.content = "done"

        mock_stream = AsyncMock()
        mock_stream.__aiter__.return_value = [mock_chunk, mock_chunk2]
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_stream
        
        with patch("app.services.openai_agent.client", mock_client):
            events = []
            async for event_type, content in stream_initial_analysis(
                "market data context", 0
            ):
                events.append((event_type, content))
            
            assert events == [
                ("reasoning", "analysis content "),
                ("reasoning", "done"),
                ("analysis_complete", "analysis content done")
            ]

    @pytest.mark.asyncio
    async def test_stream_initial_analysis_emotion(self):
        mock_chunk = AsyncMock()
        mock_chunk.choices = [AsyncMock()]
        mock_chunk.choices[0].delta = AsyncMock()
        mock_chunk.choices[0].delta.content = "[EMOTION: CAUTIOUS]"
        
        mock_stream = AsyncMock()
        mock_stream.__aiter__.return_value = [mock_chunk]
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_stream
        
        with patch("app.services.openai_agent.client", mock_client):
            events = []
            async for event_type, content in stream_initial_analysis("data", 1):
                events.append((event_type, content))
            
            # The emotion should be extracted and the text should be empty string
            assert ("emotion", "CAUTIOUS") in events

    @pytest.mark.asyncio
    async def test_stream_verdict_valid_json(self):
        json_str = '{"action": "long", "confidence": 0.8, "reason": "test"}'
        
        mock_chunk = AsyncMock()
        mock_chunk.choices = [AsyncMock()]
        mock_chunk.choices[0].delta = AsyncMock()
        mock_chunk.choices[0].delta.content = json_str

        mock_stream = AsyncMock()
        mock_stream.__aiter__.return_value = [mock_chunk]
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_stream
        
        with patch("app.services.openai_agent.client", mock_client):
            events = []
            async for event_type, content in stream_verdict(
                "prev analysis", "sabotage data", 0
            ):
                events.append((event_type, content))
            
            assert ("reasoning", json_str) in events
            assert ("intent", json.dumps({"action": "long", "confidence": 0.8, "reason": "test"})) in events

    @pytest.mark.asyncio
    async def test_stream_verdict_invalid_json_fallback(self):
        text_str = 'this is not valid json'
        
        mock_chunk = AsyncMock()
        mock_chunk.choices = [AsyncMock()]
        mock_chunk.choices[0].delta = AsyncMock()
        mock_chunk.choices[0].delta.content = text_str

        mock_stream = AsyncMock()
        mock_stream.__aiter__.return_value = [mock_chunk]
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_stream
        
        with patch("app.services.openai_agent.client", mock_client):
            events = []
            async for event_type, content in stream_verdict(
                "prev analysis", "sabotage data", 0
            ):
                events.append((event_type, content))
            
            assert ("reasoning", text_str) in events
            assert not any(e[0] == "intent" for e in events)

    @pytest.mark.asyncio
    async def test_stream_verdict_bad_json_in_brackets(self):
        text_str = '{action: "long"}'
        
        mock_chunk = AsyncMock()
        mock_chunk.choices = [AsyncMock()]
        mock_chunk.choices[0].delta = AsyncMock()
        mock_chunk.choices[0].delta.content = text_str

        mock_stream = AsyncMock()
        mock_stream.__aiter__.return_value = [mock_chunk]
        
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_stream
        
        with patch("app.services.openai_agent.client", mock_client):
            events = []
            async for event_type, content in stream_verdict(
                "prev", "sabotage", 0
            ):
                events.append((event_type, content))
            
            assert ("reasoning", text_str) in events
            assert not any(e[0] == "intent" for e in events)

    @pytest.mark.asyncio
    async def test_stream_initial_analysis_error(self):
        mock_client = AsyncMock()
        mock_client.chat.completions.create.side_effect = Exception("API error")
        
        with patch("app.services.openai_agent.client", mock_client):
            events = []
            async for event_type, content in stream_initial_analysis("data", 0):
                events.append((event_type, content))
            
            assert len(events) == 1
            assert events[0][0] == "reasoning"
            assert "API error" in events[0][1]

    @pytest.mark.asyncio
    async def test_stream_verdict_error(self):
        mock_client = AsyncMock()
        mock_client.chat.completions.create.side_effect = Exception("API error")
        
        with patch("app.services.openai_agent.client", mock_client):
            events = []
            async for event_type, content in stream_verdict("prev", "sabotage", 0):
                events.append((event_type, content))
            
            assert len(events) == 1
            assert events[0][0] == "reasoning"
            assert "API error" in events[0][1]
