"use client";

import { useState } from "react";
import {
  AudienceSegment,
  CompanyProfile,
  EventRecord,
  EventStrategy,
  FounderProfile,
  Task,
} from "@/lib/types";
import EventTargetCard from "./EventTargetCard";
import EventStrategyView from "./EventStrategyView";
import InteractionForm from "./InteractionForm";
import { salesMeetingDemo } from "@/lib/mockData";

interface BulkAddResult {
  skipped: boolean;
  count: number;
  error?: boolean;
}

interface EventsPageProps {
  events: EventRecord[];
  initialStrategies: Record<string, EventStrategy>;
  founderProfile: FounderProfile;
  companyProfile: CompanyProfile;
  audienceSegments: AudienceSegment[];
  defaultReminderMinutes: number;
  onAddTasksBulk: (tasks: Task[], dedupeKey?: string) => Promise<BulkAddResult>;
  onToast: (message: string) => void;
  onEventsChange: (events: EventRecord[]) => void;
}

function offsetDateString(baseDate: string, days: number): string {
  const [year, month, day] = baseDate.slice(0, 10).split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function EventsPage({
  events,
  initialStrategies,
  founderProfile,
  companyProfile,
  audienceSegments,
  defaultReminderMinutes,
  onAddTasksBulk,
  onToast,
  onEventsChange,
}: EventsPageProps) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [strategies, setStrategies] =
    useState<Record<string, EventStrategy>>(initialStrategies);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsavedWarning, setUnsavedWarning] = useState<string | null>(null);
  const [groundingWarnings, setGroundingWarnings] = useState<string[]>([]);
  const [retrievalStatus, setRetrievalStatus] = useState<string | null>(null);
  const [prepTasksAdded, setPrepTasksAdded] = useState<Record<string, boolean>>({});
  const [followUpTasksAdded, setFollowUpTasksAdded] = useState<Record<string, boolean>>({});
  const [addingPrep, setAddingPrep] = useState(false);
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null | undefined>(undefined);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [savingEvent, setSavingEvent] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const strategy = selectedEvent ? strategies[selectedEvent.id] : undefined;
  const audience = selectedEvent
    ? audienceSegments.find((a) => a.id === selectedEvent.audienceSegmentId) ?? null
    : null;

  async function handleGenerateStrategy() {
    if (!selectedEvent) return;
    setLoadingEventId(selectedEvent.id);
    setError(null);
    setUnsavedWarning(null);
    setGroundingWarnings([]);
    setRetrievalStatus(null);
    try {
      const res = await fetch("/api/generate-event-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          founderProfile,
          companyProfile,
          audienceSegment: audience,
          event: selectedEvent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate preparation strategy.");
        return;
      }
      setStrategies((prev) => ({ ...prev, [selectedEvent.id]: data.result }));
      setGroundingWarnings(Array.isArray(data.groundingWarnings) ? data.groundingWarnings : []);
      setRetrievalStatus(typeof data.retrievalStatus === "string" ? data.retrievalStatus : null);
      setPrepTasksAdded((prev) => ({ ...prev, [selectedEvent.id]: false }));
      setFollowUpTasksAdded((prev) => ({ ...prev, [selectedEvent.id]: false }));
      if (!data.persisted) {
        setUnsavedWarning(
          "The strategy generated successfully but could not be saved to the database. It will be lost on refresh — you can retry generating to save it."
        );
      }
    } catch {
      setError("Could not reach the preparation strategy endpoint.");
    } finally {
      setLoadingEventId(null);
    }
  }

  async function handleSaveEvent(event: EventRecord) {
    setSavingEvent(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: formMode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save interaction.");
      const nextEvents =
        formMode === "create"
          ? [...events, data.event]
          : events.map((existing) =>
              existing.id === data.event.id ? data.event : existing
            );
      onEventsChange(nextEvents);
      setSelectedEventId(data.event.id);
      setEditingEvent(undefined);
      onToast(`${data.event.eventName} saved.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save interaction."
      );
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleAddPreparationTasks() {
    if (!selectedEvent || !strategy || prepTasksAdded[selectedEvent.id]) return;
    setAddingPrep(true);
    const newTasks: Task[] = strategy.preparationItems.map((item, i) => ({
      id: `task-prep-${selectedEvent.id}-${Date.now()}-${i}`,
      title: item,
      source: "Manual",
      dueDate: offsetDateString(selectedEvent.eventStart, -1),
      dueTime: "18:00",
      reminderMinutes: defaultReminderMinutes,
      status: "pending",
    }));
    const result = await onAddTasksBulk(
      newTasks,
      `event:${selectedEvent.id}:prep`
    );
    setAddingPrep(false);
    if (result.error) return;
    setPrepTasksAdded((prev) => ({ ...prev, [selectedEvent.id]: true }));
    if (result.skipped) {
      onToast("Preparation tasks were already added for this meeting or event.");
    } else {
      onToast(`Added ${result.count} preparation task(s) for ${selectedEvent.eventName}.`);
    }
  }

  async function handleAddFollowUpTasks() {
    if (!selectedEvent || !strategy || followUpTasksAdded[selectedEvent.id]) return;
    setAddingFollowUp(true);
    const newTasks: Task[] = strategy.followUpActions.map((item, i) => ({
      id: `task-followup-${selectedEvent.id}-${Date.now()}-${i}`,
      title: item,
      source: "Manual",
      dueDate: offsetDateString(selectedEvent.eventStart, 1),
      dueTime: "10:00",
      reminderMinutes: defaultReminderMinutes,
      status: "pending",
    }));
    const result = await onAddTasksBulk(
      newTasks,
      `event:${selectedEvent.id}:followup`
    );
    setAddingFollowUp(false);
    if (result.error) return;
    setFollowUpTasksAdded((prev) => ({ ...prev, [selectedEvent.id]: true }));
    if (result.skipped) {
      onToast("Follow-up tasks were already added for this meeting or event.");
    } else {
      onToast(`Added ${result.count} follow-up task(s) for ${selectedEvent.eventName}.`);
    }
  }

  if (!selectedEvent) {
    return (
      <div>
        {editingEvent !== undefined ? (
          <InteractionForm
            event={editingEvent}
            mode={formMode}
            defaultAudienceSegmentId={audienceSegments[0]?.id ?? null}
            saving={savingEvent}
            onSave={handleSaveEvent}
            onCancel={() => setEditingEvent(undefined)}
          />
        ) : (
          <button
            onClick={() => {
              setFormMode("create");
              setEditingEvent(null);
            }}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white"
          >
            Create meeting or event
          </button>
        )}
      </div>
    );
  }

  if (editingEvent !== undefined) {
    return (
      <InteractionForm
        event={editingEvent}
        mode={formMode}
        defaultAudienceSegmentId={audienceSegments[0]?.id ?? null}
        saving={savingEvent}
        onSave={handleSaveEvent}
        onCancel={() => setEditingEvent(undefined)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.eventName}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setFormMode("create");
            setEditingEvent(null);
          }}
          className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          + New meeting or event
        </button>
        <button
          onClick={() => {
            setFormMode("create");
            setEditingEvent({
              ...salesMeetingDemo,
              audienceSegmentId: audienceSegments[0]?.id ?? null,
              targets: salesMeetingDemo.targets.map((target) => ({ ...target })),
            });
          }}
          className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
        >
          Load sales meeting demo
        </button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {selectedEvent.eventName}
            </p>
            <p className="text-xs uppercase tracking-wide text-purple-500">
              {selectedEvent.eventType.replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={() => {
              setFormMode("edit");
              setEditingEvent(selectedEvent);
            }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Edit interaction
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">{selectedEvent.eventDescription}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400">Date</p>
            <p className="text-gray-700">
              {new Date(selectedEvent.eventStart).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">Location</p>
            <p className="text-gray-700">{selectedEvent.eventLocation}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400">Desired outcome</p>
          <p className="text-sm text-gray-700">{selectedEvent.userGoal}</p>
        </div>

        {selectedEvent.additionalContext && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-400">
              Additional context
            </p>
            <p className="text-sm text-gray-700">
              {selectedEvent.additionalContext}
            </p>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-gray-400">
            People and organisations involved
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {selectedEvent.targets.map((t) => (
              <EventTargetCard key={t.id} target={t} />
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerateStrategy}
          disabled={loadingEventId === selectedEvent.id}
          className="mt-5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingEventId === selectedEvent.id
            ? "Generating preparation strategy…"
            : strategy
            ? "Regenerate Preparation Strategy"
            : "Generate Preparation Strategy"}
        </button>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {retrievalStatus === "not_configured" && (
          <p className="mt-3 text-sm text-gray-500">
            Document retrieval is not configured.
          </p>
        )}
        {groundingWarnings.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Grounding warning
            </p>
            <p className="mt-1">
              The generated strategy passed schema validation, but the deterministic
              checks flagged a possible grounding issue. Review carefully before
              adding tasks.
            </p>
          </div>
        )}
        {unsavedWarning && (
          <p className="mt-3 text-sm text-amber-600">{unsavedWarning}</p>
        )}
      </div>

      {strategy && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <EventStrategyView strategy={strategy} targets={selectedEvent.targets} />

          <div className="mt-5 flex gap-2">
            <button
              onClick={handleAddPreparationTasks}
              disabled={
                strategy.preparationItems.length === 0 ||
                !!prepTasksAdded[selectedEvent.id] ||
                addingPrep
              }
              className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingPrep
                ? "Adding…"
                : prepTasksAdded[selectedEvent.id]
                ? "✓ Preparation tasks added"
                : "+ Add preparation tasks"}
            </button>
            <button
              onClick={handleAddFollowUpTasks}
              disabled={
                strategy.followUpActions.length === 0 ||
                !!followUpTasksAdded[selectedEvent.id] ||
                addingFollowUp
              }
              className="flex-1 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingFollowUp
                ? "Adding…"
                : followUpTasksAdded[selectedEvent.id]
                ? "✓ Follow-up tasks added"
                : "+ Add follow-up tasks"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
