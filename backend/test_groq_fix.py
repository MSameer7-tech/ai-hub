import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv(override=True)
api_key = os.getenv("GROQ_API_KEY")
print(f"Testing with key: {api_key[:10]}...")

client = Groq(api_key=api_key)
try:
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": "hi"}],
        max_tokens=10
    )
    print("✅ Groq Success!")
    print(f"Response: {response.choices[0].message.content}")
except Exception as e:
    print(f"❌ Groq Failed: {e}")
