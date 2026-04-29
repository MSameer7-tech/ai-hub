import json
import random
import re
from functools import lru_cache
from html import unescape

import requests
from dotenv import load_dotenv

from app.services.llm_service import generate_response
from app.services.news_service import fetch_all_news, normalize_article

load_dotenv()


def fetch_trivia() -> list[dict]:
    try:
        response = requests.get(
            "https://opentdb.com/api.php",
            params={
                "amount": 5,
                "category": 9,
                "type": "multiple",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("results", [])
    except Exception as exc:
        print("Trivia error:", exc)
        return []


def get_quiz_source() -> list[dict[str, str | list[str]]]:
    news = fetch_all_news()
    trivia = fetch_trivia()

    normalized_news = [
        {
            "type": "news",
            "title": item["title"],
            "description": item["description"],
        }
        for item in (normalize_article(article) for article in news)
        if item["title"] and item["description"]
    ]

    normalized_trivia = [
        {
            "type": "trivia",
            "question": unescape(str(item.get("question") or "")),
            "correct_answer": unescape(str(item.get("correct_answer") or "")),
            "incorrect_answers": [
                unescape(str(answer)) for answer in item.get("incorrect_answers", [])
            ],
        }
        for item in trivia
        if item.get("question") and item.get("correct_answer")
    ]

    return normalized_news + normalized_trivia


def compact_source_item(source: dict[str, str | list[str]]) -> dict[str, str]:
    if source.get("type") == "trivia":
        question = str(source.get("question") or "").strip()
        correct_answer = str(source.get("correct_answer") or "").strip()
        incorrect_answers = source.get("incorrect_answers") or []
        options = ", ".join(str(answer) for answer in incorrect_answers[:3])
        combined = (
            f"Question: {question}\n"
            f"Correct answer: {correct_answer}\n"
            f"Incorrect answers: {options}"
        )
        return {
            "type": "trivia",
            "content": combined[:500],
        }

    title = str(source.get("title") or "").strip()
    description = str(source.get("description") or "").strip()
    combined = f"{title}\n{description}".strip()
    return {
        "type": "news",
        "content": combined[:500],
    }


def fallback_quiz_question() -> dict[str, str | list[str]]:
    return {
        "question": "Who is the Prime Minister of India?",
        "options": [
            "Narendra Modi",
            "Rahul Gandhi",
            "Amit Shah",
            "Arvind Kejriwal",
        ],
        "answer": "A",
        "explanation": "Narendra Modi is the current Prime Minister of India.",
    }


def generate_quiz() -> list[dict[str, str | list[str]]]:
    source_pool = get_quiz_source()

    if not source_pool:
        return [
            {
                "question": "Failed to generate quiz",
                "options": ["Retry", "Retry", "Retry", "Retry"],
                "answer": "A",
                "explanation": "No quiz sources were available.",
            }
        ]

    sample_size = min(5, len(source_pool))
    selected_sources = random.sample(source_pool, sample_size)
    compact_sources = [compact_source_item(source) for source in selected_sources]

    user_prompt = f"""
Create 5 factual UPSC/SSC-style MCQs from these source items.
Return ONLY valid JSON. No markdown or extra text.
Each item must have 4 options, one answer, and a short explanation.

[
  {{
    "question": "string",
    "options": {{
      "A": "string",
      "B": "string",
      "C": "string",
      "D": "string"
    }},
    "answer": "A",
    "explanation": "string"
  }}
]

SOURCE_ITEMS:
{json.dumps(compact_sources)}
"""

    try:
        raw = generate_response(
            system_prompt=(
                "You generate exam practice questions. Return only strict JSON. "
                "Do not include markdown, comments, or extra prose."
            ),
            user_prompt=user_prompt,
            fallback="[]",
            timeout=40,
            max_tokens=700,
            use_cache=True,
        )
        print("RAW QUIZ:", raw)
        print("RAW LLM RESPONSE:\n", raw)

        cleaned = raw.strip().replace("```json", "").replace("```", "")
        list_match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        object_match = re.search(r"\{.*\}", cleaned, re.DOTALL)

        if list_match:
            quiz = json.loads(list_match.group(0))
        elif object_match:
            quiz = [json.loads(object_match.group(0))]
        else:
            raise ValueError("No JSON found in LLM response")
    except Exception as exc:
        print("PARSE ERROR:", exc)
        return [
            {
                "question": "Failed to generate quiz",
                "options": ["Retry", "Retry", "Retry", "Retry"],
                "answer": "A",
                "explanation": "LLM formatting error.",
            }
        ]

    if not isinstance(quiz, list):
        return [
            {
                "question": "Failed to generate quiz",
                "options": ["Retry", "Retry", "Retry", "Retry"],
                "answer": "A",
                "explanation": "Invalid quiz payload.",
            }
        ]

    normalized_quiz = []
    for item in quiz:
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "")).strip()
        options = item.get("options", {})
        answer = str(item.get("answer", "")).strip().upper()
        explanation = str(item.get("explanation", "")).strip()

        if isinstance(options, dict):
            normalized_options = [
                str(options.get(letter) or "").strip()
                for letter in ["A", "B", "C", "D"]
            ]
        elif isinstance(options, list):
            normalized_options = [str(option).strip() for option in options]
        else:
            normalized_options = []

        if (
            not question
            or len(normalized_options) != 4
            or answer not in {"A", "B", "C", "D"}
            or any(not option for option in normalized_options)
        ):
            continue

        normalized_quiz.append(
            {
                "question": question,
                "options": normalized_options,
                "answer": answer,
                "explanation": explanation or "Review the question and the source material, then try again.",
            }
        )

    if not normalized_quiz:
        return [
            {
                "question": "Failed to generate quiz",
                "options": ["Retry", "Retry", "Retry", "Retry"],
                "answer": "A",
                "explanation": "No valid quiz questions were produced.",
            }
        ]

    return normalized_quiz[:5]


