import os
import random
import re
import threading
import time

import requests
from dotenv import load_dotenv

from app.services.llm_service import generate_response

load_dotenv()

API_KEY = os.getenv("NEWS_API_KEY", "YOUR_API_KEY")
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY")
NEWSDATA_API_KEY = os.getenv("NEWSDATA_API_KEY")
NEWS_API_URL = "https://newsapi.org/v2/everything"
CATEGORY_MAP = {
    "general": "india government OR economy OR geopolitics",
    "politics": "government OR elections OR geopolitics",
    "economy": "inflation OR GDP OR economy OR markets",
    "tech": "AI OR startups OR innovation OR technology",
}
CACHE_TTL = 120
NEWS_CACHE = {
    "data": {},
    "last_updated": {},
    "refreshing": set(),
}
NEWS_CACHE_LOCK = threading.Lock()


def clean_content(text: str) -> str:
    if not text:
        return ""

    cleaned = re.sub(r"\[\+\d+\schars\]", "", text)
    return cleaned.strip()


def summarize_with_llm(text: str) -> str:
    if not text:
        return "No summary available."

    snippet = text[:120].strip()
    fallback = f"{snippet}..." if len(text) > 120 else snippet
    summary = generate_response(
        system_prompt=(
            "Summarize news professionally in 2-3 concise lines. "
            "Do not use phrases like 'Here is a summary' or mention instructions."
        ),
        user_prompt=f"News text:\n{text[:900]}",
        fallback=fallback,
        timeout=10,
        max_tokens=90,
        use_cache=True,
    )
    summary = summary.removeprefix("Here is a 2-line summary:").strip()
    summary = summary.removeprefix("Here is a summary:").strip()
    summary = summary.removeprefix("2-line summary:").strip()
    summary = summary.removeprefix("Summary:").strip()
    return summary or fallback


VALID_TAGS = ["Politics", "Economy", "Technology", "International", "Defense", "Environment", "Science", "Sports", "Business"]

