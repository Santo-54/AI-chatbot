from fastapi import APIRouter, HTTPException, Depends
from app.config import settings
from app.utils.rag import get_relevant_context
from app.database import get_database
import httpx
import json

router = APIRouter(prefix="/voice", tags=["voice"])

@router.get("/session")
async def get_realtime_session():
    """
    Returns an ephemeral session token for OpenAI Realtime API (WebRTC).
    """
    try:
        async with httpx.AsyncClient() as httpx_client:
            response = await httpx_client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-realtime-preview-2024-12-17",
                    "voice": "shimmer", # Consistent neural voice
                    "instructions": (
                        "You are a turn-based conversational assistant. "
                        "STRICT RULE: Always respond after human speech ends. Never stay silent. "
                        "If the user says a greeting (e.g., 'Hi', 'Hello'), respond warmly and concisely. "
                        "If the user's input is unclear, noisy, or empty, respond exactly with: 'I didn’t catch that clearly. Could you please repeat?' "
                        "Detect the user's language (Tamil or English) and respond in the same language. "
                        "Use the provided context to answer questions. Be concise (1-2 sentences). "
                        "Never wait for system confirmation before speaking."
                    ),
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.4, 
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 1000
                    },
                    "input_audio_transcription": {
                        "model": "whisper-1"
                    }
                }
            )
            if response.status_code != 200:
                print(f"❌ OpenAI Session Error: {response.status_code}")
                print(f"Response: {response.text}")
                raise HTTPException(status_code=500, detail=f"OpenAI error: {response.text}")
                
            return response.json()
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Internal Session Error:\n{error_details}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/rag-context")
async def get_voice_rag_context(data: dict, db = Depends(get_database)):
    """
    Endpoint for frontend to fetch RAG context. Returns empty if query is missing.
    """
    query = data.get("query", "").strip()
    if not query:
        return {"context": ""}
    
    context = await get_relevant_context(query, db)
    return {"context": context or ""}
