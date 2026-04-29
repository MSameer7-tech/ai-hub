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

    # Detect if the question is analytical or factual
    is_analytical = any(kw in question.lower() for kw in ["analyze", "significance", "why", "impact", "explain", "importance"])

    prompt = f"""
You are a UPSC Current Affairs Expert. Answer the question strictly based on the article provided.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

Answer:
(2–3 lines direct, crisp answer)

Key Points:
- [Fact 1]
- [Fact 2]
- [Fact 3]

{ "Significance:\n- [Analytical Point 1]\n- [Analytical Point 2]" if is_analytical else "" }

STRICT RULES:
1. Do NOT use outside information.
2. Do NOT write long paragraphs.
3. Be exam-ready and concise.
4. If information is missing, say "Data not in article." once at the end.

ARTICLE:
Title: {article.get('title', 'No Title')}
{content}

QUESTION:
{question}
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
