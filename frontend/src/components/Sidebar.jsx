import { useState } from "react";

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

  return (
    <aside className="h-full w-72 shrink-0 border-r border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-wide text-gray-900 dark:text-white">AI Hub</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
          Conversations, news, and quiz flow.
        </p>
      </div>

      <nav className="mb-6 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 ease-in-out ${
                isActive
                  ? "border border-blue-500/40 bg-blue-500/20 text-blue-700 shadow-lg shadow-blue-100 dark:text-white dark:shadow-blue-950/50"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
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
          className="rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
        >
          + New
        </button>
      </div>

      <input
        type="text"
        placeholder="Search chats..."
        value={search}
        onChange={(event) => onSearchChange?.(event.target.value)}
        className="mb-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition-all duration-200 ease-in-out placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-neutral-500"
      />

      <div className="flex max-h-[calc(100vh-210px)] flex-col gap-2 overflow-y-auto pr-1">
        {sortedChats.map((chat) => {
          const isSelected = currentChatId === chat.id;

          return (
            <div
              key={chat.id}
              className={`group flex items-center justify-between gap-2 rounded-2xl px-3 py-2 transition-all duration-200 ease-in-out ${
                isSelected
                  ? "border border-blue-500/40 bg-blue-500/10 shadow-inner shadow-blue-100 dark:shadow-slate-950/30"
                  : "hover:bg-gray-100 dark:hover:bg-white/10"
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

              <div className="flex shrink-0 gap-1 opacity-0 transition-all duration-200 ease-in-out group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onTogglePin?.(chat.id)}
                  className={`rounded-lg px-2 py-1 text-xs transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 ${
                    chat.pinned
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-neutral-300"
                  }`}
                >
                  📌
                </button>
                <button
                  type="button"
                  onClick={() => startRename(chat.id)}
                  className="rounded-lg bg-gray-200 px-2 py-1 text-xs text-gray-700 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 dark:bg-white/10 dark:text-neutral-200"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteChat?.(chat.id)}
                  className="rounded-lg bg-red-950 px-2 py-1 text-xs text-red-200 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                >
                  ❌
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;