def classify_tag(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    if "election" in text or "government" in text or "minister" in text or "parliament" in text:
        return "Politics"
    if " ai " in f" {text} " or "tech" in text or "startup" in text or "software" in text:
        return "Technology"
    if "war" in text or "military" in text or "army" in text or "defence" in text or "defense" in text:
        return "Defense"
    if "market" in text or "rbi" in text or "gdp" in text or "inflation" in text or "economy" in text:
        return "Economy"
    if "environment" in text or "climate" in text or "pollution" in text:
        return "Environment"
    if "science" in text or "research" in text or "space" in text:
        return "Science"
    if "sport" in text or "cricket" in text or "football" in text:
        return "Sports"
    if "business" in text or "company" in text or "trade" in text:
        return "Business"
    return "International"


def fetch_newsapi(category: str = "general") -> list[dict]:
    if not API_KEY or API_KEY == "YOUR_API_KEY":
        return []

    query = CATEGORY_MAP.get(category, "world news")
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 5,
        "page": random.randint(1, 3),
        "apiKey": API_KEY,
    }

    try:
        print("Fetching fresh news...")
        response = requests.get(
            NEWS_API_URL,
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        print("NewsAPI error:", exc)
        return []

    return data.get("articles", [])


def fetch_gnews() -> list[dict]:
    candidate_keys = []

    if GNEWS_API_KEY:
        candidate_keys.append(GNEWS_API_KEY)
    if NEWSDATA_API_KEY and NEWSDATA_API_KEY not in candidate_keys:
        candidate_keys.append(NEWSDATA_API_KEY)

    if not candidate_keys:
        return []

    for api_key in candidate_keys:
        try:
            response = requests.get(
                "https://gnews.io/api/v4/top-headlines",
                params={
                    "country": "in",
                    "lang": "en",
                    "max": 5,
                    "apikey": api_key,
                },
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("articles", [])
        except Exception as exc:
            print("GNews error:", exc)

    return []


def fetch_newsdata() -> list[dict]:
    if not NEWSDATA_API_KEY:
        return []

    try:
        response = requests.get(
            "https://newsdata.io/api/1/news",
            params={
                "apikey": NEWSDATA_API_KEY,
                "country": "in",
                "language": "en",
                "category": "politics,technology,business",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
    except Exception as exc:
        print("NewsData error:", exc)
        return []


def normalize_article(article: dict) -> dict[str, str]:
    source = article.get("source", "")
    source_name = ""

    if isinstance(source, dict):
        source_name = str(source.get("name", ""))
    elif source:
        source_name = str(source)

    title = clean_content(str(article.get("title") or "").strip())
    description = clean_content(str(
        article.get("description") or article.get("content") or ""
    ).strip())
    content = clean_content(str(
        article.get("content")
        or article.get("description")
        or article.get("full_content")
        or ""
    ).strip())

    return {
        "title": title,
        "description": description,
        "content": content,
        "source": source_name,
        "tag": classify_tag(title, description),
        "url": str(article.get("url") or article.get("link") or ""),
    }


def deduplicate_articles(articles: list[dict[str, str]]) -> list[dict[str, str]]:
    seen = set()
    unique = []

    for article in articles:
        title = article["title"].lower()
        key = title[:80]

        if key not in seen:
            seen.add(key)
            unique.append(article)

    return unique


def fetch_all_news(category: str = "general") -> list[dict]:
    articles = []
    articles += fetch_newsapi(category)
    articles += fetch_gnews()
    articles += fetch_newsdata()
    return articles


def fetch_current_affairs(category: str = "general") -> list[dict[str, str]]:
    articles = fetch_all_news(category)

    if not articles:
        if not API_KEY or API_KEY == "YOUR_API_KEY":
            return [
                {
                    "title": "API Key Missing",
                    "summary": "Set NEWS_API_KEY in backend/.env",
                }
            ]
        return [
            {
                "title": "Error fetching news",
                "summary": "Unable to load news from the available providers.",
            }
        ]

    normalized = [normalize_article(article) for article in articles if article.get("title")]
    unique_articles = deduplicate_articles(normalized)
    clean_articles = [
        article
        for article in unique_articles
        if article["title"] and article["description"]
    ]

    print("TOTAL ARTICLES:", len(clean_articles))

    final_articles = []

    for article in clean_articles[:5]:
        summary = article["description"] or article["content"][:150] if article["content"] else ""
        final_articles.append(
            {
                "title": article["title"],
                "description": summary,
                "content": article["content"] or article["description"],
                "tag": article.get("tag", category),
                "url": article.get("url", ""),
            }
        )

    if not final_articles:
        return [
            {
                "title": "No relevant news found",
                "summary": "Try refreshing or changing category.",
            }
        ]

    return final_articles


def _store_news_cache(category: str, data: list[dict[str, str]]) -> None:
    with NEWS_CACHE_LOCK:
        NEWS_CACHE["data"][category] = data
        NEWS_CACHE["last_updated"][category] = time.time()
        NEWS_CACHE["refreshing"].discard(category)


def refresh_news_background(category: str = "general") -> None:
    try:
        data = fetch_current_affairs(category)
        _store_news_cache(category, data)
    finally:
        with NEWS_CACHE_LOCK:
            NEWS_CACHE["refreshing"].discard(category)


def cached_news(
    category: str = "general",
    force_refresh: bool = False,
    background_refresh: bool = False,
) -> list[dict[str, str]]:
    now = time.time()

    with NEWS_CACHE_LOCK:
        cached_data = NEWS_CACHE["data"].get(category, [])
        last_updated = NEWS_CACHE["last_updated"].get(category, 0.0)
        is_refreshing = category in NEWS_CACHE["refreshing"]

        cache_fresh = bool(cached_data) and now - last_updated < CACHE_TTL

        if force_refresh and cached_data:
            if background_refresh and not is_refreshing:
                NEWS_CACHE["refreshing"].add(category)
                threading.Thread(
                    target=refresh_news_background,
                    args=(category,),
                    daemon=True,
                ).start()
            return cached_data

        if cache_fresh:
            return cached_data

        if cached_data and background_refresh and not is_refreshing:
            NEWS_CACHE["refreshing"].add(category)
            threading.Thread(
                target=refresh_news_background,
                args=(category,),
                daemon=True,
            ).start()
            return cached_data

    fresh_data = fetch_current_affairs(category)
    _store_news_cache(category, fresh_data)
    return fresh_data


def get_news_context(category: str = "general") -> str:
    news = cached_news(category)

    if not news:
        return "No current news available."

    context = "Here are the latest current affairs:\n\n"

    for index, item in enumerate(news, 1):
        title = item.get("title", "Untitled")
        summary = (
            item.get("summary")          # legacy key (fallback articles)
            or item.get("description")   # primary key from fetch_current_affairs
            or item.get("content", "")[:200]
        ).strip()
        context += f"{index}. {title}\n"
        if summary:
            context += f"   {summary}\n"
        context += "\n"

    return context


def clear_news_cache() -> None:
    with NEWS_CACHE_LOCK:
        NEWS_CACHE["data"].clear()
        NEWS_CACHE["last_updated"].clear()
        NEWS_CACHE["refreshing"].clear()
