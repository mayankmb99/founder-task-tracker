"use client";

import { useState } from "react";
import TaskModal from "@/components/TaskModal";
import { ExtractionResult, Task } from "@/lib/types";

interface AiTestPanelProps {
  defaultReminderMinutes: number;
  onTaskAdded: (task: Task) => void;
  onToast: (message: string) => void;
}

type SuggestionState = "pending" | "adding" | "added" | "dismissing";

function displayValue(value: string | null, fallback = "Not provided") {
  return value?.trim() || fallback;
}

function fieldLabel(field: string) {
  return field
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase();
}

export default function AiTestPanel({
  defaultReminderMinutes,
  onTaskAdded,
  onToast,
}: AiTestPanelProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [suggestionState, setSuggestionState] = useState<SuggestionState>("pending");
  const [error, setError] = useState<string | null>(null);
  const [editorTask, setEditorTask] = useState<Task | undefined>(undefined);
  const [groundingWarnings, setGroundingWarnings] = useState<string[]>([]);

  async function handleAnalyze() {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSuggestionId(null);
    setSuggestionState("pending");
    setGroundingWarnings([]);
    try {
      const res = await fetch("/api/extract-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sourceType: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data.result);
      setSuggestionId(data.suggestionId);
      setGroundingWarnings(Array.isArray(data.groundingWarnings) ? data.groundingWarnings : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not analyze the message."
      );
    } finally {
      setLoading(false);
    }
  }

  function taskFromResult(): Task | null {
    if (!result?.isActionItem) return null;
    return {
      id: `extracted-${suggestionId}`,
      title: result.taskTitle ?? "",
      source: "Manual",
      dueDate: result.dueDate ?? "",
      dueTime: result.dueTime ?? "",
      reminderMinutes: defaultReminderMinutes,
      status: "pending",
    };
  }

  async function acceptTask(task: Task) {
    if (!suggestionId || suggestionState !== "pending") return;
    setSuggestionState("adding");
    setError(null);
    try {
      const res = await fetch("/api/task-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestionId,
          task: {
            title: task.title,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            reminderMinutes: task.reminderMinutes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add task.");
      setSuggestionState("added");
      setEditorTask(undefined);
      onTaskAdded(data.task);
      onToast(`Task "${data.task.title}" added.`);
    } catch (err) {
      setSuggestionState("pending");
      setError(err instanceof Error ? err.message : "Failed to add task.");
    }
  }

  function handleAdd() {
    const task = taskFromResult();
    if (!task) return;
    if (!task.title || !task.dueDate || !task.dueTime) {
      setError("Fill in the missing task fields before adding.");
      setEditorTask(task);
      return;
    }
    void acceptTask(task);
  }

  function handleEdit() {
    const task = taskFromResult();
    if (task) setEditorTask(task);
  }

  async function handleDismiss() {
    if (!suggestionId || suggestionState !== "pending") return;
    setSuggestionState("dismissing");
    setError(null);
    try {
      const res = await fetch("/api/task-suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to dismiss suggestion.");
      setResult(null);
      setSuggestionId(null);
      setSuggestionState("pending");
      setGroundingWarnings([]);
      onToast("Suggestion dismissed.");
    } catch (err) {
      setSuggestionState("pending");
      setError(
        err instanceof Error ? err.message : "Failed to dismiss suggestion."
      );
    }
  }

  const confidencePercent = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className="mb-6 rounded-xl border border-dashed border-purple-300 bg-purple-50/60 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-500">
        Test AI Task Extraction
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Paste a message here, e.g. 'I'll send Arjun the proposal tomorrow by 4 PM.'"
        rows={2}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
      />
      <button
        onClick={handleAnalyze}
        disabled={loading || !message.trim()}
        className="mt-2 rounded-lg bg-purple-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Analyzing…" : "Analyze with AI"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {groundingWarnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Grounding warning
          </p>
          <p className="mt-1">
            The model returned a valid suggestion, but the deterministic checks flagged
            a possible grounding issue. Review carefully before adding.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">
                {result.isActionItem ? "Task suggestion" : "No task detected"}
              </p>
              <h2 className="mt-1 text-base font-semibold text-gray-800">
                {result.isActionItem
                  ? displayValue(result.taskTitle, "Title missing")
                  : "No task detected"}
              </h2>
            </div>
            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
              {confidencePercent}% confidence
            </span>
          </div>

          {result.isActionItem && (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-gray-400">Owner</dt>
                <dd className="mt-0.5 font-medium capitalize text-gray-700">
                  {result.taskOwner}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Due date</dt>
                <dd className="mt-0.5 font-medium text-gray-700">
                  {displayValue(result.dueDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Due time</dt>
                <dd className="mt-0.5 font-medium text-gray-700">
                  {displayValue(result.dueTime)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Action type</dt>
                <dd className="mt-0.5 font-medium capitalize text-gray-700">
                  {fieldLabel(result.actionType)}
                </dd>
              </div>
            </dl>
          )}

          {result.missingInformation.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                Missing or unclear information
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.missingInformation.map((field) => (
                  <span
                    key={field}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs capitalize text-amber-800"
                  >
                    {fieldLabel(field)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-400">Reason</p>
            <p className="mt-1 text-sm text-gray-600">
              {result.reasonForClassification}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {result.isActionItem && (
              <>
                <button
                  onClick={handleAdd}
                  disabled={suggestionState !== "pending"}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestionState === "adding"
                    ? "Adding…"
                    : suggestionState === "added"
                      ? "Added to Tasks"
                      : "Add to Tasks"}
                </button>
                <button
                  onClick={handleEdit}
                  disabled={suggestionState !== "pending"}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit
                </button>
              </>
            )}
            {suggestionState !== "added" && (
              <button
                onClick={handleDismiss}
                disabled={suggestionState !== "pending"}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suggestionState === "dismissing" ? "Dismissing…" : "Dismiss"}
              </button>
            )}
          </div>
        </div>
      )}

      {editorTask && (
        <TaskModal
          task={editorTask}
          defaultReminderMinutes={defaultReminderMinutes}
          onSave={(task) => void acceptTask(task)}
          onClose={() => setEditorTask(undefined)}
          saving={suggestionState === "adding"}
        />
      )}
    </div>
  );
}
