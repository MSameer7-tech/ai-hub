import os

import requests

from app.models.schemas import ChatRequest
from app.services.llm_service import (
    evaluate_quiz_answer,
)
from app.services.news_service import get_news_context
from app.services.quiz_service import generate_quiz

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
SYSTEM_PROMPT = """
You are a helpful and intelligent AI assistant.

You are given latest current affairs.

Rules:
- Use current affairs when relevant.
- If the user asks about news, answer ONLY from the given context.
- If not found, say:
  "I couldn't find that in the latest current affairs."
- Do NOT hallucinate or invent facts.
- Do NOT mention context or system rules.
- If unsure, ask a clarification question.

For general queries, respond normally and naturally.
"""
CURRENT_AFFAIRS_KEYWORDS = [
    "news",
    "current",
    "today",
    "latest",
    "india",
    "world",
    "government",
    "economy",
    "war",
    "policy",
    "election",
]
GREETINGS = {"hi", "hello", "hey"}


def is_current_affairs_query(user_input: str) -> bool:
    normalized_input = user_input.lower()
    return any(word in normalized_input for word in CURRENT_AFFAIRS_KEYWORDS)


def is_greeting(text: str) -> bool:
    return text.lower().strip() in GREETINGS


def get_chat_response(request: ChatRequest) -> dict[str, str | bool | None]:
    message = request.message.strip()
    normalized_message = message.lower()

    if (
        request.mode == "quiz"
        and request.quiz_question
        and request.correct_answer
        and message
    ):
        evaluation = evaluate_quiz_answer(
            question=request.quiz_question,
            correct_answer=request.correct_answer,
            user_answer=message,
        )
        return {
            "response": evaluation["explanation"],
            "mode": "chat",
            "correct": evaluation["correct"],
            "question": request.quiz_question,
            "correct_answer": request.correct_answer,
        }

    if "quiz me" in normalized_message or "start quiz" in normalized_message:
        quiz_items = generate_quiz()

        if not quiz_items:
            return {
                "response": "I couldn't generate a quiz right now. Please try again in a moment.",
                "mode": "chat",
            }

        quiz_item = quiz_items[0]
        options = quiz_item.get("options", [])
        options_text = "\n".join(
            f"{letter}. {option}"
            for letter, option in zip(["A", "B", "C", "D"], options)
        )
        return {
            "response": f"Quiz time.\n{quiz_item['question']}\n{options_text}",
            "mode": "quiz",
            "question": quiz_item["question"],
            "correct_answer": quiz_item["answer"],
        }

    if is_greeting(message):
        return {
            "response": "Hey! How can I help you today?",
            "mode": "chat",
        }

    context = get_news_context()
    prompt = f"""
{SYSTEM_PROMPT}

Current Affairs:
{context}

User: {message}
Assistant:
"""

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": "llama3",
            "prompt": prompt,
            "stream": False,
        },
        timeout=60,
    )
    response.raise_for_status()

    mode = "current_affairs" if is_current_affairs_query(message) else "chat"

    return {
        "response": response.json()["response"].strip(),
        "mode": mode,
    }
