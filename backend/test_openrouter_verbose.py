import os
import requests
from dotenv import load_dotenv

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(override=True)

api_key = os.getenv("OPENROUTER_API_KEY")
model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-exp:free")

print(f"Testing OpenRouter Key: {api_key[:10]}...")
print(f"Testing Model: {model}")

try:
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
        },
        json={
            "model": model,
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 10
        }
    )
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    
    if response.status_code == 200:
        print("✅ SUCCESS!")
        print(f"Response: {data['choices'][0]['message']['content']}")
    else:
        print("❌ FAILED!")
        print(f"Error Data: {data}")
        
except Exception as e:
    print(f"❌ CRITICAL ERROR: {e}")
