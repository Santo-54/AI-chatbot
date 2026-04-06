import requests
import json

try:
    response = requests.get("http://localhost:8000/admin/debug-docs")
    if response.status_code == 200:
        docs = response.json()
        with open("documents_dump.json", "w", encoding="utf-8") as f:
            json.dump(docs, f, indent=2)
        print("Successfully wrote documents_dump.json")
    else:
        print(f"Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
