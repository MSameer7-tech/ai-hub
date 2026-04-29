from fastapi import APIRouter
from pydantic import BaseModel

from app.models.schemas import ChatRequest
from app.services.chat_service import get_chat_response
from app.services.llm_service import generate_chat_title

print("CHAT ROUTE LOADED")

router = APIRouter()


class ChatTitleRequest(BaseModel):
    message: str


@router.post("/chat")
def chat(request: ChatRequest) -> dict[str, str | bool | None]:
    try:
        return get_chat_response(request)
    except Exception as exc:
        print(f"Chat route error: {exc}")
        return {
            "response": "API rate limits exhausted. You can still use Current Affairs and Quiz sections.",
            "mode": "chat",
        }


@router.post("/chat/title")
def chat_title(request: ChatTitleRequest) -> dict[str, str]:
    return {"title": generate_chat_title(request.message)}
