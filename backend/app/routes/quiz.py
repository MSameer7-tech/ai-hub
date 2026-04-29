from fastapi import APIRouter
from app.models.schemas import QuizStartRequest
from app.services.quiz_service import fetch_quiz_questions

router = APIRouter()

@router.get("/quiz/start")
def start_quiz(amount: int = 5):
    """
    Returns a list of quiz questions from OpenTriviaDB.
    """
    questions = fetch_quiz_questions(amount)
    return {
        "questions": questions
    }

@router.post("/quiz/start")
def start_quiz_post(request: QuizStartRequest):
    """
    Supports both GET and POST for flexibility.
    """
    total = max(1, min(request.total, 15))
    questions = fetch_quiz_questions(total)
    return {
        "questions": questions
    }
