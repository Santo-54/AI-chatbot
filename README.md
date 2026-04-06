# AI Website Chatbot System

A full-stack AI chatbot application with RAG (Retrieval Augmented Generation), Lead Capture, and an Admin Dashboard.

## 🏗 Architecture

- **Backend**: FastAPI, MongoDB Atlas (Vector Search), OpenAI API (GPT-4o, text-embedding-3-small).
- **Frontend**: React (Vite), Axios, Chart.js, Lucide Icons.
- **Authentication**: JWT for Admin Panel.

## 🚀 Setup Instructions

### 1. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    -   Windows: `venv\Scripts\activate`
    -   Mac/Linux: `source venv/bin/activate`
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Configure `.env` file:
    ```ini
    OPENAI_API_KEY=your_openai_key
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    ```
6.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```

### 2. Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

## 🗄 MongoDB Atlas Setup (Crucial!)

To enable RAG, you must create a Vector Search Index in MongoDB Atlas.

1.  Go to your MongoDB Atlas Cluster -> **Atlas Search**.
2.  Click **Create Search Index**.
3.  Choose **JSON Editor**.
4.  Select the **database** (`chatbot_db`) and **collection** (`documents`).
5.  Enter the Index Name: `vector_index` (Must match the code in `chat.py`).
6.  Paste this JSON configuration:

```json
{
  "fields": [
    {
      "numDimensions": 1536,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    }
  ]
}
```

7.  Click **Next** and **Create Search Index**. Wait for the status to become "Active".

## 📦 Deployment

-   **Frontend**: Deploy to [Vercel](https://vercel.com/). Connect your GitHub repo and set the Root Directory to `frontend`.
-   **Backend**: Deploy to [Render](https://render.com/) or Railway.
    -   Build Command: `pip install -r requirements.txt`
    -   Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
    -   Add Environment Variables in the dash

## 🔑 Admin Access

-   **Login URL**: `/login`
-   **Default User**: `admin`
-   **Default Password**: `admin123` (Change this in `backend/app/routes/admin.py` for production!)

## ✨ Features

-   **RAG Chatbot**: Upload PDFs in Admin -> Chatbot answers using content.
-   **Lead Capture**: Detects emails in chat and saves them.
-   **Analytics**: Tracks views, chats, and leads.
