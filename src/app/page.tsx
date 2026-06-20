"use client";

import { useMemo, useState } from "react";
import Sidebar, { SectionKey } from "@/components/Sidebar";
import TaskCard from "@/components/TaskCard";
import SuggestionCard from "@/components/SuggestionCard";
import TaskModal from "@/components/TaskModal";
import SettingsPanel from "@/components/SettingsPanel";
import Toast from "@/components/Toast";
import AiTestPanel from "@/components/AiTestPanel";
import {
  initialSettings,
  initialSuggestions,
  initialTasks,
} from "@/lib/mockData";
import { Settings, Suggestion, Task } from "@/lib/types";

const TODAY = "2026-06-20";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(
    initialSuggestions
  );
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [section, setSection] = useState<SectionKey>("today");
  const [modalTask, setModalTask] = useState<Task | null | undefined>(
    undefined
  ); // undefined = closed, null = create mode, Task = edit mode
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status === "pending"),
    [tasks]
  );
  const todayTasks = useMemo(
    () =>
      pendingTasks
        .filter((t) => t.dueDate === TODAY)
        .sort((a, b) => a.dueTime.localeCompare(b.dueTime)),
    [pendingTasks]
  );
  const upcomingTasks = useMemo(
    () =>
      pendingTasks
        .filter((t) => t.dueDate > TODAY)
        .sort((a, b) =>
          a.dueDate === b.dueDate
            ? a.dueTime.localeCompare(b.dueTime)
            : a.dueDate.localeCompare(b.dueDate)
        ),
    [pendingTasks]
  );
  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "completed")
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [tasks]
  );

  const counts: Record<SectionKey, number> = {
    today: todayTasks.length,
    upcoming: upcomingTasks.length,
    suggestions: suggestions.length,
    completed: completedTasks.length,
    settings: 0,
  };

  function handleToggleComplete(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
          : t
      )
    );
  }

  function handleDeleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function openEditTask(task: Task) {
    setPendingSuggestionId(null);
    setModalTask(task);
  }

  function handleSaveTask(task: Task) {
    if (pendingSuggestionId) {
      setTasks((prev) => [task, ...prev]);
      setSuggestions((prev) => prev.filter((s) => s.id !== pendingSuggestionId));
      showToast(`Added “${task.title}” to your tasks.`);
    } else {
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (exists) {
          return prev.map((t) => (t.id === task.id ? task : t));
        }
        return [task, ...prev];
      });
      showToast(`Task “${task.title}” saved.`);
    }
    setPendingSuggestionId(null);
    setModalTask(undefined);
  }

  function handleAddSuggestion(s: Suggestion) {
    setPendingSuggestionId(s.id);
    setModalTask({
      id: `t-${Date.now()}`,
      title: s.extractedTitle,
      source: s.source,
      dueDate: s.date,
      dueTime: s.time,
      reminderMinutes: settings.defaultReminderMinutes,
      status: "pending",
    });
  }

  function handleDismissSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  function handleTestNotification() {
    if (!settings.notificationsEnabled) {
      showToast("Notifications are turned off in Settings.");
      return;
    }
    showToast(
      `Reminder: a task is due in ${settings.defaultReminderMinutes} minutes.`
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-6">
      <div className="flex h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-white/40 bg-white/30 shadow-2xl backdrop-blur-2xl">
        <div className="flex w-full flex-col">
          <div className="flex items-center gap-2 border-b border-black/5 bg-white/30 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs font-medium text-gray-500">
              TaskBar
            </span>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              active={section}
              onSelect={setSection}
              counts={counts}
              onAddTask={() => {
                setPendingSuggestionId(null);
                setModalTask(null);
              }}
            />

            <main className="flex-1 overflow-y-auto px-8 py-6">
              {section === "today" && (
                <Section title="Today" subtitle="What's on your plate today">
                  {todayTasks.length === 0 ? (
                    <EmptyState message="Nothing due today. Enjoy the calm." />
                  ) : (
                    todayTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onToggleComplete={handleToggleComplete}
                        onEdit={openEditTask}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  )}
                </Section>
              )}

              {section === "upcoming" && (
                <Section title="Upcoming" subtitle="Tasks coming up next">
                  {upcomingTasks.length === 0 ? (
                    <EmptyState message="No upcoming tasks scheduled." />
                  ) : (
                    upcomingTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onToggleComplete={handleToggleComplete}
                        onEdit={openEditTask}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  )}
                </Section>
              )}

              {section === "suggestions" && (
                <Section
                  title="Suggestions"
                  subtitle="Tasks detected from Gmail, WhatsApp and Calendar"
                >
                  <AiTestPanel />
                  {suggestions.length === 0 ? (
                    <EmptyState message="No new suggestions right now." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {suggestions.map((s) => (
                        <SuggestionCard
                          key={s.id}
                          suggestion={s}
                          onAdd={handleAddSuggestion}
                          onEdit={handleAddSuggestion}
                          onDismiss={handleDismissSuggestion}
                        />
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {section === "completed" && (
                <Section title="Completed" subtitle="Tasks you've finished">
                  {completedTasks.length === 0 ? (
                    <EmptyState message="No completed tasks yet." />
                  ) : (
                    completedTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onToggleComplete={handleToggleComplete}
                        onEdit={openEditTask}
                        onDelete={handleDeleteTask}
                      />
                    ))
                  )}
                </Section>
              )}

              {section === "settings" && (
                <Section title="Settings" subtitle="Configure your preferences">
                  <SettingsPanel
                    settings={settings}
                    onChange={setSettings}
                    onTestNotification={handleTestNotification}
                  />
                </Section>
              )}
            </main>
          </div>
        </div>
      </div>

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          defaultReminderMinutes={settings.defaultReminderMinutes}
          onSave={handleSaveTask}
          onClose={() => {
            setModalTask(undefined);
            setPendingSuggestionId(null);
          }}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/40 py-16 text-center">
      <span className="mb-2 text-3xl">🌤️</span>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
