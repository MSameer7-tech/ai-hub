#!/bin/zsh

cd /Users/sameer/Documents/ai-chatbot/backend || exit 1
./venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
