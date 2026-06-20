"use client";

export type SectionKey =
  | "today"
  | "upcoming"
  | "suggestions"
  | "completed"
  | "mycontext"
  | "events"
  | "settings";

interface SidebarProps {
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
  counts: Record<SectionKey, number>;
  onAddTask: () => void;
}

const TASK_NAV_ITEMS: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: "today", label: "Today", icon: "☀️" },
  { key: "upcoming", label: "Upcoming", icon: "📆" },
  { key: "suggestions", label: "Suggestions", icon: "✨" },
  { key: "completed", label: "Completed", icon: "✅" },
];

const COPILOT_NAV_ITEMS: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: "mycontext", label: "My Context", icon: "🧑‍💼" },
  { key: "events", label: "Events", icon: "🎤" },
];

const SETTINGS_NAV_ITEMS: Array<{ key: SectionKey; label: string; icon: string }> = [
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
        {TASK_NAV_ITEMS.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            isActive={active === item.key}
            count={counts[item.key]}
            onSelect={onSelect}
          />
        ))}
      </nav>

      <p className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Event Copilot
      </p>
      <nav className="flex flex-col gap-1">
        {COPILOT_NAV_ITEMS.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            isActive={active === item.key}
            count={counts[item.key]}
            onSelect={onSelect}
          />
        ))}
      </nav>

      <nav className="mt-4 flex flex-col gap-1">
        {SETTINGS_NAV_ITEMS.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            isActive={active === item.key}
            count={counts[item.key]}
            onSelect={onSelect}
          />
        ))}
      </nav>

      <div className="mt-auto px-2 pt-4 text-[11px] text-gray-400">
        Local data only · No integrations connected
      </div>
    </aside>
  );
}

function NavButton({
  item,
  isActive,
  count,
  onSelect,
}: {
  item: { key: SectionKey; label: string; icon: string };
  isActive: boolean;
  count: number;
  onSelect: (key: SectionKey) => void;
}) {
  const showCount = count > 0 && item.key !== "settings" && item.key !== "mycontext" && item.key !== "events";
  return (
    <button
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
      {showCount && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            isActive ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
