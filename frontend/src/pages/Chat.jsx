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

  const handleSend = async () => {
    if (!input.trim() || loading) {
      return;
    }

    setLoading(true);

    const userMsg = { role: "user", text: input };
    const isFirstMessage = messages.length === 0;
    const thinkingMsg = { role: "assistant", text: "Thinking...", isThinking: true };
    updateMessages((prev) => [...prev, userMsg, thinkingMsg]);
    const currentInput = input;
    setInput("");

    if (isFirstMessage && currentChatId) {
      generateChatTitle(currentInput)
        .then((data) => {
          const title = data?.title?.trim();
          if (title) {
            renameChat?.(currentChatId, title);
          }
        })
        .catch(() => {
          const fallbackTitle =
            currentInput.slice(0, 30) + (currentInput.length > 30 ? "..." : "");
          renameChat?.(currentChatId, fallbackTitle || "New Chat");
        });
    }

    try {
      const data = await sendChatMessage(currentInput, {
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
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#0b0f1a] to-[#05070d] text-white">
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] bg-blue-600/10 blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 h-[600px] w-[600px] bg-purple-600/10 blur-[180px]" />
      </div>

      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-0 h-96 w-96 bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 h-96 w-96 bg-indigo-500/10 blur-[120px]" />
      </div>

      {isEmpty ? (
        <div className="flex h-full flex-1 flex-col items-center justify-center px-6 text-white relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/3 top-1/4 h-96 w-96 bg-violet-500/20 blur-[140px]" />
            <div className="absolute bottom-1/4 right-1/3 h-96 w-96 bg-indigo-500/20 blur-[140px]" />
          </div>

          <motion.h1
            className="mb-2 text-center text-5xl font-black text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            How can I help <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">today?</span>
          </motion.h1>

          <p className="mb-10 text-center text-sm font-medium uppercase tracking-[0.2em] text-white/30">
            Ask anything or explore current affairs
          </p>

          <motion.div
            className="group relative w-full max-w-2xl rounded-[32px] border border-gray-700 bg-white/[0.03] p-2 backdrop-blur-2xl transition-all focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/30"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${chatMode !== "upsc" ? "text-blue-400" : "text-gray-500"}`}>Normal</span>
                    <button
                        type="button"
                        onClick={() => updateChatConfig({ ...chatConfig, chatMode: chatMode === "upsc" ? "chat" : "upsc" })}
                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${chatMode === "upsc" ? "bg-blue-600" : "bg-gray-600"}`}
                    >
                        <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${chatMode === "upsc" ? "translate-x-4.5" : "translate-x-1"}`} />
                    </button>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${chatMode === "upsc" ? "text-blue-400" : "text-gray-500"}`}>UPSC Mode</span>
                </div>
            </div>

            <div className="flex items-end gap-3 px-4 pb-4 pt-2">
              <textarea
                ref={textareaRef}
                value={input}
                disabled={loading}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={loading ? "Analyzing..." : chatMode === "upsc" ? "Ask UPSC-focused questions..." : "Ask anything about current affairs or news..."}
                rows={1}
                className="max-h-[180px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-lg text-white outline-none placeholder:text-white/20 disabled:opacity-50"
              />

              <motion.button
                type="button"
                onClick={handleSend}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                <SendIcon className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {(chatMode === "upsc" 
                ? ["UPSC-style analysis", "Prelims facts", "Mains perspective", "Key points for exams"] 
                : ["Summarize latest news", "Top 5 news today", "Explain in simple terms", "Why is this important?"]
            ).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="rounded-full border border-white/5 bg-white/5 px-4 py-2 text-xs font-medium text-white/50 transition-all hover:scale-105 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {loading && (
            <div className="mt-8 flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-blue-500/50">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              Thinking...
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
            <span className="text-sm text-gray-400">
              {currentChatTitle || "New Chat"}
            </span>
            <span className="text-xs text-gray-500">
              AI Assistant
            </span>
          </div>

          <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              <div className="flex flex-col space-y-4">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    } mb-6 transition-all duration-200 ease-in-out`}
                  >
                    <div
                      className={`max-w-[75%] px-5 py-4 rounded-3xl shadow-sm transition-all duration-200 ease-in-out ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white self-end"
                          : "bg-[#111827]/80 backdrop-blur-lg border border-white/5 text-white/90 self-start"
                      }`}
                      style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                    >
                      {msg.isThinking ? (
                        <span className="animate-pulse text-white/40">Thinking...</span>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <div className="text-sm text-white/50 animate-pulse">
                    Thinking...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <motion.div
              className="sticky bottom-0 border-t border-white/10 bg-white/5 p-6 backdrop-blur-3xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="mx-auto max-w-4xl rounded-[32px] border border-gray-700 bg-white/[0.03] p-2 transition-all focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/30">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${chatMode !== "upsc" ? "text-blue-400" : "text-gray-500"}`}>Standard</span>
                        <button
                            type="button"
                            onClick={() => updateChatConfig({ ...chatConfig, chatMode: chatMode === "upsc" ? "chat" : "upsc" })}
                            className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-colors ${chatMode === "upsc" ? "bg-blue-600" : "bg-gray-600"}`}
                        >
                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${chatMode === "upsc" ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${chatMode === "upsc" ? "text-blue-400" : "text-gray-500"}`}>UPSC Mode</span>
                    </div>
                </div>

                <div className="flex items-end gap-3 px-3 pb-3 pt-1">
                    <textarea
                    ref={textareaRef}
                    value={input}
                    disabled={loading || quotaExceeded}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={quotaExceeded ? "⚠️ Daily limit reached" : loading ? "Analyzing..." : chatMode === "upsc" ? "Ask UPSC-focused questions..." : "Ask anything about current affairs or news..."}
                    rows={1}
                    className="max-h-[180px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-white outline-none placeholder:text-white/20 disabled:opacity-50"
                    />
                    <motion.button
                    type="button"
                    onClick={handleSend}
                    disabled={loading || quotaExceeded}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:opacity-50"
                    >
                    <SendIcon className="h-4.5 w-4.5" />
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
