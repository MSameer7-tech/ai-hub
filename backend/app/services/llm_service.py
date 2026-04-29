import json
import os
import re
import threading
import time
import requests
from dotenv import load_dotenv
from groq import Groq
from google import genai

load_dotenv(override=True)

def sanitize_env_key(key: str | None) -> str | None:
    if not key: return None
    # Remove any non-ascii characters (like Cyrillic 'o' poisoning)
    return "".join(c for c in key if ord(c) < 128).strip()

GROQ_API_KEY = sanitize_env_key(os.getenv("GROQ_API_KEY"))
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GEMINI_API_KEY = sanitize_env_key(os.getenv("GEMINI_API_KEY"))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
OPENROUTER_API_KEY = sanitize_env_key(os.getenv("OPENROUTER_API_KEY"))
TOGETHER_API_KEY = sanitize_env_key(os.getenv("TOGETHER_API_KEY"))
MISTRAL_API_KEY = sanitize_env_key(os.getenv("MISTRAL_API_KEY"))

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

def call_groq(messages, max_tokens, timeout):
    if not client: raise ValueError("Groq key missing")
    
    result_holder = []
    error_holder = []

    def _call():
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            if not response or not response.choices:
                raise Exception("Empty Groq response")
            result_holder.append(response.choices[0].message.content)
        except Exception as e:
            error_holder.append(e)

    t = threading.Thread(target=_call, daemon=True)
    t.start()
    t.join(timeout)

    if t.is_alive():
        raise TimeoutError(f"Groq timed out after {timeout}s")
    if error_holder:
        raise error_holder[0]

    res = result_holder[0] if result_holder else ""
    print("[GROQ] RESPONSE:", repr(res))
    return res.strip()

def call_gemini(messages, max_tokens, timeout):
    if not gemini_client:
        raise Exception("Missing Gemini API Key")
    contents = [m.get("content", "") for m in messages]
    result_holder: list = []
    error_holder: list = []
    def _call():
        try:
            resp = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
                config={"max_output_tokens": max_tokens, "temperature": 0.7},
            )
            try:
                text = resp.candidates[0].content.parts[0].text
                result_holder.append(text)
            except Exception:
                raise Exception(f"Invalid Gemini response structure: {resp}")
        except Exception as exc:
            error_holder.append(exc)
    t = threading.Thread(target=_call, daemon=True)
    t.start()
    t.join(timeout=timeout)
    if t.is_alive():
        raise TimeoutError(f"Gemini timed out after {timeout}s")
    if error_holder:
        raise error_holder[0]
    res = result_holder[0] if result_holder else ""
    return res.strip()

def call_openrouter(messages):
    if not OPENROUTER_API_KEY:
        raise ValueError("OpenRouter key missing")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    # Use guaranteed free model to bypass credit check
    body = {"model": "meta-llama/llama-3.3-70b-instruct:free", "messages": messages, "max_tokens": 400}
    response = requests.post(url, headers=headers, json=body, timeout=10)
    if response.status_code != 200:
        raise Exception(f"OpenRouter HTTP {response.status_code}: {response.text[:200]}")
    data = response.json()
    try:
        res = data["choices"][0]["message"]["content"]
    except Exception:
        raise Exception(f"Invalid OpenRouter response: {data}")
    print("[OPENROUTER] RESPONSE:", repr(res))
    return res.strip()

def call_together(messages):
    if not TOGETHER_API_KEY:
        raise ValueError("Together API key missing")
    url = "https://api.together.xyz/v1/chat/completions"
    headers = {"Authorization": f"Bearer {TOGETHER_API_KEY}", "Content-Type": "application/json"}
    body = {
        "model": "meta-llama/Llama-3-8b-chat-hf",
        "messages": messages,
        "max_tokens": 300,
        "temperature": 0.7,
    }
    response = requests.post(url, headers=headers, json=body, timeout=10)
    if response.status_code != 200:
        raise Exception(f"Together API error {response.status_code}: {response.text[:200]}")
    data = response.json()
    try:
        res = data["choices"][0]["message"]["content"]
    except Exception:
        raise Exception(f"Invalid Together response: {data}")
    print("[TOGETHER] RESPONSE:", repr(res))
    return res.strip()

