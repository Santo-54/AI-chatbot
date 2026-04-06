from fastapi import APIRouter, Depends
from app.database import get_database
from app.models.schemas import LeadCreate, LeadResponse
from datetime import datetime

router = APIRouter()

@router.post("/track-view")
async def track_view(db = Depends(get_database)):
    await db["analytics"].update_one({}, {"$inc": {"total_views": 1}}, upsert=True)
    return {"status": "ok"}

@router.post("/lead", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, db = Depends(get_database)):
    new_lead = lead.dict()
    new_lead["created_at"] = datetime.utcnow()
    result = await db["leads"].insert_one(new_lead)
    new_lead["id"] = str(result.inserted_id)
    
    # Increment stats
    await db["analytics"].update_one({}, {"$inc": {"total_leads": 1}}, upsert=True)
    
    return LeadResponse(**new_lead)
