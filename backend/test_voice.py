import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os
import io

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

async def test_voice_routes():
    print("Starting Voice Routes Verification...")
    
    # Mock settings
    mock_settings = MagicMock()
    mock_settings.OPENAI_API_KEY = "test_key"
    mock_settings.ELEVENLABS_API_KEY = "test_key"

    # Mock OpenAI Client
    mock_openai = AsyncMock()
    mock_openai.audio.transcriptions.create.return_value = MagicMock(text="Hello world")
    mock_openai.audio.speech.create.return_value = MagicMock(content=b"dummy_audio_content")

    # Mock httpx response
    mock_httpx_res = MagicMock()
    mock_httpx_res.status_code = 200
    mock_httpx_res.content = b"elevenlabs_audio_content"

    with patch("app.routes.voice_routes.AsyncOpenAI", return_value=mock_openai), \
         patch("app.routes.voice_routes.settings", mock_settings), \
         patch("httpx.AsyncClient.post", return_value=mock_httpx_res):
        
        from app.routes.voice_routes import voice_to_text, text_to_speech
        
        # Test 1: Voice to Text
        mock_audio = MagicMock()
        mock_audio.read = AsyncMock(return_value=b"fake_audio_stream")
        
        res_vtt = await voice_to_text(mock_audio)
        print(f"STT Result: {res_vtt}")
        assert res_vtt["text"] == "Hello world"
        
        # Test 2: Text to Speech (ElevenLabs)
        res_tts = await text_to_speech({"text": "Hello", "language": "en"})
        assert res_tts.media_type == "audio/mpeg"
        print("TTS (ElevenLabs) Result: Success")

        # Test 3: Text to Speech (OpenAI Fallback)
        mock_httpx_res.status_code = 401 # Simulate failure
        res_tts_fallback = await text_to_speech({"text": "Hello fallback", "language": "en"})
        assert res_tts_fallback.media_type == "audio/mpeg"
        print("TTS (OpenAI Fallback) Result: Success")

    print("\nAll Voice Route tests passed!")

if __name__ == "__main__":
    asyncio.run(test_voice_routes())
