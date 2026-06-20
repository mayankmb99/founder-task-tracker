"use client";

export type SectionKey =
  | "today"
  | "upcoming"
  | "suggestions"
  | "completed"
  | "settings";

interface SidebarProps {
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
  counts: Record<SectionKey, number>;
  onAddTask: () => void;
}

const NAV_ITEMS: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: "today", label: "Today", icon: "☀️" },
  { key: "upcoming", label: "Upcoming", icon: "📆" },
  { key: "suggestions", label: "Suggestions", icon: "✨" },
  { key: "completed", label: "Completed", icon: "✅" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

export default function Sidebar({
  active,
  onSelect,
  counts,
  onAddTask,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-black/5 bg-white/40 px-3 py-5 backdrop-blur-xl">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white shadow-sm">
          T
        </div>
        <span className="text-sm font-semibold text-gray-700">TaskBar</span>
      </div>

      <button
        onClick={onAddTask}
        className="mb-5 flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600"
      >
        <span className="text-base leading-none">+</span> New Task
      </button>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:bg-white/60 hover:text-gray-800"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{item.icon}</span>
                {item.label}
              </span>
              {count > 0 && item.key !== "settings" && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-4 text-[11px] text-gray-400">
        Local data only · No integrations connected
      </div>
    </aside>
  );
}