def call_mistral(messages):
    if not MISTRAL_API_KEY:
        raise ValueError("Mistral key missing")
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"}
    body = {
        "model": "mistral-small-latest",
        "messages": messages,
        "max_tokens": 300,
        "temperature": 0.7,
    }
    response = requests.post(url, headers=headers, json=body, timeout=10)
    if response.status_code != 200:
        raise Exception(f"Mistral error {response.status_code}: {response.text[:200]}")
    data = response.json()
    try:
        res = data["choices"][0]["message"]["content"]
    except Exception:
        raise Exception(f"Invalid Mistral response: {data}")
    print("[MISTRAL] RESPONSE:", repr(res))
    return res.strip()

def clean_response(text: str) -> str:
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    return " ".join(text.strip().split())


def _coerce_text_response(result: str | dict, fallback: str) -> str:
    if isinstance(result, dict):
        return str(result.get("message") or fallback)
    cleaned = clean_response(str(result))
    return cleaned or fallback


def call_llm_with_fallbacks(messages: list[dict], max_tokens: int, timeout: int) -> str | dict:
    last_message = messages[-1].get("content", "").strip() if messages else ""
    
    # ⚡ Shortcut for short non-question messages
    if "?" not in last_message and len(last_message.split()) <= 2:
        return "Hey! How can I help you today?"

    messages = messages[-12:]

    providers = [
        ("groq", lambda m: call_groq(m, 512, 10), 2),
        ("mistral", lambda m: call_mistral(m), 2),
        ("openrouter", lambda m: call_openrouter(m), 2),
        ("together", lambda m: call_together(m), 1),
        ("gemini", lambda m: call_gemini(m, 512, 12), 1),
    ]

    for name, func, retries in providers:
        for attempt in range(retries):
            try:
                print(f"⚡ {name} attempt {attempt+1}")
                res = func(messages)
                print(f"📩 RAW {name.upper()}:", repr(res))
                if res and len(res.strip()) > 2:
                    print(f"✅ {name} success")
                    return res.strip()
            except Exception as e:
                print(f"❌ {name} failed:", e)
                time.sleep(0.5)

    print("🔥 ALL PROVIDERS FAILED")
    return {
        "status": "limit_exhausted",
        "message": "API rate limits are currently exhausted. You can still explore the Current Affairs and Quiz sections while things reset."
    }

def generate_response(
    system_prompt: str,
    user_prompt: str,
    history: list[dict[str, str]] | None = None,
    fallback: str = "Hey! I'm here 👍 Ask me anything again.",
    timeout: int = 12,
    max_tokens: int = 150,
    **kwargs,
) -> str | dict:
    messages = [{"role": "system", "content": system_prompt}]
    if history: messages.extend(history)
    messages.append({"role": "user", "content": user_prompt})
    
    result_holder = []
    error_holder = []

    def _run():
        try:
            res = call_llm_with_fallbacks(messages, max_tokens, timeout)
            result_holder.append(res)
        except Exception as e:
            error_holder.append(e)

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout)  # 🔥 GLOBAL HARD LIMIT

    if t.is_alive():
        print("⏱️ GLOBAL TIMEOUT HIT")
        return "Hey! Took too long. Try again 👍"

    if error_holder:
        print("❌ GLOBAL ERROR:", error_holder[0])
        return fallback

    return result_holder[0] if result_holder else fallback

def get_llm_response(message: str) -> str:
    return _coerce_text_response(generate_response(
        system_prompt="You are a helpful AI assistant. Respond naturally and clearly.",
        user_prompt=message,
    ), "Hey! I'm here 👍 Ask me anything again.")

def get_contextual_response(context: str, question: str) -> str:
    return _coerce_text_response(generate_response(
        system_prompt=(
            "Answer using only the provided data. If the answer is not present, "
            'reply exactly: "Not available in current data". Keep the answer concise.'
        ),
        user_prompt=f"Data:\n{context[:2500]}\n\nQuestion: {question}",
        fallback="Not available in current data",
        max_tokens=150,
    ), "Not available in current data")

def generate_chat_title(message: str) -> str:
    title = _coerce_text_response(generate_response(
        system_prompt=(
            "Generate concise conversation titles. Return only a 3-5 word title, "
            "with no quotes or punctuation unless necessary."
        ),
        user_prompt=f"Conversation starter:\n{message[:300]}",
        fallback="New Chat",
        max_tokens=20,
    ), "New Chat")
    return title.strip().strip('"')[:60] or "New Chat"


def _clean_text(text: str) -> str:
    return " ".join(str(text or "").strip().split())

def _extract_json_object(text: str) -> dict:
    if isinstance(text, dict): return text
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response")
    return json.loads(match.group(0))
