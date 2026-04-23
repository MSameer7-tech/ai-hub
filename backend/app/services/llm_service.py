import json
import os

import ollama
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_CLIENT = ollama.Client(host=OLLAMA_BASE_URL)


def get_llm_response(message: str) -> str:
    response = OLLAMA_CLIENT.chat(
        model="llama3",
        messages=[{"role": "user", "content": message}],
    )
    return response["message"]["content"]


def get_contextual_response(context: str, question: str) -> str:
    prompt = f"Answer ONLY from the following data:\n{context}\nQuestion: {question}"
    response = OLLAMA_CLIENT.chat(
        model="llama3",
        messages=[{"role": "user", "content": prompt}],
    )
    return response["message"]["content"]


def get_answer_explanation(
    question: str,
    correct_answer: str,
    user_answer: str,
    is_correct: bool,
) -> str:
    verdict = "correct" if is_correct else "incorrect"
    prompt = (
        "Explain briefly why the answer is "
        f"{verdict}.\nQuestion: {question}\n"
        f"Correct answer: {correct_answer}\nUser answer: {user_answer}"
    )
    response = OLLAMA_CLIENT.chat(
        model="llama3",
        messages=[{"role": "user", "content": prompt}],
    )
    return response["message"]["content"]


def evaluate_quiz_answer(
    question: str,
    correct_answer: str,
    user_answer: str,
) -> dict[str, str | bool]:
    prompt = f"""Evaluate the user's answer.

Question: {question}
Correct Answer: {correct_answer}
User Answer: {user_answer}

Rules:
- If answer is mostly correct, return true
- If partially correct, still return true
- If wrong, return false

Also provide a short explanation.

Return JSON:
{{
  "correct": true/false,
  "explanation": ""
}}
"""
    response = OLLAMA_CLIENT.chat(
        model="llama3",
        messages=[{"role": "user", "content": prompt}],
        format="json",
    )
    content = response["message"]["content"]
    parsed_response = json.loads(content)
    return {
        "correct": bool(parsed_response.get("correct", False)),
        "explanation": str(parsed_response.get("explanation", "")).strip(),
    }


def generate_chat_title(message: str) -> str:
    response = OLLAMA_CLIENT.chat(
        model="llama3",
        messages=[
            {
                "role": "user",
                "content": (
                    "Generate a short 3-5 word title for this conversation:\n"
                    f"{message}"
                ),
            }
        ],
    )
    return response["message"]["content"].strip()
