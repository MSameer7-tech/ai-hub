import threading

from fastapi import APIRouter

from app.models.schemas import QuizAnswerRequest, QuizStartRequest
from app.services.quiz_service import (
    generate_quiz_cached,
    generate_quiz_question,
    get_quiz_source,
)

router = APIRouter()

quiz_lock = threading.Lock()
asked_questions = set()

quiz_state = {
    "score": 0,
    "current_question": None,
    "next_question": None,
    "total": 5,
    "current_index": 0
}


def _prepare_next_question_async():
    global quiz_state
    
    if quiz_state["current_index"] >= quiz_state["total"] - 1:
        return
        
    next_q = generate_quiz_question(excluded_questions=asked_questions)
    
    with quiz_lock:
        if next_q and next_q.get("question"):
            asked_questions.add(next_q["question"].lower()[:80])
        quiz_state["next_question"] = next_q


@router.get("/quiz/start")
def start_quiz():
    return {"questions": generate_quiz_cached()}


@router.post("/quiz/start")
def start_quiz_with_total(
    request: QuizStartRequest,
):
    global quiz_state, asked_questions

    source_pool = get_quiz_source()

    total = max(1, min(request.total, 15))
    asked_questions.clear()
    
    q1 = generate_quiz_question(excluded_questions=asked_questions, source_pool=source_pool)
    if q1 and q1.get("question"):
        asked_questions.add(q1["question"].lower()[:80])
        
    q2 = generate_quiz_question(excluded_questions=asked_questions, source_pool=source_pool)
    if q2 and q2.get("question"):
        asked_questions.add(q2["question"].lower()[:80])

    with quiz_lock:
        quiz_state["score"] = 0
        quiz_state["current_question"] = q1
        quiz_state["next_question"] = q2
        quiz_state["total"] = total
        quiz_state["current_index"] = 0

    return {
        "question": q1,
        "current": 1,
        "total": total,
    }


@router.post("/quiz/answer")
def submit_quiz_answer(
    request: QuizAnswerRequest,
):
    global quiz_state

    with quiz_lock:
        current_q = quiz_state.get("current_question")
        
        if not current_q:
            return {
                "correct": False,
                "correct_answer": "",
                "finished": True,
                "score": quiz_state.get("score", 0),
                "total": quiz_state.get("total", 0),
                "next_question": None,
                "explanation": "No current question found."
            }

        correct_answer = str(current_q.get("answer", ""))
        is_correct = request.answer.strip().upper() == correct_answer
        explanation = str(current_q.get("explanation", ""))
        
        if is_correct:
            quiz_state["score"] += 1

        quiz_state["current_index"] += 1
        finished = quiz_state["current_index"] >= quiz_state["total"]
        
        next_q_to_return = None
        if not finished:
            next_q_to_return = quiz_state["next_question"]
            quiz_state["current_question"] = quiz_state["next_question"]
            quiz_state["next_question"] = None
            
            threading.Thread(
                target=_prepare_next_question_async,
                daemon=True,
            ).start()

    return {
        "correct": is_correct,
        "correct_answer": correct_answer,
        "finished": finished,
        "score": quiz_state["score"],
        "total": quiz_state["total"],
        "next_question": next_q_to_return,
        "explanation": explanation or (
            "Good job." if is_correct else f"The correct option was {correct_answer}."
        ),
    }
