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
}

function offsetDateString(baseDate: string, days: number): string {
  const [year, month, day] = baseDate.split("-").map(Number);
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
}: EventsPageProps) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [strategies, setStrategies] =
    useState<Record<string, EventStrategy>>(initialStrategies);
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsavedWarning, setUnsavedWarning] = useState<string | null>(null);
  const [prepTasksAdded, setPrepTasksAdded] = useState<Record<string, boolean>>({});
  const [followUpTasksAdded, setFollowUpTasksAdded] = useState<Record<string, boolean>>({});
  const [addingPrep, setAddingPrep] = useState(false);
  const [addingFollowUp, setAddingFollowUp] = useState(false);

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
        setError(data.error ?? "Failed to generate event strategy.");
        return;
      }
      setStrategies((prev) => ({ ...prev, [selectedEvent.id]: data.result }));
      setPrepTasksAdded((prev) => ({ ...prev, [selectedEvent.id]: false }));
      setFollowUpTasksAdded((prev) => ({ ...prev, [selectedEvent.id]: false }));
      if (!data.persisted) {
        setUnsavedWarning(
          "The strategy generated successfully but could not be saved to the database. It will be lost on refresh — you can retry generating to save it."
        );
      }
    } catch {
      setError("Could not reach the event strategy endpoint.");
    } finally {
      setLoadingEventId(null);
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
      onToast("Preparation tasks were already added for this event.");
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
      onToast("Follow-up tasks were already added for this event.");
    } else {
      onToast(`Added ${result.count} follow-up task(s) for ${selectedEvent.eventName}.`);
    }
  }

  if (!selectedEvent) {
    return <p className="text-sm text-gray-400">No events yet.</p>;
  }

  return (
    <div className="space-y-6">
      {events.length > 1 && (
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
      )}

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
        </div>
        <p className="mt-2 text-sm text-gray-500">{selectedEvent.eventDescription}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400">Date</p>
            <p className="text-gray-700">{selectedEvent.eventStart}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">Location</p>
            <p className="text-gray-700">{selectedEvent.eventLocation}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400">Goal for this event</p>
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
            Target people & companies
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
            ? "Generating strategy…"
            : strategy
            ? "Regenerate Event Strategy"
            : "Generate Event Strategy"}
        </button>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        {unsavedWarning && (
          <p className="mt-3 text-sm text-amber-600">{unsavedWarning}</p>
        )}
      </div>

      {strategy && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <EventStrategyView strategy={strategy} />

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
