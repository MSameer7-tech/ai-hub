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
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#0A0A0B] text-white">
      <div className="absolute right-6 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
        <span className={`text-xs font-medium transition-colors ${chatMode !== "upsc" ? "text-white" : "text-gray-500"}`}>Normal</span>
        <button
          type="button"
          onClick={() => updateChatConfig({ ...chatConfig, chatMode: chatMode === "upsc" ? "chat" : "upsc" })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${chatMode === "upsc" ? "bg-blue-600" : "bg-gray-600"}`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${chatMode === "upsc" ? "translate-x-5" : "translate-x-1"}`} />
        </button>
        <span className={`text-xs font-medium transition-colors ${chatMode === "upsc" ? "text-blue-400" : "text-gray-500"}`}>UPSC</span>
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
            className="mb-4 text-center text-4xl font-semibold text-white/90"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            How can I help today?
          </motion.h1>

          <p className="mb-8 text-center text-white/40">
            Ask anything or explore current affairs
          </p>

          <motion.div
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
          >
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                disabled={loading}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={loading ? "Waiting for response..." : "Ask anything..."}
                rows={1}
                className="max-h-[180px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-white outline-none placeholder:text-white/30 disabled:opacity-50"
              />

              <motion.button
                type="button"
                onClick={handleSend}
                disabled={loading}
                whileTap={{ scale: 0.95 }}
                className="rounded-lg bg-white px-4 py-2 text-black transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <SendIcon className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>

          {loading && (
            <div className="mt-4 text-sm text-white/50 animate-pulse">
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    } transition-all duration-200 ease-in-out`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 ease-in-out ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white self-end rounded-br-md"
                          : "bg-white/5 backdrop-blur-lg border border-white/10 text-white/80 self-start rounded-bl-md"
                      }`}
                      style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}
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
              className="sticky bottom-0 border-t border-white/10 bg-white/5 p-4 backdrop-blur-xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-lg">
                <textarea
                  ref={textareaRef}
                  value={input}
                  disabled={loading || quotaExceeded}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={quotaExceeded ? "⚠️ Daily limit reached" : loading ? "Waiting for response..." : "Ask anything..."}
                  rows={1}
                  className="max-h-[180px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-white outline-none placeholder:text-white/30 disabled:opacity-50"
                />
                <motion.button
                  type="button"
                  onClick={handleSend}
                  disabled={loading || quotaExceeded}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-lg bg-white px-4 py-2 text-black transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <SendIcon className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}

export default Chat;
