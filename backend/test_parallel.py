import os
from dotenv import load_dotenv

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(override=True)

import app.services.llm_service as llm_service
from groq import Groq

messages = [{"role": "user", "content": "hello"}]

print("\n==============================")
print("🧪 TEST 1: Break Groq ONLY")
print("==============================")
# Break Groq
llm_service.client = Groq(api_key="gsk_brokenkey_1234")

# Keep OpenRouter working
os.environ["OPENROUTER_API_KEY"] = os.getenv("OPENROUTER_API_KEY", "")

res1 = llm_service.call_llm_with_fallbacks(messages, max_tokens=20, timeout=10)
print(f"--- TEST 1 RESULT: {res1} ---")


print("\n==============================")
print("🧪 TEST 2: Break OpenRouter ONLY")
print("==============================")
# Fix Groq
load_dotenv(override=True)
llm_service.client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Break OpenRouter
os.environ["OPENROUTER_API_KEY"] = "sk-or-v1-brokenkey123"

res2 = llm_service.call_llm_with_fallbacks(messages, max_tokens=20, timeout=10)
print(f"--- TEST 2 RESULT: {res2} ---")


print("\n==============================")
print("🧪 TEST 3: Break BOTH")
print("==============================")
# Break Groq
llm_service.client = Groq(api_key="gsk_brokenkey_1234")
# Break OpenRouter
os.environ["OPENROUTER_API_KEY"] = "sk-or-v1-brokenkey123"

res3 = llm_service.call_llm_with_fallbacks(messages, max_tokens=20, timeout=10)
print(f"--- TEST 3 RESULT: {res3} ---")
