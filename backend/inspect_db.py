import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MON_URI = os.getenv("MONGO_URI")
DB_NAME = "chatbotdb"

def inspect_docs():
    print(f"Connecting to {DB_NAME}...")
    client = MongoClient(MON_URI)
    db = client[DB_NAME]
    
    print("Listing documents in 'documents' collection:")
    docs = list(db["documents"].find({}))
    
    print(f"Total documents found: {len(docs)}")
    for i, doc in enumerate(docs):
        filename = doc.get("filename", "Unknown")
        content_preview = doc.get("content", "")[:100].replace("\n", " ")
        print(f"[{i}] File: {filename} | Content: {content_preview}...")
        
    client.close()

if __name__ == "__main__":
    inspect_docs()
