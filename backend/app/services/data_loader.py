import json
from pathlib import Path
from typing import Any


DATA_FILE_PATH = Path(__file__).resolve().parents[2] / "data" / "current_affairs.json"


def load_current_affairs_data() -> list[dict[str, Any]]:
    with DATA_FILE_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError("Current affairs data must be a JSON array.")

    return data


def get_current_affairs_summaries() -> list[dict[str, str]]:
    items = load_current_affairs_data()
    return [
        {
            "title": str(item.get("title", "")),
            "summary": str(item.get("summary", "")),
        }
        for item in items
    ]
