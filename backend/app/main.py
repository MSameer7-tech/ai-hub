import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.chat import router as chat_router
from app.routes.current_affairs import router as current_affairs_router
from app.routes.quiz import router as quiz_router


def _warmup():
    """Fire a silent ping to Gemini at startup to eliminate first-call latency."""
    try:
        from app.services.llm_service import call_gemini
        call_gemini(
            [{"role": "user", "content": "hi"}],
            max_tokens=5,
            timeout=10,
        )
        print("✅ Warm-up ping complete")
    except Exception as exc:
        print(f"⚠️ Warm-up ping failed (non-fatal): {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=_warmup, daemon=True).start()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(current_affairs_router)
app.include_router(quiz_router)
