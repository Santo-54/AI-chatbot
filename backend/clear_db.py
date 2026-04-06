import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MON_URI = os.getenv("MONGO_URI")
DB_NAME = "chatbotdb"

def clear_docs():
    print(f"Connecting to {DB_NAME}...")
    client = MongoClient(MON_URI)
    db = client[DB_NAME]
    
    result = db["documents"].delete_many({})
    print(f"Deleted {result.deleted_count} documents from 'documents' collection.")
        
    client.close()

if __name__ == "__main__":
    clear_docs()
