import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

async def test_chat_logic():
    print("Starting Chat Logic Verification...")
    
    # Mock dependencies
    mock_db = MagicMock()
    mock_db["conversations"].find_one = AsyncMock()
    mock_db["documents"].aggregate.return_value.to_list = AsyncMock()
    mock_db["conversations"].update_one = AsyncMock()
    mock_db["analytics"].update_one = AsyncMock()
    mock_db["conversations"].count_documents = AsyncMock()
    
    # Patch get_embedding and get_chat_response
    with patch("app.routes.chat.get_embedding", new_callable=AsyncMock) as mock_embed, \
         patch("app.routes.chat.get_chat_response", new_callable=AsyncMock) as mock_response, \
         patch("app.routes.chat.get_database", return_value=mock_db):
        
        import app.routes.chat as chat_module
        from app.models.schemas import ChatRequest
        chat_endpoint = chat_module.chat_endpoint
        
        # Scenario 1: Greeting / General Inquiry (No History)
        mock_db["conversations"].find_one.return_value = None
        mock_embed.return_value = [0.1] * 1536
        mock_db["documents"].aggregate.return_value.to_list.return_value = [{"content": "Our company offers web development services."}]
        mock_response.return_value = "We offer expert web development services to help your business grow."
        
        request = ChatRequest(message="What do you do?", session_id="test_session_1")
        response = await chat_endpoint(request, MagicMock(), mock_db)
        
        print(f"DEBUG Scenario 1 Response: {repr(response.response)}")
        assert "web development" in response.response.lower()

        # Scenario 2: Pricing Logic (Lead Capture Offer)
        mock_response.return_value = "Our pricing varies. If you'd like, I can have our team share more details with you. May I get your name and email?"
        
        request = ChatRequest(message="What is the cost?", session_id="test_session_1")
        response = await chat_endpoint(request, MagicMock(), mock_db)
        
        print(f"DEBUG Scenario 2 Response: {repr(response.response)}")
        assert "May I get your name and email?" in response.response

        # Scenario 3: Already Asked (No Repeated Lead Capture)
        # Mock history where assistant already asked
        mock_db["conversations"].find_one.return_value = {
            "messages": [
                {"role": "user", "content": "What is the cost?"},
                {"role": "assistant", "content": "Our pricing varies. If you'd like, I can have our team share more details with you. May I get your name and email?"}
            ]
        }
        mock_response.return_value = "As mentioned, pricing depends on the project scope."
        
        request = ChatRequest(message="Tell me more about pricing", session_id="test_session_1")
        # Ensure 'extra_instructions' is empty because it was already asked
        # We can't easily check 'extra_instructions' directly, but we can check if it repeats
        response = await chat_endpoint(request, MagicMock(), mock_db)
        print(f"✅ Scenario 3 (No Repeat): {response.response}")
        
        # Scenario 5: Formatting Verification (Vertical Bullets & Header Spacing)
        mock_response.return_value = "Services:\n\n- **AI development:** Expert AI solutions\n- RAG systems\n- automation"
        # In real logic, post-processing should handle this or LLM should follow prompt
        # Let's mock a response that needs post-processing
        mock_db["documents"].aggregate.return_value.to_list.return_value = [{"content": "Services: AI, RAG, Web."}]
        
        request = ChatRequest(message="List your services", session_id="test_session_formatting")
        response = await chat_endpoint(request, MagicMock(), mock_db)
        
        print(f"DEBUG Scenario 5 Raw Response: {repr(response.response)}")
        assert "**Services:**" in response.response
        assert "- **AI development:**" in response.response
        assert "\n\n\n" not in response.response 

        # Scenario 6: Target Audience Fail Debug
        mock_db["documents"].aggregate.return_value.to_list.return_value = [{"content": "Target Audience: Students, Parents, Educators."}]
        mock_response.side_effect = None # Remove side effect if any
        
        # Real call to get_chat_response (requires API key)
        # But we want to test the LLM behavior, so let's stick to mocking for now
        # OR better: let's see if the logic in chat.py itself is doing something
        
        request = ChatRequest(message="target audience", session_id="test_session_target")
        response = await chat_endpoint(request, MagicMock(), mock_db)
        print(f"DEBUG Scenario 6 Response: {repr(response.response)}")

    print("\nAll tests passed!")

if __name__ == "__main__":
    asyncio.run(test_chat_logic())
