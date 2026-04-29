import requests
import random
import html

# Relevant UPSC / Static GK Categories from OpenTriviaDB
VALID_CATEGORIES = [
    {"id": 9, "name": "General Knowledge"},
    {"id": 17, "name": "Science & Nature"},
    {"id": 22, "name": "Geography"},
    {"id": 23, "name": "History"},
    {"id": 24, "name": "Politics"},
]

def fetch_quiz_questions(amount: int = 5):
    """
    Fetch questions from OpenTriviaDB API restricted to relevant UPSC/Static GK categories.
    """
    try:
        # Pick a random relevant category
        category = random.choice(VALID_CATEGORIES)
        
        url = f"https://opentdb.com/api.php?amount={amount}&category={category['id']}&type=multiple"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        res = response.json()

        questions = []

        for item in res.get("results", []):
            incorrect = item.get("incorrect_answers", [])
            correct = item.get("correct_answer", "")
            
            # Combine and shuffle options
            options = [html.unescape(opt) for opt in incorrect + [correct]]
            random.shuffle(options)

            questions.append({
                "question": html.unescape(item.get("question", "")),
                "options": options,
                "correct_answer": html.unescape(correct),
                "category": html.unescape(item.get("category", category["name"])),
                "difficulty": item.get("difficulty", "medium").capitalize()
            })

        return questions
    except Exception as exc:
        print(f"Error fetching trivia: {exc}")
        return []

def check_answer(correct_answer, user_answer):
    """
    Case-insensitive answer comparison.
    """
    if not correct_answer or not user_answer:
        return False
    return str(correct_answer).strip().lower() == str(user_answer).strip().lower()
