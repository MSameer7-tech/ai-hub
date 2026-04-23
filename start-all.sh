#!/bin/bash

echo "Starting Ollama..."
ollama serve &

sleep 2

echo "Starting Backend..."
cd /Users/sameer/Documents/ai-chatbot/backend || exit 1
source venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &

sleep 2

echo "Starting Frontend..."
cd /Users/sameer/Documents/ai-chatbot/frontend || exit 1
npm run dev
