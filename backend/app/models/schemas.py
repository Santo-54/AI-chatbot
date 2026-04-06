from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class User(BaseModel):
    username: str
    email: str | None = None
    full_name: str | None = None
    disabled: bool | None = None

class UserInDB(User):
    hashed_password: str

class ChatRequest(BaseModel):
    message: str
    session_id: str
    language: str = "en"

class ChatResponse(BaseModel):
    response: str
    session_id: str

class LeadCreate(BaseModel):
    name: str
    email: EmailStr
    session_id: str
    source: str = "chatbot"

class LeadResponse(LeadCreate):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class AnalyticsData(BaseModel):
    total_views: int
    total_chats: int
    total_leads: int
