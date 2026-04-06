import urllib.request
import json
import os

def test_live_tts():
    print("🚀 Starting ROBUST LIVE TTS Verification...")
    url = "http://127.0.0.1:8000/voice/text-to-speech"
    data = json.dumps({
        "text": "Hello, this is a robust test.",
        "language": "en"
    }).encode('utf-8')
    
    headers = {
        "Content-Type": "application/json"
    }
    
    req = urllib.request.Request(url, data=data, headers=headers)
    
    try:
        print(f"📡 Sending request to {url}...")
        with urllib.request.urlopen(req) as response:
            status = response.status
            content_type = response.getheader("Content-Type")
            audio_data = response.read()
            content_length = len(audio_data)
            
            print(f"📥 Status Code: {status}")
            print(f"✅ Success! Content-Type: {content_type}, Size: {content_length} bytes")
            
            if content_length < 500:
                print(f"⚠️ Warning: Response is extremely small ({content_length} bytes). Content: {audio_data}")
            else:
                with open("test_voice_ok.mp3", "wb") as f:
                    f.write(audio_data)
                print(f"📁 Audio saved to {os.path.abspath('test_voice_ok.mp3')}")

    except Exception as e:
        print(f"❌ Error: {e}")
        if hasattr(e, 'read'):
            print(f"📄 Response Content: {e.read().decode('utf-8')}")

if __name__ == "__main__":
    test_live_tts()
