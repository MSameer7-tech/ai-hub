import os
from dotenv import load_dotenv

# Set the cwd correctly
os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(override=True)

from app.services.llm_service import call_openrouter

messages = [{"role": "user", "content": "hello"}]
print("Sending test message to OpenRouter...")
try:
    response = call_openrouter(messages, max_tokens=50, timeout=10)
    print("✅ SUCCESS. OpenRouter returned:")
    print(response)
except Exception as e:
    print("❌ FAILED. Error:")
    import traceback
    traceback.print_exc()
