import httpx
import asyncio
import os
from dotenv import load_dotenv

# Try to load env
load_dotenv(".env")
load_dotenv("app/.env")

async def test_db():
    print("--- Testing Database ---")
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_uri = os.getenv("MONGO_URI")
        print(f"Connecting to: {mongo_uri[:20]}...")
        client = AsyncIOMotorClient(mongo_uri)
        # The is_master command is cheap and does not require auth.
        await client.admin.command('ismaster')
        print("✅ DB Connection Successful")
        client.close()
        return True
    except Exception as e:
        print(f"❌ DB connection failed: {e}")
        return False

async def test_chat():
    print("\n--- Testing Chat Endpoint ---")
    url = "http://localhost:8000/chat"
    payload = {
        "message": "hello",
        "session_id": "test-session",
        "language": "en"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=30.0)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print(f"✅ Response: {response.json().get('response')[:50]}...")
            else:
                print(f"❌ Error Output: {response.text}")
        except Exception as e:
            print(f"❌ HTTP Request failed: {e}")

async def main():
    db_ok = await test_db()
    if db_ok:
        await test_chat()
    else:
        print("Skipping chat test due to DB failure.")

if __name__ == "__main__":
    asyncio.run(main())
