import requests
from fastapi import APIRouter, HTTPException

from app.models.schemas import CurrentAffairsQueryRequest, AskArticleRequest
from app.services.llm_service import get_contextual_response, generate_response
from app.services.news_service import cached_news, get_news_context, fetch_full_article, structure_article


from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/current-affairs")
def get_current_affairs(refresh: bool = False):
    if refresh:
        data = cached_news(force_refresh=True, background_refresh=False) # Force synchronous refresh for immediate UI update
    else:
        data = cached_news(background_refresh=True)

    return JSONResponse(
        content=data,
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )



@router.get("/news/full")
def get_full_article(url: str):
    article_data = fetch_full_article(url)
    
    if "error" in article_data:
        return article_data
        
    structured = structure_article(article_data["text"])
    
    return {
        "title": article_data["title"],
        "authors": article_data["authors"],
        "publish_date": article_data["publish_date"],
        "overview": structured["overview"],
        "key_points": structured["key_points"],
        "why_it_matters": structured["why_it_matters"],
        "text": article_data["text"],
        "url": url
    }






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


@router.post("/ask-article")
def ask_article(request: AskArticleRequest) -> dict:
    article = request.article
    question = request.question
    
    # Prioritize full text if available, fallback to overview or description
    content = article.get("text") or article.get("content") or article.get("description") or "No content available."
    
    # Trim content slightly more for faster processing and lower token usage
    content = content[:3000]

    prompt = f"""
You are a UPSC-focused current affairs analyst.
Analyze the given news article and respond in STRICT structured format.

FORMAT (MANDATORY)

Context (2–3 lines):
Briefly explain what the news is about.

Key Facts:
- Fact 1
- Fact 2
- Fact 3

Why it matters (UPSC relevance):
- Point 1
- Point 2
- Point 3

Exam Linkage:
Mention relevant UPSC subjects (Polity, Economy, IR, Environment, etc.)

Potential Question:
Frame 1 UPSC-style question (Prelims or Mains)

RULES:
- DO NOT write paragraphs
- USE bullet points for facts and relevance
- KEEP it concise
- NO generic filler
- If data missing → do NOT hallucinate, say "Not mentioned"

ARTICLE:
Title: {article.get('title', 'No Title')}
Content: {content}
"""



    try:
        response = generate_response(
            system_prompt="You are an expert tutor. Follow the user's instructions exactly.",
            user_prompt=prompt,
            fallback="Error fetching answer",
            timeout=15,
            max_tokens=350,
            use_cache=False,
        )
        if isinstance(response, dict) and response.get("error") == "quota_exceeded":
            return {"answer": response["message"], "error": "quota_exceeded"}
        return {"answer": response}
    except Exception as e:
        return {
            "answer": "Error fetching answer",
            "debug": str(e)
        }
