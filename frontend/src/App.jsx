import { useEffect, useState } from "react";

import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";
import CurrentAffairs from "./pages/CurrentAffairs";
import Quiz from "./pages/Quiz";

const createChatId = () => `chat_${Date.now()}`;
const defaultChatMeta = {
  chatMode: "chat",
  quizQuestion: "",
  quizAnswer: "",
};

const createChatRecord = (id) => ({
  id,
  title: "New Chat",
  messages: [],
  pinned: false,
  createdAt: Date.now(),
});

const normalizeChats = (rawChats) => {
  if (!rawChats || typeof rawChats !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawChats).map(([id, value]) => {
      if (Array.isArray(value)) {
        return [id, { ...createChatRecord(id), messages: value }];
      }

      return [
        id,
        {
          ...createChatRecord(id),
          ...(value || {}),
          id,
          messages: Array.isArray(value?.messages) ? value.messages : [],
        },
      ];
    }),
  );
};

export default function App() {
  const [page, setPage] = useState("chat");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem("chats");

    if (!saved) {
      return {};
    }

    try {
      return normalizeChats(JSON.parse(saved));
    } catch {
      return {};
    }
  });
  const [chatMeta, setChatMeta] = useState(() => {
    const saved = localStorage.getItem("chatMeta");

    if (!saved) {
      return {};
    }

    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  });
  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem("currentChatId") || null;
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (localStorage.getItem("chat")) {
      localStorage.removeItem("chat");
    }
  }, []);

  useEffect(() => {
    if (currentChatId && chats[currentChatId]) {
      return;
    }

    const initialChatId = Object.keys(chats)[0] || createChatId();

    if (!chats[initialChatId]) {
      setChats((prev) => ({
        ...prev,
        [initialChatId]: createChatRecord(initialChatId),
      }));
    }

    if (!chatMeta[initialChatId]) {
      setChatMeta((prev) => ({
        ...prev,
        [initialChatId]: defaultChatMeta,
      }));
    }

    setCurrentChatId(initialChatId);
  }, [chats, chatMeta, currentChatId]);

  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem("chatMeta", JSON.stringify(chatMeta));
  }, [chatMeta]);

  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem("currentChatId", currentChatId);
    }
  }, [currentChatId]);

  const handleNewChat = () => {
    const newId = createChatId();

    setChats((prev) => ({
      ...prev,
      [newId]: createChatRecord(newId),
    }));
    setChatMeta((prev) => ({
      ...prev,
      [newId]: defaultChatMeta,
    }));
    setCurrentChatId(newId);
    setPage("chat");
  };

  const handleSwitchChat = (chatId) => {
    setCurrentChatId(chatId);
    setPage("chat");
  };

  const handleDeleteChat = (chatId) => {
    const confirmDelete = window.confirm("Delete this chat?");

    if (!confirmDelete) {
      return;
    }

    const nextChats = { ...chats };
    const nextMeta = { ...chatMeta };
    delete nextChats[chatId];
    delete nextMeta[chatId];

    const remainingIds = Object.keys(nextChats);
    const fallbackId = remainingIds[0] || createChatId();

    if (!nextChats[fallbackId]) {
      nextChats[fallbackId] = createChatRecord(fallbackId);
      nextMeta[fallbackId] = defaultChatMeta;
    }

    setChats(nextChats);
    setChatMeta(nextMeta);
    setCurrentChatId(fallbackId);
    setPage("chat");
  };

  const updateCurrentMessages = (updater) => {
    if (!currentChatId) {
      return;
    }

    setChats((prev) => ({
      ...prev,
      [currentChatId]: {
        ...(prev[currentChatId] || createChatRecord(currentChatId)),
        messages:
          typeof updater === "function"
            ? updater(prev[currentChatId]?.messages || [])
            : updater,
      },
    }));
  };

  const updateCurrentChatMeta = (updater) => {
    if (!currentChatId) {
      return;
    }

    setChatMeta((prev) => ({
      ...prev,
      [currentChatId]:
        typeof updater === "function"
          ? updater(
              prev[currentChatId] || defaultChatMeta,
            )
          : updater,
    }));
  };

  const renameChat = (chatId, newTitle) => {
    setChats((prev) => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        title: newTitle || "New Chat",
      },
    }));
  };

  const togglePin = (chatId) => {
    setChats((prev) => ({
      ...prev,
      [chatId]: {
        ...prev[chatId],
        pinned: !prev[chatId]?.pinned,
      },
    }));
  };

  const currentMessages = currentChatId ? chats[currentChatId]?.messages || [] : [];
  const currentChatConfig = currentChatId
    ? chatMeta[currentChatId] || {
        chatMode: "chat",
        quizQuestion: "",
        quizAnswer: "",
      }
    : {
        chatMode: "chat",
        quizQuestion: "",
        quizAnswer: "",
      };
  const filteredChats = Object.values(chats).filter((chat) =>
    chat.title.toLowerCase().includes(search.toLowerCase()),
  );
  const sortedChats = [...filteredChats].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return Number(b.pinned) - Number(a.pinned);
    }
    return b.createdAt - a.createdAt;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white text-gray-900 transition-colors duration-300 dark:bg-black dark:text-white">
        
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-xl md:hidden dark:border-white/5 dark:bg-black/80">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-black tracking-tighter text-gray-900 dark:text-white">
            AI <span className="text-blue-500">Hub</span>
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="flex min-h-0 flex-1 bg-gray-50 dark:bg-black">
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <Sidebar
            activePage={page}
            setPage={(p) => {
              setPage(p);
              setIsSidebarOpen(false);
            }}
            chats={chats}
            sortedChats={sortedChats}
            currentChatId={currentChatId}
            onNewChat={() => {
              handleNewChat();
              setIsSidebarOpen(false);
            }}
            onSwitchChat={(id) => {
              handleSwitchChat(id);
              setIsSidebarOpen(false);
            }}
            onDeleteChat={handleDeleteChat}
            onRenameChat={renameChat}
            onTogglePin={togglePin}
            search={search}
            onSearchChange={setSearch}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Global Floating Theme Toggle */}
            <div className="fixed bottom-24 right-6 z-[9999] md:bottom-8 md:right-8 transition-all">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-2xl backdrop-blur-xl transition-all hover:scale-110 active:scale-95 md:h-14 md:w-14 dark:bg-[#111827]/80 dark:border dark:border-white/10"
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <span className="text-xl md:text-2xl">{theme === "dark" ? "☀️" : "🌙"}</span>
              </button>
            </div>

            {page === "chat" && (
              <Chat
                messages={currentMessages}
                updateMessages={updateCurrentMessages}
                chatConfig={currentChatConfig}
                updateChatConfig={updateCurrentChatMeta}
                currentChatTitle={chats[currentChatId]?.title || "New Chat"}
                currentChatId={currentChatId}
                renameChat={renameChat}
              />
            )}
            {page === "current" && <CurrentAffairs theme={theme} setTheme={setTheme} />}
            {page === "quiz" && <Quiz theme={theme} setTheme={setTheme} />}
          </div>
        </div>

        <footer className="border-t border-gray-200 pb-32 pt-6 md:py-6 dark:border-white/5">
          <div className="flex justify-center px-6">
            <p className="text-center text-[10px] md:text-xs font-medium uppercase tracking-[0.3em] text-gray-400 opacity-60 transition-opacity hover:opacity-100 dark:text-white/40">
              Crafted by <span className="font-bold text-gray-600 dark:text-white/80">Mohammad Sameer</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
