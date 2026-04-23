from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    mode: str = "chat"
    quiz_question: str | None = None
    correct_answer: str | None = None


class CurrentAffairsQueryRequest(BaseModel):
    question: str


class QuizAnswerRequest(BaseModel):
    index: int
    answer: str


class QuizStartRequest(BaseModel):
    total: int = 5
