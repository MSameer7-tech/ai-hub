import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { askCurrentAffairs, askArticle } from "../services/api";

const REFRESH_INTERVAL = 70;

function getCategoryTag(topic) {
  const text = `${topic.title} ${topic.summary}`.toLowerCase();

  if (
    text.includes("budget")
    || text.includes("government")
    || text.includes("policy")
    || text.includes("election")
  ) {
    return "Politics";
  }

  if (
    text.includes("ai")
    || text.includes("tech")
    || text.includes("digital")
    || text.includes("software")
  ) {
    return "Tech";
  }

  if (
    text.includes("economy")
    || text.includes("market")
    || text.includes("trade")
    || text.includes("investment")
  ) {
    return "Economy";
  }

  return "General";
}

function CurrentAffairs() {
  const [articles, setArticles] = useState([]);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [fullArticle, setFullArticle] = useState(null);
  const [isFetchingFull, setIsFetchingFull] = useState(false);

  const fetchArticles = async (refresh = false) => {
    setLoading(true);

    try {
      console.log("Fetching articles...");
      const url = refresh
        ? "http://127.0.0.1:8000/current-affairs?refresh=true"
        : "http://127.0.0.1:8000/current-affairs";
      const res = await fetch(url);
      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("Invalid response:", data);
        setArticles([]);
        return;
      }

      setArticles(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching articles:", err);
      setArticles([
        {
          title: "Error",
          summary: "Unable to load current affairs",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFullContent = async (url) => {
    if (!url) return;
    setIsFetchingFull(true);
    setFullArticle(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/news/full?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setFullArticle(data);
    } catch (err) {
      console.error("Failed to fetch full article:", err);
      setFullArticle({ error: "Failed to load content" });
    } finally {
      setIsFetchingFull(false);
    }
  };

  useEffect(() => {
    if (selectedArticle?.url) {
      fetchFullContent(selectedArticle.url);
    }
  }, [selectedArticle]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("currentAffairsHistory");

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (cooldown === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    localStorage.setItem("currentAffairsHistory", JSON.stringify(history));
  }, [history]);

  const handleAskQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isAsking) {
      return;
    }

    setIsAsking(true);

    try {
      const response = await askCurrentAffairs(trimmedQuestion);
      const answer = response.data?.response ?? "No answer received.";

      setHistory((prev) => [...prev, { q: trimmedQuestion, a: answer }]);
      setQuestion("");
    } catch {
      const answer = "Unable to fetch an answer right now.";
      setHistory((prev) => [...prev, { q: trimmedQuestion, a: answer }]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleAskQuestion();
    }
  };

  const handleAskAboutTopic = async (topic) => {
    const questionText = `Tell me more about ${topic.title}`;
    
    setHistory((prev) => [...prev, { q: questionText, a: "Thinking..." }]);
    
    try {
      const response = await askArticle(questionText, topic);
      const answer = response.data?.answer || "No answer received.";
      
      setHistory((prev) => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].a = answer;
        return newHistory;
      });
    } catch (err) {
      setHistory((prev) => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].a = "Unable to fetch an answer right now.";
        return newHistory;
      });
    }
  };

  const handleRefresh = async () => {
    if (cooldown > 0) {
      return;
    }

    await fetchArticles(true);
    setCooldown(REFRESH_INTERVAL);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 text-gray-800 dark:text-white">
      <div>
        <h1 style={{ margin: "0 0 12px", fontSize: "2rem" }}>
          Current Affairs
        </h1>
        <p className="mb-7 text-gray-500 dark:text-neutral-400">
          Browse summaries and ask questions grounded in the current dataset.
        </p>
        <p className="mb-5 text-sm text-gray-400 dark:text-neutral-500">
          Last updated: {lastUpdated || "Not yet refreshed"}
        </p>

        <section style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Topics</h2>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={cooldown > 0 || loading}
              className="bg-gray-700 text-white"
              style={{
                border: "1px solid #4b5563",
                borderRadius: "999px",
                padding: "10px 16px",
                cursor: cooldown > 0 || loading ? "not-allowed" : "pointer",
              }}
            >
              {loading
                ? "Refreshing..."
                : cooldown > 0
                  ? `Refresh in ${cooldown}s`
                  : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-3xl border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/70"
                >
                  <div className="mb-4 h-5 w-20 rounded-full bg-slate-700" />
                  <div className="mb-3 h-5 w-4/5 rounded bg-slate-700" />
                  <div className="mb-2 h-4 w-full rounded bg-slate-700" />
                  <div className="mb-2 h-4 w-full rounded bg-slate-700" />
                  <div className="h-4 w-2/3 rounded bg-slate-700" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((topic, index) => (
                <article
                  key={`${topic?.title || "topic"}-${index}`}
                  onClick={() => setSelectedArticle(topic)}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-lg transition hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] dark:bg-white/5"
                    style={{
                      minHeight: "240px",
                    }}
                  >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      background: "#1d4ed8",
                      color: "#dbeafe",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      marginBottom: "12px",
                    }}
                  >
                    {topic?.tag || getCategoryTag(topic)}
                  </div>
                  <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>
                    <span
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {topic?.title || "No title"}
                    </span>
                  </h3>
                  <p
                    className="text-gray-600 dark:text-gray-300 line-clamp-3"
                    style={{
                      margin: 0,
                      lineHeight: 1.6,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {topic?.description || "No description"}
                  </p>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAskAboutTopic(topic);
                    }}
                    className="transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                    style={{
                      marginTop: "16px",
                      border: "1px solid #2563eb",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      background: "transparent",
                      color: "#93c5fd",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Ask about this
                  </button>
                  </motion.div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
            className="border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
          style={{
            borderRadius: "28px",
            padding: "24px",
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: "1.25rem" }}>
            Ask a Question
          </h2>
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the topics above..."
              rows={3}
              style={{
                flex: 1,
                minWidth: "260px",
                resize: "vertical",
                borderRadius: "16px",
                border: "1px solid #374151",
                padding: "14px 16px",
                font: "inherit",
                background: "#111827",
                color: "#ffffff",
              }}
            />
            <button
              type="button"
              onClick={handleAskQuestion}
              disabled={!question.trim() || isAsking}
              className="transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
              style={{
                border: "none",
                borderRadius: "14px",
                padding: "14px 20px",
                background: !question.trim() || isAsking ? "#a8bfdc" : "#0f766e",
                color: "#ffffff",
                fontWeight: 600,
                cursor:
                  !question.trim() || isAsking ? "not-allowed" : "pointer",
              }}
            >
              {isAsking ? "Asking..." : "Ask"}
            </button>
          </div>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {history.length === 0 ? (
              <div
                className="bg-gray-800 border border-gray-700"
                style={{
                  minHeight: "72px",
                  padding: "18px",
                  borderRadius: "18px",
                  lineHeight: 1.6,
                }}
              >
                Your conversation history will appear here.
              </div>
            ) : (
              history.map((item, i) => (
                <div
                  key={i}
                  className="border border-gray-200 bg-white transition-all duration-200 ease-in-out dark:border-neutral-700 dark:bg-neutral-800"
                  style={{
                    padding: "18px",
                    borderRadius: "18px",
                    lineHeight: 1.6,
                  }}
                >
                  <p style={{ margin: "0 0 8px" }}>
                    <b>Q:</b> {item.q}
                  </p>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    <b>A:</b> {item.a}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => {
              setSelectedArticle(null);
              setFullArticle(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{ maxWidth: "750px" }}
              className="max-h-[85vh] w-full overflow-y-auto rounded-3xl border border-white/10 bg-[#111827]/95 p-8 shadow-2xl backdrop-blur-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/10 pb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-400">
                      {selectedArticle.tag || "News"}
                    </span>
                    {fullArticle?.publish_date && (
                        <span className="text-xs text-gray-500">• {new Date(fullArticle.publish_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h2 className="mt-3 text-3xl font-extrabold leading-tight text-white">
                    {fullArticle?.title || selectedArticle.title}
                  </h2>
                  {fullArticle?.authors?.length > 0 && (
                      <p className="mt-2 text-sm text-gray-400 italic">By {fullArticle.authors.join(", ")}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArticle(null);
                    setFullArticle(null);
                  }}
                  className="rounded-full bg-gray-800/50 p-2 text-gray-400 transition hover:bg-gray-700 hover:text-white active:scale-90"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative">
                {isFetchingFull ? (
                  <div className="space-y-4 py-8">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-gray-800" />
                    <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
                    <div className="h-4 w-4/6 animate-pulse rounded bg-gray-800" />
                    <p className="text-center text-xs text-gray-500 uppercase tracking-widest font-bold">Hardening UPSC Summary...</p>
                  </div>
                ) : fullArticle?.overview ? (
                  <div className="space-y-8 max-w-[680px] mx-auto">
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tighter text-blue-500 mb-2.5">Overview</h3>
                      <p className="text-gray-300 leading-relaxed text-[17px]">{fullArticle.overview}</p>
                    </div>

                    {fullArticle.points?.length > 0 && (
                      <div>
                        <h3 className="text-base font-black uppercase tracking-tighter text-blue-500 mb-4">Key Points</h3>
                        <ul className="space-y-4">
                          {fullArticle.points.map((p, i) => (
                            <li key={i} className="flex items-start gap-4 text-gray-300">
                              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                              <span className="leading-relaxed text-[16px]">{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {fullArticle.why && (
                      <div className="rounded-3xl bg-blue-600/10 p-6 border border-blue-500/20 shadow-inner">
                        <h3 className="text-base font-black uppercase tracking-tighter text-blue-400 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Why It Matters
                        </h3>
                        <p className="text-gray-200 leading-relaxed text-[16px] font-medium">{fullArticle.why}</p>
                      </div>
                    )}
                  </div>
                ) : fullArticle?.error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                        <p className="text-red-400 font-semibold">UPSC Analysis Unavailable</p>
                        <p className="mt-2 text-sm text-gray-400 leading-relaxed">The source website is blocking our automated analysis pipeline. You can still read the original article using the link below.</p>
                        <p className="mt-4 p-3 bg-white/5 rounded-xl text-xs text-gray-500 italic">{selectedArticle.description}</p>
                    </div>
                ) : (
                  <p className="text-gray-300 leading-relaxed text-[17px]">{selectedArticle.description}</p>
                )}


              </div>
              
              <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
                <a 
                    href={selectedArticle.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 transition hover:text-blue-300"
                >
                    View Original Source ↗
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArticle(null);
                    setFullArticle(null);
                  }}
                  className="rounded-xl bg-gray-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default CurrentAffairs;
