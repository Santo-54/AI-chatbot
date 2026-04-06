import httpx
import os
from dotenv import load_dotenv

load_dotenv("app/.env") # Try to load from app/.env if it exists
if not os.getenv("OPENAI_API_KEY"):
    load_dotenv(".env")

api_key = os.getenv("OPENAI_API_KEY")

async def test_session():
    print(f"Testing session creation with API Key: {api_key[:10]}...")
    url = "https://api.openai.com/v1/realtime/sessions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    data = {
        "model": "gpt-4o-realtime-preview-2024-12-17",
        "voice": "shimmer",
        "modalities": ["audio", "text"],
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=data)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print("SUCCESS: Session created.")
                print(response.json().get("client_secret", {}).get("value")[:20] + "...")
            else:
                print(f"ERROR: {response.text}")
        except Exception as e:
            print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_session())
