import os
from dotenv import load_dotenv
load_dotenv()

from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Hello",
    config={"max_output_tokens": 50}
)

print("✅ Gemini response:", response.text)
