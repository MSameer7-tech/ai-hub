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

  return (
    <div className={theme === "dark" ? "dark" : ""}>
    <div className="flex h-screen w-screen flex-col bg-white text-gray-900 transition-colors duration-300 dark:bg-black dark:text-white">
      <div className="flex min-h-0 flex-1 bg-gray-50 dark:bg-black">

        <Sidebar
          activePage={page}
          setPage={setPage}
          chats={chats}
          sortedChats={sortedChats}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onSwitchChat={handleSwitchChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={renameChat}
          onTogglePin={togglePin}
          search={search}
          onSearchChange={setSearch}
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="absolute right-6 top-6 z-50">
            {page !== "current" && (
              <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-all hover:scale-110 active:scale-95 dark:bg-white/5 dark:backdrop-blur-md"
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                  <span className="text-xl">{theme === "dark" ? "☀️" : "🌙"}</span>
              </button>
            )}
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
          {page === "quiz" && <Quiz />}
        </div>
      </div>

      <footer
        className="border-t border-gray-200 text-gray-500 dark:border-neutral-800 dark:text-neutral-400"
      >
        <div className="px-6 py-4 text-sm">
          Built with FastAPI + Ollama + React
        </div>
      </footer>
      </div>
    </div>
  );
}
