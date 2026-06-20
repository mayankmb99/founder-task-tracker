"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar, { SectionKey } from "@/components/Sidebar";
import TaskCard from "@/components/TaskCard";
import SuggestionCard from "@/components/SuggestionCard";
import TaskModal from "@/components/TaskModal";
import SettingsPanel from "@/components/SettingsPanel";
import Toast from "@/components/Toast";
import AiTestPanel from "@/components/AiTestPanel";
import MyContextPage from "@/components/context/MyContextPage";
import EventsPage from "@/components/events/EventsPage";
import { initialSuggestions } from "@/lib/mockData";
import {
  AudienceSegment,
  CompanyProfile,
  EventRecord,
  EventStrategy,
  FounderProfile,
  Settings,
  Suggestion,
  Task,
} from "@/lib/types";

const TODAY = "2026-06-20";
const SAVE_DEBOUNCE_MS = 800;

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(
    initialSuggestions
  );
  const [settings, setSettings] = useState<Settings>({
    notificationsEnabled: true,
    defaultReminderMinutes: 15,
  });
  const [section, setSection] = useState<SectionKey>("today");
  const [modalTask, setModalTask] = useState<Task | null | undefined>(
    undefined
  ); // undefined = closed, null = create mode, Task = edit mode
  const [pendingSuggestionId, setPendingSuggestionId] = useState<string | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);
  const [founderProfile, setFounderProfile] = useState<FounderProfile | null>(
    null
  );
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );
  const [audienceSegments, setAudienceSegments] = useState<AudienceSegment[]>(
    []
  );
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [strategiesByEvent, setStrategiesByEvent] = useState<
    Record<string, EventStrategy>
  >({});

  const [contextSaveStatus, setContextSaveStatus] = useState<SaveStatus>("idle");
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<SaveStatus>("idle");

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  // ---------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bootstrap");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load data.");
        if (cancelled) return;

        setTasks(data.tasks ?? []);
        if (data.settings) setSettings(data.settings);
        setFounderProfile(data.founderProfile);
        setCompanyProfile(data.companyProfile);
        setAudienceSegments(data.audienceSegments ?? []);
        setEvents(data.events ?? []);
        setStrategiesByEvent(data.strategiesByEvent ?? {});
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load application data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------
  // Debounced save helpers for "edit as you type" forms
  // ---------------------------------------------------------------------
  const founderSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companySaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audienceSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleFounderChange(profile: FounderProfile) {
    setFounderProfile(profile);
    setContextSaveStatus("saving");
    if (founderSaveTimer.current) clearTimeout(founderSaveTimer.current);
    founderSaveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/founder-profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        });
        if (!res.ok) throw new Error();
        setContextSaveStatus("saved");
      } catch {
        setContextSaveStatus("error");
        showToast("Failed to save founder profile. Please try again.");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function handleCompanyChange(profile: CompanyProfile) {
    setCompanyProfile(profile);
    setContextSaveStatus("saving");
    if (companySaveTimer.current) clearTimeout(companySaveTimer.current);
    companySaveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/company-profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile }),
        });
        if (!res.ok) throw new Error();
        setContextSaveStatus("saved");
      } catch {
        setContextSaveStatus("error");
        showToast("Failed to save company profile. Please try again.");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function handleAudienceChange(segments: AudienceSegment[]) {
    setAudienceSegments(segments);
    setContextSaveStatus("saving");
    if (audienceSaveTimer.current) clearTimeout(audienceSaveTimer.current);
    audienceSaveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/audience-segments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error();
        // Replace client-temp ids with the real DB ids returned by the server.
        setAudienceSegments(data.segments ?? []);
        setContextSaveStatus("saved");
      } catch {
        setContextSaveStatus("error");
        showToast("Failed to save audience segments. Please try again.");
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function handleSettingsChange(next: Settings) {
    setSettings(next);
    setSettingsSaveStatus("saving");
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setSettingsSaveStatus("saved");
      })
      .catch(() => {
        setSettingsSaveStatus("error");
        showToast("Failed to save settings. Please try again.");
      });
  }

  // ---------------------------------------------------------------------
  // Derived task lists
  // ---------------------------------------------------------------------
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
    mycontext: 0,
    events: 0,
    settings: 0,
  };

  // ---------------------------------------------------------------------
  // Task CRUD — each is a direct, non-debounced call since these are
  // discrete user actions (click "save", click "complete"), not typing.
  // ---------------------------------------------------------------------
  async function handleToggleComplete(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const updated: Task = {
      ...task,
      status: task.status === "completed" ? "pending" : "completed",
    };
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: updated }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
      showToast("Failed to update task. Please try again.");
    }
  }

  async function handleDeleteTask(id: string) {
    const removed = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      if (removed) setTasks((prev) => [removed, ...prev]);
      showToast("Failed to delete task. Please try again.");
    }
  }

  const handleAddTasksBulk = useCallback(
    async (newTasks: Task[], dedupeKey?: string) => {
      if (!dedupeKey) {
        // Manual single-task add path without a dedupe key falls back
        // to direct inserts (used only internally; the UI always
        // supplies a dedupeKey for bulk prep/follow-up adds).
        for (const t of newTasks) {
          try {
            const res = await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ task: t }),
            });
            const data = await res.json();
            if (res.ok) setTasks((prev) => [data.task, ...prev]);
          } catch {
            // ignore individual failures here; bulk path below is the
            // one used by the UI and handles errors explicitly.
          }
        }
        return { skipped: false, count: newTasks.length };
      }

      try {
        const res = await fetch("/api/tasks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks: newTasks, dedupeKey }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save tasks.");
        if (!data.skipped) {
          setTasks((prev) => [...data.tasks, ...prev]);
        }
        return { skipped: data.skipped as boolean, count: data.tasks?.length ?? 0 };
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to save tasks. Please try again."
        );
        return { skipped: false, count: 0, error: true };
      }
    },
    []
  );

  function openEditTask(task: Task) {
    setPendingSuggestionId(null);
    setModalTask(task);
  }

  async function handleSaveTask(task: Task) {
    const isNew = !tasks.some((t) => t.id === task.id);
    try {
      if (isNew) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save task.");
        setTasks((prev) => [data.task, ...prev]);
      } else {
        const res = await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save task.");
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
      }

      if (pendingSuggestionId) {
        setSuggestions((prev) => prev.filter((s) => s.id !== pendingSuggestionId));
      }
      showToast(`Task "${task.title}" saved.`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save task. Please try again."
      );
      return; // keep modal open so the user can retry
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

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-gray-400">Loading your data…</p>
      </div>
    );
  }

  if (loadError || !founderProfile || !companyProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">
            Could not load application data.
          </p>
          <p className="mt-1 text-xs text-red-600">
            {loadError ?? "Unknown error."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
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

              {section === "mycontext" && (
                <Section
                  title="My Context"
                  subtitle="Long-term context the AI uses to personalise every event strategy"
                >
                  <SaveStatusBadge status={contextSaveStatus} />
                  <MyContextPage
                    founderProfile={founderProfile}
                    onFounderChange={handleFounderChange}
                    companyProfile={companyProfile}
                    onCompanyChange={handleCompanyChange}
                    audienceSegments={audienceSegments}
                    onAudienceChange={handleAudienceChange}
                  />
                </Section>
              )}

              {section === "events" && (
                <Section
                  title="Events"
                  subtitle="Prepare for an upcoming event using your founder, company and audience context"
                >
                  <EventsPage
                    events={events}
                    initialStrategies={strategiesByEvent}
                    founderProfile={founderProfile}
                    companyProfile={companyProfile}
                    audienceSegments={audienceSegments}
                    defaultReminderMinutes={settings.defaultReminderMinutes}
                    onAddTasksBulk={handleAddTasksBulk}
                    onToast={showToast}
                  />
                </Section>
              )}

              {section === "settings" && (
                <Section title="Settings" subtitle="Configure your preferences">
                  <SaveStatusBadge status={settingsSaveStatus} />
                  <SettingsPanel
                    settings={settings}
                    onChange={handleSettingsChange}
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

function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const config: Record<Exclude<SaveStatus, "idle">, { text: string; className: string }> = {
    saving: { text: "Saving…", className: "bg-gray-100 text-gray-500" },
    saved: { text: "✓ Saved", className: "bg-green-100 text-green-700" },
    error: { text: "⚠ Failed to save", className: "bg-red-100 text-red-700" },
  };
  const c = config[status];
  return (
    <div className="mb-3">
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.className}`}>
        {c.text}
      </span>
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
