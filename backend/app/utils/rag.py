from openai import OpenAI
from app.config import settings
from typing import List
import json

client = OpenAI(api_key=settings.OPENAI_API_KEY)

async def get_embedding(text: str) -> List[float]:
    """
    Generates embeddings using OpenAI's text-embedding-3-small.
    """
    response = client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

async def get_chat_response(messages: list, system_prompt: str) -> str:
    """
    Generates response using OpenAI's GPT-4o.
    """
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": system_prompt}] + messages,
        temperature=0.7,
        max_tokens=500
    )
    return response.choices[0].message.content

# Simple text chunking helper
def chunk_text(text: str, chunk_size: int = 700, overlap: int = 100) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks

async def get_relevant_context(query: str, db) -> str:
    """
    Performs vector search on the 'documents' collection and returns joined content.
    """
    normalized_query = query.lower()
    replacements = {
        "my target audience": "target audience",
        "who is my target audience": "who is the target audience",
        "what are my services": "what are the company services",
        "our target audience": "target audience"
    }
    for old, new in replacements.items():
        if old in normalized_query:
            normalized_query = normalized_query.replace(old, new)
            
    query_embedding = await get_embedding(normalized_query)
    pipeline = [
        {"$vectorSearch": {
            "index": "vector_index", 
            "path": "embedding", 
            "queryVector": query_embedding, 
            "numCandidates": 100, 
            "limit": 4
        }},
        {"$project": {"_id": 0, "content": 1}}
    ]
    
    try:
        results = await db["documents"].aggregate(pipeline).to_list(length=4)
        return "\n\n".join([doc.get("content", "") for doc in results])
    except Exception as e:
        print(f"RAG Search Error: {e}")
        return ""
