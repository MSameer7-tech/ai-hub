# Deployment Guide

## Recommended Setup

- Frontend: Vercel
- Backend: Render

This project already uses a separate React frontend and FastAPI backend, so this split is the cleanest path.

## Backend on Render

Render configuration is included in [render.yaml](/Users/sameer/Documents/ai-chatbot/render.yaml).

### Steps

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Render, create a new Blueprint from the repo.
3. Confirm the backend service from `render.yaml`.
4. Set the secret environment variables in Render:
   - `GROQ_API_KEY`
   - `NEWS_API_KEY`
   - `GNEWS_API_KEY`
   - `NEWSDATA_API_KEY`
   - `CORS_ORIGINS`
5. Set `CORS_ORIGINS` to include your Vercel domain, for example:
   - `https://your-frontend-domain.vercel.app`
6. Deploy.

### Start Command

Render will use:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Frontend on Vercel

### Steps

1. Import the repo into Vercel.
2. Set the project root to `frontend`.
3. Add the environment variable:

```bash
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```

4. Deploy.

The frontend reads `VITE_API_BASE_URL` from [frontend/src/services/api.js](/Users/sameer/Documents/ai-chatbot/frontend/src/services/api.js).

## Local/Production Env Templates

- Backend template: [backend/.env.example](/Users/sameer/Documents/ai-chatbot/backend/.env.example)
- Frontend template: [frontend/.env.example](/Users/sameer/Documents/ai-chatbot/frontend/.env.example)

## Notes

- The backend no longer depends on a local Ollama process for deployment.
- CORS is now driven by `CORS_ORIGINS` in the backend environment.
- If you change the frontend production domain, update `CORS_ORIGINS` and redeploy the backend.
