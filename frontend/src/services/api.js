import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: BASE_URL,
});

export async function sendMessage(message) {
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        mode: "chat",
      }),
    });

    if (!res.ok) {
      throw new Error("Server error");
    }

    const data = await res.json();
    return data.response;
  } catch (err) {
    throw new Error("SERVER_DOWN");
  }
}

export async function sendChatMessage(message, payload = {}) {
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        mode: "chat",
        ...payload,
      }),
    });

    if (!res.ok) {
      throw new Error("Server error");
    }

    return await res.json();
  } catch (err) {
    throw new Error("SERVER_DOWN");
  }
}

export async function generateChatTitle(message) {
  try {
    const res = await fetch(`${BASE_URL}/chat/title`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      throw new Error("Server error");
    }

    return await res.json();
  } catch (err) {
    throw new Error("TITLE_FAILED");
  }
}

export const getCurrentAffairs = () =>
  API.get("/current-affairs");

export const askCurrentAffairs = (question) =>
  API.post("/current-affairs/query", { question });

export const startQuiz = (total = 5) =>
  API.post("/quiz/start", { total });

export const submitAnswer = (data) =>
  API.post("/quiz/answer", data);

export const askArticle = (question, article) =>
  API.post("/ask-article", { question, article });
