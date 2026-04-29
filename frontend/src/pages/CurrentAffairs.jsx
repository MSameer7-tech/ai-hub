import { useEffect, useState, useRef } from "react";
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

function CurrentAffairs({ theme, setTheme }) {
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
  const [refreshKey, setRefreshKey] = useState(0);
  const analysisRef = useRef(null);

  const fetchArticles = async (isManualRefresh = false) => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const url = `http://127.0.0.1:8000/current-affairs?ts=${timestamp}${isManualRefresh ? "&refresh=true" : ""}`;
      
      console.log(`[API] Fetching articles: ${url}`);
      
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
      });
      
      const data = await res.json();

      if (Array.isArray(data)) {
        setArticles(data);
        setLastUpdated(new Date()); // Store as Date object
      } else {
        console.error("Invalid data format received:", data);
      }
    } catch (err) {
      console.error("Error fetching articles:", err);
    } finally {
      setLoading(false);
    }
  };

  // Manual Refresh
  const handleRefresh = async () => {
    if (loading || cooldown > 0) return;
    await fetchArticles(true);
    setCooldown(120); // Sync cooldown with auto-refresh if desired, or keep as is
  };

  // Initial Load Only
  useEffect(() => {
    fetchArticles();
  }, []);




  const fetchFullContent = async (url) => {
    if (!url) return;
    setIsFetchingFull(true);
    setFullArticle(null);
    try {
      const res = await fetch(`http://127.0.0.1:8000/news/full?url=${encodeURIComponent(url)}`, {
          cache: "no-store"
      });
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
    // If fullArticle is open and matches the topic, use it for full context
    const contextTopic = (selectedArticle && fullArticle && !fullArticle.error) ? { ...topic, ...fullArticle } : topic;
    const questionText = question.trim() || `Analyze and explain the significance of this development for UPSC: ${topic.title}`;
    
    setHistory((prev) => [...prev, { q: questionText, a: "Thinking..." }]);
    setQuestion(""); // Clear input after asking
    setIsAsking(true); // Shared loading state for bottom UI

    // Smooth scroll to analysis section
    setTimeout(() => {
        analysisRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
    }, 100);
    
    try {
      const response = await askArticle(questionText, contextTopic);
      const answer = response.data?.answer || "No answer received.";
      
      setHistory((prev) => {
        const newHistory = [...prev];
        const lastIndex = newHistory.length - 1;
        if (lastIndex >= 0) {
            newHistory[lastIndex].a = answer;
        }
        return newHistory;
      });
    } catch (err) {
      setHistory((prev) => {
        const newHistory = [...prev];
        const lastIndex = newHistory.length - 1;
        if (lastIndex >= 0) {
            newHistory[lastIndex].a = "Unable to fetch an answer right now. Please try again.";
        }
        return newHistory;
      });
    }
  };


  return (
    <div className="flex-1 overflow-y-auto p-6 text-gray-800 dark:text-white">
      <div>
        <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
              Current <span className="text-blue-500">Affairs</span>
            </h1>
            <p className="mt-2 text-gray-500 dark:text-neutral-400">
              Browse summaries and ask questions grounded in the current dataset.
            </p>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-neutral-500">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Sync Pending"}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={cooldown > 0 || loading}
                        className={`group flex items-center gap-2 rounded-full border-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                            cooldown > 0 || loading
                            ? "border-gray-100 bg-gray-50 text-gray-300 dark:border-white/5 dark:bg-white/5"
                            : "border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-500/50 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
                        }`}
                    >
                        {loading && (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        )}
                        <span>{loading ? "Refreshing" : cooldown > 0 ? `Retry in ${cooldown}s` : "Refresh"}</span>
                    </button>
                </div>
            </div>
          </div>
        </div>


        <section className="mb-12">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[380px] animate-pulse rounded-3xl border border-gray-100 bg-white p-8 dark:border-white/5 dark:bg-white/5"
                >
                  <div className="mb-6 h-6 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                  <div className="mb-4 h-8 w-4/5 rounded-xl bg-gray-200 dark:bg-white/10" />
                  <div className="mb-3 h-4 w-full rounded bg-gray-200 dark:bg-white/10" />
                  <div className="mb-3 h-4 w-full rounded bg-gray-200 dark:bg-white/10" />
                  <div className="mt-auto h-12 w-full rounded-2xl bg-gray-200 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((topic, index) => (
                <article
                  key={`${topic?.title || "topic"}-${index}`}
                  className="h-full"
                >
                  <motion.div
                    whileHover={{ translateY: -12 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    onClick={() => setSelectedArticle(topic)}
                    className="group flex h-full cursor-pointer flex-col rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm transition-all duration-500 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 dark:border-white/5 dark:bg-white/[0.03] dark:backdrop-blur-xl dark:hover:border-blue-500/40"
                  >
                  <div className="mb-6 flex items-center justify-between">
                    <span className="rounded-full bg-blue-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/40 transition-transform group-hover:scale-105">
                        {topic?.tag || getCategoryTag(topic)}
                    </span>
                  </div>
                  
                  <h3 
                    title={topic?.title}
                    className="mb-4 text-xl font-extrabold leading-tight text-gray-900 line-clamp-2 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400"
                  >
                    {topic?.title || "No title"}
                  </h3>
                  
                  <p className="mb-8 text-sm leading-relaxed text-gray-500 line-clamp-3 dark:text-neutral-400">
                    {topic?.description || "No description"}
                  </p>
                  
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAskAboutTopic(topic);
                    }}
                    className="mt-auto w-full rounded-2xl border-2 border-blue-500/40 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-blue-600 transition-all duration-300 hover:scale-[1.02] hover:bg-blue-600 hover:text-white hover:shadow-xl hover:shadow-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
                  >
                    Analyze for UPSC
                  </button>
                  </motion.div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section 
          ref={analysisRef}
          className="relative mt-12 rounded-[40px] border border-gray-100 bg-gray-50/30 p-8 dark:border-white/5 dark:bg-white/5 dark:backdrop-blur-3xl"
        >
          <div className="absolute inset-x-0 -top-10 flex justify-center">
            <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-white/10" />
          </div>

          <h2 className="mb-6 text-xl font-black tracking-tight text-gray-900 dark:text-white">
            Study Deep: <span className="text-blue-500">Ask a Question</span>
          </h2>

          <div className="relative mb-8 flex flex-col gap-4 md:flex-row md:items-stretch">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about the topics above..."
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-6 py-4 text-base text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-[#111827]/50 dark:text-white dark:placeholder:text-white/20"
            />
            <button
              type="button"
              onClick={handleAskQuestion}
              disabled={!question.trim() || isAsking}
              className={`rounded-2xl px-10 py-4 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                !question.trim() || isAsking
                  ? "bg-gray-100 text-gray-300 dark:bg-white/5 dark:text-neutral-700"
                  : "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:scale-105 hover:bg-blue-700 active:scale-95"
              }`}
            >
              {isAsking ? "Wait..." : "Ask AI"}
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {history.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-gray-200 bg-gray-50/50 p-10 text-center dark:border-white/5 dark:bg-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-neutral-600">Your conversation history will appear here</p>
              </div>
            ) : (
              history.map((item, i) => (
                <div
                  key={i}
                  className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-md dark:border-white/5 dark:bg-[#111827]/80 dark:backdrop-blur-xl"
                >
                  <div className="mb-5 flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${item.a === "Thinking..." ? "bg-blue-500 animate-ping" : "bg-green-500 animate-pulse"}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                        {item.a === "Thinking..." ? "Analyzing Data..." : "Analysis Session"}
                    </span>
                  </div>
                  <p className="mb-4 text-base font-medium leading-relaxed text-blue-600 dark:text-blue-400">
                    <span className="mr-3 text-sm font-black uppercase">Q:</span> 
                    {item.q}
                  </p>
                  <div className="text-[15px] leading-relaxed text-green-700 dark:text-green-400">
                    <span className="mr-3 text-sm font-black uppercase">A:</span> 
                    <div className="inline space-y-2 whitespace-pre-wrap leading-relaxed font-medium">
                        {item.a}
                    </div>
                  </div>
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

                    {fullArticle.key_points?.length > 0 && (
                      <div>
                        <h3 className="text-base font-black uppercase tracking-tighter text-blue-500 mb-4">Key Points</h3>
                        <ul className="space-y-4">
                          {fullArticle.key_points.map((p, i) => (
                            <li key={i} className="flex items-start gap-4 text-gray-300">
                              <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                              <span className="leading-relaxed text-[16px]">{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {fullArticle.why_it_matters && (
                      <div className="rounded-3xl bg-blue-600/10 p-6 border border-blue-500/20 shadow-inner">
                        <h3 className="text-base font-black uppercase tracking-tighter text-blue-400 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Why It Matters
                        </h3>
                        <p className="text-gray-200 leading-relaxed text-[16px] font-medium">{fullArticle.why_it_matters}</p>
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
