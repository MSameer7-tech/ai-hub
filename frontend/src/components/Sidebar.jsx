import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { id: "chat", label: "Chat" },
  { id: "current", label: "Current Affairs" },
  { id: "quiz", label: "Quiz" },
];

function Sidebar({
  activePage,
  onNavigate,
  setPage,
  chats = {},
  sortedChats = [],
  currentChatId,
  onNewChat,
  onSwitchChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
  search = "",
  onSearchChange,
  isOpen = false,
  onClose,
}) {
  const handleNavigate = onNavigate ?? setPage;
  const [editingChatId, setEditingChatId] = useState(null);
  const [tempTitle, setTempTitle] = useState("");

  const startRename = (chatId) => {
    const chat = chats[chatId];
    setEditingChatId(chatId);
    setTempTitle(chat?.title || "");
  };

  const saveRename = () => {
    if (!editingChatId) {
      return;
    }

    onRenameChat?.(editingChatId, tempTitle.trim() || "New Chat");
    setEditingChatId(null);
    setTempTitle("");
  };

  const sidebarContent = (
    <div className="flex h-full w-full flex-col p-6">
      <div className="mb-10 flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                AI <span className="text-blue-500">Hub</span>
            </h1>
            <p className="mt-1 text-xs font-medium text-gray-400 dark:text-neutral-500 uppercase tracking-widest">
            Conversations, news, and quiz
            </p>
        </div>
        <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:text-gray-900 md:hidden dark:bg-white/5 dark:text-gray-400 dark:hover:text-white"
        >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      <nav className="mb-6 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all duration-300 ease-in-out ${
                isActive
                  ? "border border-blue-500/40 bg-blue-500/20 text-blue-700 shadow-lg dark:text-white dark:bg-blue-600/20"
                  : "bg-white text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-neutral-400">
          Conversations
        </h2>
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95"
        >
          + New
        </button>
      </div>

      <input
        type="text"
        placeholder="Search chats..."
        value={search}
        onChange={(event) => onSearchChange?.(event.target.value)}
        className="mb-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-all duration-300 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
      />

      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1">
        {sortedChats.map((chat) => {
          const isSelected = currentChatId === chat.id;

          return (
            <div
              key={chat.id}
              className={`group flex items-center justify-between gap-2 rounded-2xl px-3 py-2 transition-all duration-300 ease-in-out ${
                isSelected
                  ? "border border-blue-500/40 bg-white shadow-inner dark:bg-blue-500/10"
                  : "hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
            >
              {editingChatId === chat.id ? (
                <input
                  value={tempTitle}
                  onChange={(event) => setTempTitle(event.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      saveRename();
                    }
                  }}
                  autoFocus
                  className="min-w-0 flex-1 rounded-xl border border-blue-500 bg-white px-3 py-2 text-sm text-gray-900 outline-none dark:bg-white/5 dark:text-white"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSwitchChat?.(chat.id)}
                  title={chat.title}
                  className="min-w-0 flex-1 truncate text-left text-sm text-gray-800 dark:text-neutral-100"
                >
                  {chat.pinned ? "⭐ " : ""}
                  {chat.title}
                </button>
              )}

              <div className={`flex shrink-0 gap-1 transition-all duration-300 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                <button
                  type="button"
                  onClick={() => onTogglePin?.(chat.id)}
                  className={`rounded-lg px-2 py-1 text-xs transition-all duration-300 hover:scale-105 active:scale-95 ${
                    chat.pinned
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-gray-700 dark:bg-white/10 dark:text-neutral-300"
                  }`}
                >
                  📌
                </button>
                <button
                  type="button"
                  onClick={() => startRename(chat.id)}
                  className="rounded-lg bg-gray-300 px-2 py-1 text-xs text-gray-700 transition-all duration-300 hover:scale-105 active:scale-95 dark:bg-white/10 dark:text-neutral-200"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteChat?.(chat.id)}
                  className="rounded-lg bg-red-900 px-2 py-1 text-xs text-red-100 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  ❌
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden h-full w-72 shrink-0 border-r border-gray-200 bg-gray-100 transition-colors duration-300 md:block dark:border-white/10 dark:bg-[#0a0f1c] dark:backdrop-blur-xl">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-[150] h-full w-72 border-r border-gray-200 bg-white/95 shadow-2xl backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-black/95"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
