import requests
import random
import html

def fetch_quiz_questions(amount: int = 5):
    """
    Fetch questions from OpenTriviaDB API.
    Amount is dynamic based on user selection.
    """
    try:
        url = f"https://opentdb.com/api.php?amount={amount}&type=multiple"
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

            # Map the correct answer to A, B, C, D for consistency if needed, 
            # but the user requested comparing text. 
            # Let's provide both text and a shuffled list.
            
            questions.append({
                "question": html.unescape(item.get("question", "")),
                "options": options,
                "correct_answer": html.unescape(correct)
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
