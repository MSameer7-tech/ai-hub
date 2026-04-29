import os, requests
from dotenv import load_dotenv

os.chdir(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(override=True)

url = "https://openrouter.ai/api/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
    "Content-Type": "application/json",
}

for model in ["openai/gpt-3.5-turbo", "google/gemini-pro", os.getenv('OPENROUTER_MODEL')]:
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "hello"}],
        "max_tokens": 10
    }
    resp = requests.post(url, headers=headers, json=payload)
    print(f"Model: {model} -> {resp.status_code}")
    if resp.status_code == 200:
        print(resp.json()["choices"][0]["message"]["content"])
        break
