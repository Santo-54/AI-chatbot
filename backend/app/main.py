from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db

app = FastAPI(title="AI Chatbot Backend")

print("[V24-CORE]: Backend initialized and synchronized.")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db_client():
    db.connect()

@app.on_event("shutdown")
def shutdown_db_client():
    db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Chatbot API"}

# Include routers later
from app.routes import chat, admin, tracking, voice_routes

app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(tracking.router)
app.include_router(voice_routes.router)
