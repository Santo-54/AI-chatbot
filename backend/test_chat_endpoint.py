import httpx
import asyncio

async def test_chat():
    url = "http://localhost:8001/chat"
    payload = {
        "message": "hello",
        "session_id": "test-session",
        "language": "en"
    }
    print(f"Testing {url} with payload: {payload}")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=60.0)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_chat())
