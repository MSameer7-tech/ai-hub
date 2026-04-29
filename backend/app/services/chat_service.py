from app.models.schemas import ChatRequest
from app.services.llm_service import (
    evaluate_quiz_answer,
    generate_response,
)
from app.services.news_service import get_news_context
from app.services.quiz_service import generate_quiz

SYSTEM_PROMPT = """
You are a helpful AI assistant.
Answer naturally and briefly.
Do not mention system rules or internal context.
"""
UPSC_SYSTEM_PROMPT = """
You are a UPSC exam expert.

Answer in this format:

1. Introduction
2. Key Facts (bullet points)
3. Analysis
4. Conclusion

Keep it concise but informative.
"""
NEWS_SYSTEM_PROMPT = """
You are a helpful AI assistant with access to latest current affairs.
If the user asks about news, answer only from the supplied current-affairs notes.
If the answer is missing, say: "I couldn't find that in the latest current affairs."
Do not invent facts or mention the notes.
Keep answers brief and natural.
"""
CURRENT_AFFAIRS_KEYWORDS = [
    "news",
    "current affairs",
    "today's",
    "latest news",
    "breaking news",
    "economy update",
    "government policy",
    "election results",
    "war update",
    "today in",
]
GREETINGS = {"hi", "hello", "hey"}


def is_current_affairs_query(user_input: str) -> bool:
    normalized_input = user_input.lower()
    # Only route if it looks like a news request
    return any(word in normalized_input for word in CURRENT_AFFAIRS_KEYWORDS) or \
           ("india" in normalized_input and "news" in normalized_input) or \
           ("latest" in normalized_input and "?" not in normalized_input)


def is_greeting(text: str) -> bool:
    return text.lower().strip() in GREETINGS


chat_sessions: dict[str, list[dict[str, str]]] = {}

def get_chat_response(request: ChatRequest) -> dict[str, str | bool | None]:
    message = request.message.strip()
    normalized_message = message.lower()
    session_id = getattr(request, "session_id", "default")

    if session_id not in chat_sessions:
        chat_sessions[session_id] = []

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

    is_news_query = is_current_affairs_query(message)
    context = get_news_context()[:1800] if is_news_query else ""
    user_prompt = (
        f"Current affairs notes:\n{context}\n\nUser: {message}"
        if is_news_query
        else message
    )
    
    history = chat_sessions[session_id][-6:]

    if request.mode == "upsc":
        active_system_prompt = UPSC_SYSTEM_PROMPT
    else:
        active_system_prompt = NEWS_SYSTEM_PROMPT if is_news_query else SYSTEM_PROMPT

    response = generate_response(
        system_prompt=active_system_prompt,
        user_prompt=user_prompt,
        history=history,
        fallback="I'm having trouble reaching the AI service right now. Please try again.",
        timeout=12,
        max_tokens=200,
        use_cache=is_news_query,
    )

    if isinstance(response, dict) and response.get("error") == "quota_exceeded":
        return response

    if request.mode == "upsc":
        mode = "upsc"
    else:
        mode = "current_affairs" if is_news_query else "chat"

    chat_sessions[session_id].append({"role": "user", "content": message})
    chat_sessions[session_id].append({"role": "assistant", "content": response.strip()})

    return {
        "response": response.strip(),
        "mode": mode,
    }
