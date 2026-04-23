import requests
from fastapi import APIRouter, HTTPException

from app.models.schemas import CurrentAffairsQueryRequest
from app.services.llm_service import get_contextual_response
from app.services.news_service import cached_news, get_news_context
from app.services.quiz_service import generate_quiz_cached

router = APIRouter()


@router.get("/current-affairs")
def get_current_affairs(refresh: bool = False) -> list[dict[str, str]]:
    if refresh:
        generate_quiz_cached.cache_clear()
        return cached_news(force_refresh=True, background_refresh=True)

    return cached_news(background_refresh=True)


@router.post("/current-affairs/query")
def query_current_affairs(request: CurrentAffairsQueryRequest) -> dict[str, str]:
    try:
        current_affairs_data = cached_news()
    except (requests.RequestException, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    context_with_fallback = (
        f"{get_news_context()}\nIf the answer is not present in this data, "
        'respond with "Not available in current data".'
    )
    answer = get_contextual_response(context_with_fallback, request.question)
    return {"response": answer.strip()}
