import threading

from fastapi import APIRouter

from app.models.schemas import QuizAnswerRequest, QuizStartRequest
from app.services.quiz_service import (
    generate_quiz_cached,
    generate_quiz_question,
    get_quiz_source,
)

router = APIRouter()
quiz_cache: list[dict[str, str | list[str]]] = []
answered_questions: set[int] = set()
quiz_lock = threading.Lock()
quiz_state = {
    "questions": [],
    "current": 0,
    "score": 0,
    "total": 5,
    "current_question": None,
    "next_question": None,
    "source_pool": [],
    "asked_questions": set(),
    "session_token": 0,
}


def _question_key(question: dict[str, str | list[str]] | None) -> str:
    if not question:
        return ""
    return str(question.get("question") or "").strip().lower()[:80]


def _prepare_next_question_async(session_token: int) -> None:
    with quiz_lock:
        if quiz_state["session_token"] != session_token:
            return
        total = int(quiz_state["total"])
        current = int(quiz_state["current"])
        source_pool = list(quiz_state["source_pool"])
        asked_questions = set(quiz_state["asked_questions"])

    if current >= total - 1:
        return

    next_question = generate_quiz_question(
        excluded_questions=asked_questions,
        source_pool=source_pool,
    )
    next_key = _question_key(next_question)

    with quiz_lock:
        if quiz_state["session_token"] != session_token:
            return

        if next_key:
            quiz_state["asked_questions"].add(next_key)
        quiz_state["next_question"] = next_question


@router.get("/quiz/start")
def start_quiz() -> dict[str, list[dict[str, str | list[str]]]]:
    global quiz_cache, answered_questions
    quiz_cache = generate_quiz_cached()
    answered_questions = set()
    return {"questions": quiz_cache}


@router.post("/quiz/start")
def start_quiz_with_total(
    request: QuizStartRequest,
) -> dict[str, dict[str, str | list[str]] | int]:
    global quiz_cache, answered_questions, quiz_state

    total = max(1, min(request.total, 15))
    source_pool = get_quiz_source()
    first_question = generate_quiz_question(source_pool=source_pool)
    first_question_key = _question_key(first_question)
    asked_questions = {first_question_key} if first_question_key else set()
    next_question = None

    if total > 1:
        next_question = generate_quiz_question(
            excluded_questions=asked_questions,
            source_pool=source_pool,
        )
        next_key = _question_key(next_question)
        if next_key:
            asked_questions.add(next_key)

    quiz_cache = [first_question]
    if next_question:
        quiz_cache.append(next_question)
    answered_questions = set()
    quiz_state = {
        "questions": quiz_cache,
        "current": 0,
        "score": 0,
        "total": total,
        "current_question": first_question,
        "next_question": next_question,
        "source_pool": source_pool,
        "asked_questions": asked_questions,
        "session_token": int(quiz_state["session_token"]) + 1,
    }

    return {
        "question": first_question,
        "current": 1,
        "total": total,
    }


@router.post("/quiz/answer")
def submit_quiz_answer(
    request: QuizAnswerRequest,
) -> dict[str, str | bool | int | dict[str, str | list[str]] | None]:
    global quiz_state, quiz_cache

    if request.index < 0 or request.index >= len(quiz_cache):
        return {
            "correct": False,
            "correct_answer": "",
            "explanation": "Quiz session expired. Start a new quiz.",
        }

    if request.index in answered_questions:
        return {
            "correct": False,
            "correct_answer": "",
            "explanation": "This question was already answered.",
        }

    answered_questions.add(request.index)
    quiz_item = quiz_cache[request.index]
    correct_answer = str(quiz_item["answer"])
    is_correct = request.answer.strip().upper() == correct_answer
    explanation = str(quiz_item.get("explanation") or "").strip()
    quiz_state["current"] = request.index + 1

    if is_correct:
        quiz_state["score"] += 1

    finished = quiz_state["current"] >= int(quiz_state["total"])
    next_question = None

    if not finished:
        next_question = quiz_state.get("next_question")
        if not next_question:
            next_question = generate_quiz_question(
                excluded_questions=set(quiz_state["asked_questions"]),
                source_pool=list(quiz_state["source_pool"]),
            )
            next_key = _question_key(next_question)
            if next_key:
                quiz_state["asked_questions"].add(next_key)

        quiz_state["current_question"] = next_question
        quiz_state["next_question"] = None

        if request.index + 1 == len(quiz_cache):
            quiz_cache.append(next_question)
        else:
            quiz_cache[request.index + 1] = next_question

        quiz_state["questions"] = quiz_cache

        threading.Thread(
            target=_prepare_next_question_async,
            args=(int(quiz_state["session_token"]),),
            daemon=True,
        ).start()

    return {
        "correct": is_correct,
        "correct_answer": correct_answer,
        "finished": finished,
        "score": int(quiz_state["score"]),
        "total": int(quiz_state["total"]),
        "next_question": next_question,
        "explanation": explanation
        or (
            "Good job. You picked the correct option."
            if is_correct
            else f"The correct option was {correct_answer}."
        ),
    }
