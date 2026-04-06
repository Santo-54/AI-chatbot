from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.utils.auth import get_password_hash, verify_password, create_access_token
from app.database import get_database
from app.models.schemas import Token, LeadResponse, AnalyticsData
from app.utils.rag import get_embedding, chunk_text
from datetime import timedelta, datetime
import pdfplumber
import io

router = APIRouter(prefix="/admin", tags=["admin"])

# Mock Admin User (In production, store in DB)
FAKE_USERS_DB = {
    "admin": {
        "username": "admin",
        "hashed_password": get_password_hash("admin123"), # Default password
        "disabled": False,
    }
}

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = FAKE_USERS_DB.get(form_data.username)
    if not user or not verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user['username']}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/upload-doc")
async def upload_document(file: UploadFile = File(...), db = Depends(get_database)):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files allowed")
    
    contents = await file.read()
    text = ""
    
    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
            
    if not text.strip():
        raise HTTPException(400, "Could not extract text from PDF. It might be a scanned image.")

    chunks = chunk_text(text)
    
    docs_to_insert = []
    for chunk in chunks:
        embedding = await get_embedding(chunk)
        docs_to_insert.append({
            "content": chunk,
            "embedding": embedding,
            "filename": file.filename,
            "created_at": datetime.utcnow()
        })
        
    if docs_to_insert:
        await db["documents"].insert_many(docs_to_insert)
        
    return {"filename": file.filename, "chunks": len(chunks)}

@router.get("/leads", response_model=list[LeadResponse])
async def get_leads(db = Depends(get_database)):
    leads_cursor = db["leads"].find().sort("created_at", -1)
    leads = await leads_cursor.to_list(100)
    
    # Map _id to id
    for lead in leads:
        if "_id" in lead:
            lead["id"] = str(lead["_id"])
            
    return leads

@router.get("/analytics", response_model=AnalyticsData)
async def get_analytics(db = Depends(get_database)):
    # Simple aggregation
    stats = await db["analytics"].find_one() or {}
    return AnalyticsData(
        total_views=stats.get("total_views", 0),
        total_chats=stats.get("total_chats", 0),
        total_leads=stats.get("total_leads", 0)
    )

@router.get("/debug-docs")
async def debug_documents(db = Depends(get_database)):
    docs = await db["documents"].find().to_list(100)
    return [{"filename": d.get("filename"), "snippet": d.get("content")[:100]} for d in docs]
