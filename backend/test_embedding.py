from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

def test_embedding():
    client = OpenAI(api_key=api_key)
    try:
        print(f"Testing embedding with key: {api_key[:10]}...")
        response = client.embeddings.create(
            input="hello world",
            model="text-embedding-3-small"
        )
        print("✅ Embedding success!")
        # print(response.data[0].embedding[:10])
    except Exception as e:
        print(f"❌ Embedding failed: {e}")

if __name__ == "__main__":
    test_embedding()
