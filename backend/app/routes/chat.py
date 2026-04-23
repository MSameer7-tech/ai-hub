from fastapi import APIRouter
from pydantic import BaseModel

from app.models.schemas import ChatRequest
from app.services.chat_service import get_chat_response
from app.services.llm_service import generate_chat_title

router = APIRouter()


class ChatTitleRequest(BaseModel):
    message: str


@router.post("/chat")
def chat(request: ChatRequest) -> dict[str, str | bool | None]:
    return get_chat_response(request)


@router.post("/chat/title")
def chat_title(request: ChatTitleRequest) -> dict[str, str]:
    return {"title": generate_chat_title(request.message)}
