import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SendIcon } from "lucide-react";

import { generateChatTitle, sendChatMessage } from "../services/api";

function Chat({
  messages,
  updateMessages,
  chatConfig,
  updateChatConfig,
  currentChatTitle,
  currentChatId,
  renameChat,
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const chatMode = chatConfig?.chatMode ?? "chat";
  const quizQuestion = chatConfig?.quizQuestion ?? "";
  const quizAnswer = chatConfig?.quizAnswer ?? "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  const handleSend = async (forcedInput = null) => {
    const textToSend = typeof forcedInput === "string" ? forcedInput : input;

    if (!textToSend.trim() || loading) {
      return;
    }

    setLoading(true);

    const userMsg = { role: "user", text: textToSend };
    const isFirstMessage = messages.length === 0;
    const thinkingMsg = { role: "assistant", text: "Thinking...", isThinking: true };
    updateMessages((prev) => [...prev, userMsg, thinkingMsg]);
    
    // Clear input regardless
    setInput("");

    if (isFirstMessage && currentChatId) {
      generateChatTitle(textToSend)
        .then((data) => {
          const title = data?.title?.trim();
          if (title) {
            renameChat?.(currentChatId, title);
          }
        })
        .catch(() => {
          const fallbackTitle =
            textToSend.slice(0, 30) + (textToSend.length > 30 ? "..." : "");
          renameChat?.(currentChatId, fallbackTitle || "New Chat");
        });
    }

    try {
      const data = await sendChatMessage(textToSend, {
        mode: chatMode,
        quiz_question: quizQuestion || undefined,
        correct_answer: quizAnswer || undefined,
      });


      if (data.error === "quota_exceeded") {
        setQuotaExceeded(true);
        updateMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.message || "⚠️ Daily API limit reached. Try again later.",
          },
        ]);
        setLoading(false);
        return;
      }

      const responseMode = data?.mode ?? "chat";

      updateMessages((prev) => {
        const withoutThinking = prev.filter((m) => !m.isThinking);
        return [
          ...withoutThinking,
          {
            role: "assistant",
            text: data?.response ?? "No response received.",
          },
        ];
      });

      if (responseMode === "quiz") {
        updateChatConfig({
          chatMode: "quiz",
          quizQuestion: data.question ?? "",
          quizAnswer: data.correct_answer ?? "",
        });
      } else if (responseMode === "upsc") {
        updateChatConfig({
          chatMode: "upsc",
          quizQuestion: "",
          quizAnswer: "",
        });
      } else {
        updateChatConfig({
          chatMode: "chat",
          quizQuestion: "",
          quizAnswer: "",
        });
      }
    } catch (err) {
      console.error(err);
      updateMessages((prev) => {
        const withoutThinking = prev.filter((m) => !m.isThinking);
        return [
          ...withoutThinking,
          {
            role: "assistant",
            text: "⚠️ I'm having trouble responding right now. Please try again.",
          },
        ];
      });
    }

    setLoading(false);
  };

  const handleKeyDown = async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white text-gray-900 transition-colors duration-300 dark:bg-gradient-to-b dark:from-[#0b0f1a] dark:to-[#05070d] dark:text-white">
      <div className="absolute inset-0 -z-10 opacity-30 dark:opacity-40">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] bg-blue-100/50 blur-[200px] dark:bg-blue-600/10" />
        <div className="absolute bottom-0 right-1/4 h-[600px] w-[600px] bg-purple-100/50 blur-[200px] dark:bg-purple-600/10" />
      </div>

      {isEmpty ? (
        <div className="flex h-full flex-1 flex-col items-center justify-center px-4 md:px-6 text-white relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/3 top-1/4 h-96 w-96 bg-violet-500/20 blur-[140px]" />
            <div className="absolute bottom-1/4 right-1/3 h-96 w-96 bg-indigo-500/20 blur-[140px]" />
          </div>

          <motion.h1
            className="mb-2 text-center text-3xl font-black text-gray-900 md:text-5xl dark:text-white"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            How can I help <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-500">today?</span>
          </motion.h1>

          <p className="mb-8 text-center text-[10px] md:text-sm font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-white/20">
            Ask anything or explore current affairs
          </p>

          <motion.div
            className="group relative w-full max-w-2xl rounded-[24px] md:rounded-[32px] border border-gray-200 bg-white p-2 shadow-2xl transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:backdrop-blur-2xl"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            
            <div className="flex items-center justify-between px-3 md:px-4 py-1 md:py-1.5">
                <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-white/5">
                    <button
                        type="button"
                        onClick={() => updateChatConfig({ ...chatConfig, chatMode: "chat" })}
                        className={`rounded-full px-3 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${chatMode !== "upsc" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                    >
                        Normal
                    </button>
                    <button
                        type="button"
                        onClick={() => updateChatConfig({ ...chatConfig, chatMode: "upsc" })}
                        className={`rounded-full px-3 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${chatMode === "upsc" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                    >
                        UPSC Mode
                    </button>
                </div>
            </div>

            <div className="flex items-end gap-2 md:gap-3 px-3 md:px-4 pb-3 md:pb-4 pt-1">
              <textarea
                ref={textareaRef}
                value={input}
                disabled={loading}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={loading ? "Analyzing..." : chatMode === "upsc" ? "Ask UPSC questions..." : "Ask news..."}
                rows={1}
                className="max-h-[180px] min-h-[40px] flex-1 resize-none bg-transparent px-1 md:px-2 py-2 text-base md:text-lg text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-white/20 disabled:opacity-50"
              />

              <motion.button
                type="button"
                onClick={handleSend}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                <SendIcon className="h-4 md:h-5 w-4 md:w-5" />
              </motion.button>
            </div>
          </motion.div>

          <div className="mt-8 flex w-full max-w-2xl flex-col gap-3 px-4 pb-8 md:flex-row md:flex-wrap md:justify-center md:overflow-visible md:px-0">
                {(messages.length > 0 
                    ? ["Explain this news", "Why is this important?", "UPSC analysis", "Key points from this"]
                    : chatMode === "upsc" 
                        ? ["Current affairs for UPSC today", "Important topics for UPSC prep", "Daily current affairs notes", "Prelims-focused current affairs"] 
                        : ["Summarize latest current affairs", "Top 5 news today", "Major global events today", "Latest tech and economy updates"]
                ).map((suggestion) => (
                <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSend(suggestion)}
                    className="w-full md:w-auto rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-left text-[11px] md:text-xs font-bold text-gray-600 transition-all hover:bg-gray-100 hover:text-blue-600 dark:border-white/5 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/10 dark:hover:bg-white/10 dark:hover:text-white md:rounded-full md:border md:bg-white md:px-5 md:py-2.5 md:text-center md:shadow-sm"
                >
                    {suggestion}
                </motion.button>
                ))}
          </div>


          {loading && (
            <div className="mt-4 md:mt-8 flex items-center gap-3 text-[10px] md:text-sm font-bold uppercase tracking-widest text-blue-500/50">
              <span className="flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-blue-500 animate-ping" />
              Thinking...
            </div>
          )}

        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 dark:border-white/10">
            <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-400 truncate max-w-[200px]">
              {currentChatTitle || "New Chat"}
            </span>
            <span className="text-[10px] md:text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
              AI Assistant
            </span>
          </div>

          <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 md:py-8 min-h-0 no-scrollbar">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 md:gap-3 pb-36 md:pb-0">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex w-full ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[85%] md:max-w-[75%] px-4 md:px-5 py-2.5 md:py-3 shadow-sm transition-all duration-300 ${
                        msg.role === "user"
                          ? "rounded-[20px] md:rounded-[24px] rounded-br-lg bg-blue-600 text-white dark:bg-gradient-to-br dark:from-blue-500 dark:to-blue-700 shadow-blue-500/20"
                          : "rounded-[20px] md:rounded-[24px] rounded-bl-lg bg-gray-100 text-gray-800 dark:bg-white/[0.05] dark:backdrop-blur-xl dark:border dark:border-white/5 dark:text-gray-100"
                      }`}
                      style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                    >
                      {msg.isThinking ? (
                        <div className="flex items-center gap-2 py-1">
                            <span className="h-1 w-1 md:h-1.5 md:w-1.5 animate-bounce rounded-full bg-blue-400" />
                            <span className="h-1 w-1 md:h-1.5 md:w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:0.2s]" />
                            <span className="h-1 w-1 md:h-1.5 md:w-1.5 animate-bounce rounded-full bg-blue-400 [animation-delay:0.4s]" />
                        </div>
                      ) : (
                        <span className="text-sm md:text-[15px]">{msg.text}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <div className="text-[10px] md:text-sm text-white/50 animate-pulse">
                    Thinking...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 md:relative md:z-auto border-t border-gray-200 bg-white/80 p-3 md:p-6 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-black/60 md:dark:bg-white/5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="mx-auto max-w-4xl rounded-[20px] md:rounded-[32px] border border-gray-200 bg-white p-1.5 md:p-2 shadow-2xl transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-gray-700 dark:bg-white/[0.03] dark:backdrop-blur-2xl">
                <div className="flex items-center justify-between px-3 md:px-4 py-1 md:py-1.5">
                    <div className="flex items-center gap-1 rounded-full bg-gray-100 p-0.5 md:p-1 dark:bg-white/5">
                        <button
                            type="button"
                            onClick={() => updateChatConfig({ ...chatConfig, chatMode: "chat" })}
                            className={`rounded-full px-3 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${chatMode !== "upsc" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                        >
                            Normal
                        </button>
                        <button
                            type="button"
                            onClick={() => updateChatConfig({ ...chatConfig, chatMode: "upsc" })}
                            className={`rounded-full px-3 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${chatMode === "upsc" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                        >
                            UPSC Mode
                        </button>
                    </div>
                </div>

                <div className="flex items-end gap-2 md:gap-3 px-2 md:px-3 pb-2 md:pb-3 pt-0.5 md:pt-1">
                    <textarea
                    ref={textareaRef}
                    value={input}
                    disabled={loading || quotaExceeded}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={quotaExceeded ? "Daily limit reached" : loading ? "Wait..." : chatMode === "upsc" ? "Ask UPSC..." : "Ask..."}
                    rows={1}
                    className="max-h-[120px] md:max-h-[180px] min-h-[40px] md:min-h-[44px] flex-1 resize-none bg-transparent px-1 md:px-2 py-2 text-sm md:text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-white/20 disabled:opacity-50"
                    />
                    <motion.button
                    type="button"
                    onClick={handleSend}
                    disabled={loading || quotaExceeded}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-lg md:rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
                    >
                    <SendIcon className="h-4 w-4 md:h-4.5 md:w-4.5" />
                    </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}

export default Chat;