def build_quiz_session(total: int = 5) -> list[dict[str, str | list[str]]]:
    target_total = max(1, min(total, 15))
    collected_questions: list[dict[str, str | list[str]]] = []
    seen_questions: set[str] = set()
    attempts = 0
    max_attempts = max(3, target_total * 3)

    while len(collected_questions) < target_total and attempts < max_attempts:
        attempts += 1

        for question in generate_quiz():
            question_text = str(question.get("question") or "").strip()
            question_key = question_text.lower()[:80]

            if not question_text or question_key in seen_questions:
                continue

            seen_questions.add(question_key)
            collected_questions.append(question)

            if len(collected_questions) >= target_total:
                break

    return collected_questions[:target_total]


def generate_quiz_question(
    excluded_questions: set[str] | None = None,
    source_pool: list[dict[str, str | list[str]]] | None = None,
) -> dict[str, str | list[str]]:
    excluded_questions = excluded_questions or set()
    source_pool = source_pool or get_quiz_source()

    if not source_pool:
        return fallback_quiz_question()

    source = random.choice(source_pool)
    context = compact_source_item(source).get("content", "")

    user_prompt = f"""
Create ONE short MCQ from this text:
{context[:200]}

Return ONLY valid JSON:
{{
  "question": "...",
  "options": {{"A":"...","B":"...","C":"...","D":"..."}},
  "correct": "A",
  "explanation": "..."
}}
"""

    try:
        raw = generate_response(
            system_prompt="Return ONLY valid JSON.",
            user_prompt=user_prompt,
            fallback="{}",
            timeout=15,
            max_tokens=120,
            use_cache=False,
        )
        print("RAW QUIZ QUESTION:\n", raw)

        start = raw.find("{")
        end = raw.rfind("}") + 1
        clean_json = raw[start:end]
        data = json.loads(clean_json)

        question = str(data.get("question") or "").strip()
        options = data.get("options") or {}
        correct = str(data.get("correct") or data.get("answer") or "").strip().upper()
        explanation = str(data.get("explanation") or "").strip()

        if not isinstance(options, dict):
            raise ValueError("Options payload is not an object")

        normalized_options = [
            str(options.get(letter) or "").strip() for letter in ["A", "B", "C", "D"]
        ]

        if (
            not question
            or correct not in {"A", "B", "C", "D"}
            or any(not option for option in normalized_options)
            or normalized_options == ["A", "B", "C", "D"]
        ):
            raise ValueError("Invalid quiz question payload")

        question_key = question.lower()[:80]
        if question_key in excluded_questions:
            raise ValueError("Duplicate quiz question generated")

        return {
            "question": question,
            "options": normalized_options,
            "answer": correct,
            "explanation": explanation or "Review the context and the correct option.",
        }
    except Exception as exc:
        print("PARSE ERROR:", exc)
        return fallback_quiz_question()


@lru_cache()
def generate_quiz_cached() -> list[dict[str, str | list[str]]]:
    return generate_quiz()
