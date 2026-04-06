from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.models.schemas import ChatRequest, ChatResponse
from app.utils.rag import get_embedding, get_chat_response, get_relevant_context
from app.database import get_database
from datetime import datetime
import uuid
import re

router = APIRouter()

# 🎨 ULTIMATE FORMATTING LOCK PROMPT
ENGLISH_LOCK_PROMPT = """### 📏 CRITICAL FORMATTING RULES (PRIORITY 1)
1. **List-First Mandate**: If the answer contains multiple items, categories, or groups (like "Target Audience" or "Services"), you MUST use a bulleted list. 
2. **No Paragraphs for Data**: NEVER combine multiple distinct points into a single dense paragraph.
3. **Bold Titles**: Use **Title:** (Bold Title ending in colon) for sections.
4. **Bullet Points**: Use simple hyphens (-) for list items.
5. **Bold Inline Labels**: Use **Label**: (Bold Label ending in colon) at the start of list items.

### ✅ CORRECT EXAMPLE:
**Target Audience:**
- **Students**: Learners seeking scientific curiosity.
- **Parents**: Caregivers supporting growth.

### ❌ INCORRECT EXAMPLE (FORBIDDEN):
Target Audience: Edsurance targets students, parents, and educators. It aims to empower... [DO NOT DO THIS]

### 🔐 MASTER LANGUAGE LOCK: ENGLISH
1. **Target Language**: ENGLISH only.
2. **Translation**: Always respond in English. 

### 📏 CONVERSATIONAL RULES
1. **Be Polite**: Use "Could you please...", "May I...", and "If you'd like...". 
2. **Short Closings**: End with a SINGLE, short sentence. **FORBIDDEN PHRASES**: "I'm happy to share more", "Just let me know", "Feel free to ask". 
3. **Preferred Closing**: "Let me know if you'd like more details."

Context:
{context}

### 🛑 FINAL REMINDER: 
Respond ONLY in English. Use BULLET POINTS for structured data. Maintain a friendly and professional tone.
"""

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, background_tasks: BackgroundTasks, db = Depends(get_database)):
    session_id = request.session_id or str(uuid.uuid4())
    user_query = request.message
    
    cleaned_query = user_query.strip()
    
    # 1. English Script Guard
    contains_foreign_script = False
    for char in cleaned_query:
        cp = ord(char)
        if cp <= 0x00FF: continue
        if 0x2000 <= cp <= 0x206F: continue 
        if char.isspace() or char.isdigit(): continue
        contains_foreign_script = True
        break

    if not cleaned_query or contains_foreign_script:
        return ChatResponse(response="I currently support English only. Could you please ask your question in English?", session_id=session_id)
    
    # 2. Clarification & Greeting Pre-Logic
    words = [re.sub(r'[^a-zA-Z0-9]', '', w.lower()) for w in cleaned_query.split()]
    words = [w for w in words if w]
    
    GREETINGS = ["hi", "hello", "hey", "hii", "hiii", "vanakam", "namaste", "morning", "afternoon", "evening"]
    FAREWELLS = ["bye", "goodbye", "see ya", "tc", "take care"]
    ACKS = ["thanks", "thank", "thankyou", "welcome", "yes", "ok", "okay", "fine", "sure", "yep", "yea"]
    AMBIGUITY_KEYWORDS = ["it", "them", "cost", "price", "services", "help", "do it", "target", "audience", "who", "about"]
    
    # Categorize for closing logic
    is_greeting = len(words) <= 2 and any(w in GREETINGS for w in words)
    is_farewell = len(words) <= 2 and any(w in FAREWELLS for w in words)
    is_ack = len(words) <= 2 and any(w in ACKS for w in words)
    
    is_short_passing = is_greeting or is_farewell or is_ack or (len(words) <= 2 and any(w in AMBIGUITY_KEYWORDS for w in words))
    
    if len(words) < 2 and not is_short_passing:
        return ChatResponse(response="Could you share a bit more detail so I can assist you better? I'm here to help with any specific questions you have about our services! 😊", session_id=session_id)

    if len(words) < 4 and any(w.lower() in AMBIGUITY_KEYWORDS for w in words) and words[0].strip("?") not in AMBIGUITY_KEYWORDS:
        subject = words[-1].strip("?")
        return ChatResponse(response=f"I just want to make sure I understood correctly — are you asking about our {subject}? Could you please be more specific?", session_id=session_id)

    # 3. Fetch History
    history = []
    convo = await db["conversations"].find_one({"session_id": session_id})
    if convo and "messages" in convo:
        history = convo["messages"][-6:]
    
    formatted_history = [{"role": msg["role"], "content": msg["content"]} for msg in history]
    
    # 4. RAG Logic
    context_text = await get_relevant_context(user_query, db)

    # 5. Intent Detection (Leads)
    LEAD_KEYWORDS = ["pricing", "cost", "quote", "demo", "start project", "contact me", "proposal", "new project", "project idea", "connect", "team"]
    EMAIL_REGEX = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    if re.search(EMAIL_REGEX, user_query):
        ai_msg = "Thank you! I've received your details. I'll make sure our team gets this right away. Is there anything else I can assist you with? 😊"
        background_tasks.add_task(save_conversation, db, session_id, user_query, ai_msg)
        return ChatResponse(response=ai_msg, session_id=session_id)

    already_asked = any("May I get your name and email?" in msg["content"] for msg in formatted_history if msg["role"] == "assistant")
    lead_intent_found = any(keyword in user_query.lower() for keyword in LEAD_KEYWORDS) and not already_asked

    # 6. Generate Response
    full_system_prompt = ENGLISH_LOCK_PROMPT.format(context=context_text)
    if is_greeting and len(formatted_history) == 0:
        full_system_prompt += "\n\n[USER GREETED]: Respond with a warm, natural greeting."
    if lead_intent_found:
        full_system_prompt += "\n\n[LEAD INTENT]: Offer to connect using: 'If you'd like, I can connect you with our team. May I have your name and email?'"

    raw_ai_response = await get_chat_response(messages=formatted_history + [{"role": "user", "content": user_query}], system_prompt=full_system_prompt)
    
    # 7. Post-Processing
    formatted_res = raw_ai_response
    
    # Preserve List Structure (prevent aggressive collapse)
    marker_placeholder = "XYZLISTMARKER"
    formatted_res = re.sub(r'^\s*([*•●○■□▪▫-]|[0-9]+\.)\s+(?![^:]+:)', f'{marker_placeholder} ', formatted_res, flags=re.MULTILINE)
    
    # Neutralize markdown except bolding
    chars_to_strip = ["#", "_", "`"]
    for char in chars_to_strip:
        formatted_res = formatted_res.replace(char, "")
    
    # Restore Structure
    formatted_res = formatted_res.replace(f"{marker_placeholder} ", "- ")
    formatted_res = re.sub(r'(?m)^\s*([^#|*\-\\s][^:\n]+:)\s*$', r'**\1**', formatted_res)
    formatted_res = re.sub(r'(?m)^(\s*-?\s*)([^:*\n]+):', r'\1**\2**:', formatted_res)
    
    # STAGE E: Unify & Deduplicate Closings
    if is_greeting:
        closing_phrase = "How can I help you today?"
    elif is_farewell:
        closing_phrase = "Have a great day! 😊"
    elif is_ack:
        closing_phrase = "Is there anything else I can assist you with?"
    else:
        closing_phrase = "Let me know if you'd like more details."
    
    # 1. Catch overlapping closings or wordy filler and replace with one standard short phrase
    pattern = r"(\s+(If|Should|Please|Let|I'm happy to|Just let me).{1,60}(\.|!|\?|😊)){1,}$"
    formatted_res = re.sub(pattern, f"\n{closing_phrase}", formatted_res, flags=re.IGNORECASE)
    
    # 2. Final Guard: Deduplicate exact closing phrases that might have survived
    formatted_res = re.sub(rf"({re.escape(closing_phrase)}\s*){2,}", closing_phrase, formatted_res, flags=re.IGNORECASE)
    
    # Structural Reconstruction
    lines = [l.strip() for l in formatted_res.split('\n')]
    non_empty = [l for l in lines if l]
    
    final_lines = []
    for i, line in enumerate(non_empty):
        is_header = line.startswith("**") and line.endswith(":**") and not line.startswith("-")
        is_social = (is_greeting or is_farewell or is_ack)
        is_closing = closing_phrase in line or "Let me know if you'd like more details" in line
        
        # Add gap before headers or content-closings, but NOT for social turns
        if (is_header or (is_closing and not is_social)) and i > 0:
            final_lines.append("")
            
        final_lines.append(line)
        
    formatted_res = '\n'.join(final_lines).strip()

    # 8. Save & Return
    background_tasks.add_task(save_conversation, db, session_id, user_query, formatted_res)
    return ChatResponse(response=formatted_res, session_id=session_id)

async def save_conversation(db, session_id, user_msg, ai_msg):
    await db["conversations"].update_one(
        {"session_id": session_id},
        {
            "$push": {
                "messages": {
                    "$each": [
                        {"role": "user", "content": user_msg, "timestamp": datetime.utcnow()},
                        {"role": "assistant", "content": ai_msg, "timestamp": datetime.utcnow()}
                    ]
                }
            },
            "$setOnInsert": {"created_at": datetime.utcnow()}
        },
        upsert=True
    )
    if (await db["conversations"].count_documents({"session_id": session_id})) == 1:
        await db["analytics"].update_one({}, {"$inc": {"total_chats": 1}}, upsert=True)
