"use client";

import { FormEvent, useState } from "react";
import { EventRecord, EventTarget, EventType } from "@/lib/types";

const INTERACTION_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "sales_meeting", label: "Sales Meeting" },
  { value: "investor_meeting", label: "Investor Meeting" },
  { value: "partnership_meeting", label: "Partnership Meeting" },
  { value: "vendor_negotiation", label: "Vendor Negotiation" },
  { value: "customer_call", label: "Customer Call" },
  { value: "startup_event", label: "Startup Event" },
  { value: "conference", label: "Conference" },
  { value: "other", label: "Other" },
];

function newTarget(): EventTarget {
  return {
    id: `new-target-${crypto.randomUUID()}`,
    personName: "",
    role: "",
    companyName: "",
    companyDescription: "",
    knownNeeds: [],
    relevanceReason: "",
    priority: "medium",
    status: "not_contacted",
  };
}

function normalizeType(type: EventType | undefined): EventType {
  return type === "startup_expo" ? "startup_event" : type ?? "sales_meeting";
}

function inputDateTime(value: string | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T09:00`;
  return value.slice(0, 16);
}

export default function InteractionForm({
  event,
  mode,
  defaultAudienceSegmentId,
  saving,
  onSave,
  onCancel,
}: {
  event: EventRecord | null;
  mode: "create" | "edit";
  defaultAudienceSegmentId: string | null;
  saving: boolean;
  onSave: (event: EventRecord) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EventRecord>(() =>
    event
      ? {
          ...event,
          eventType: normalizeType(event.eventType),
          eventStart: inputDateTime(event.eventStart),
          targets: event.targets.map((target) => ({ ...target })),
        }
      : {
          id: `new-event-${crypto.randomUUID()}`,
          eventType: "sales_meeting",
          eventName: "",
          eventDescription: "",
          eventStart: "",
          eventLocation: "",
          userGoal: "",
          additionalContext: "",
          audienceSegmentId: defaultAudienceSegmentId,
          targets: [newTarget()],
        }
  );
  const [error, setError] = useState("");

  function updateTarget(index: number, update: Partial<EventTarget>) {
    setDraft((current) => ({
      ...current,
      targets: current.targets.map((target, targetIndex) =>
        targetIndex === index ? { ...target, ...update } : target
      ),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.eventName.trim() || !draft.eventStart || !draft.userGoal.trim()) {
      setError("Name, start date/time, and desired outcome are required.");
      return;
    }
    setError("");
    await onSave({
      ...draft,
      eventName: draft.eventName.trim(),
      eventStart: new Date(draft.eventStart).toISOString(),
      targets: draft.targets.filter(
        (target) => target.personName.trim() || target.companyName.trim()
      ),
    });
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">
          {mode === "edit" ? "Edit meeting or event" : "Create meeting or event"}
        </h2>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800">
          Cancel
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800">Interaction details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-gray-500">
          Interaction type
          <select
            value={draft.eventType}
            onChange={(e) => setDraft({ ...draft, eventType: e.target.value as EventType })}
            className={`mt-1 ${inputClass}`}
          >
            {INTERACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-500">
          Meeting or event name
          <input value={draft.eventName} onChange={(e) => setDraft({ ...draft, eventName: e.target.value })} className={`mt-1 ${inputClass}`} />
        </label>
        <label className="text-xs font-medium text-gray-500">
          Start date and time
          <input type="datetime-local" value={draft.eventStart} onChange={(e) => setDraft({ ...draft, eventStart: e.target.value })} className={`mt-1 ${inputClass}`} />
        </label>
        <label className="text-xs font-medium text-gray-500">
          Location
          <input value={draft.eventLocation} onChange={(e) => setDraft({ ...draft, eventLocation: e.target.value })} className={`mt-1 ${inputClass}`} />
        </label>
        </div>
      </div>

      <label className="block text-xs font-medium text-gray-500">
        Description
        <textarea rows={2} value={draft.eventDescription} onChange={(e) => setDraft({ ...draft, eventDescription: e.target.value })} className={`mt-1 ${inputClass}`} />
      </label>
      <label className="block text-xs font-medium text-gray-500">
        Desired outcome
        <textarea rows={2} value={draft.userGoal} onChange={(e) => setDraft({ ...draft, userGoal: e.target.value })} className={`mt-1 ${inputClass}`} />
      </label>
      <label className="block text-xs font-medium text-gray-500">
        Additional supplied context
        <textarea rows={2} value={draft.additionalContext} onChange={(e) => setDraft({ ...draft, additionalContext: e.target.value })} className={`mt-1 ${inputClass}`} />
      </label>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">People and organisations involved</h3>
          <button type="button" onClick={() => setDraft({ ...draft, targets: [...draft.targets, newTarget()] })} className="text-xs font-medium text-blue-600 hover:text-blue-700">
            + Add other party
          </button>
        </div>
        <div className="space-y-4">
          {draft.targets.map((target, index) => (
            <div key={target.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-gray-500">Person name<input value={target.personName} onChange={(e) => updateTarget(index, { personName: e.target.value })} className={`mt-1 ${inputClass}`} /></label>
                <label className="text-xs text-gray-500">Role<input value={target.role} onChange={(e) => updateTarget(index, { role: e.target.value })} className={`mt-1 ${inputClass}`} /></label>
                <label className="text-xs text-gray-500">Company<input value={target.companyName} onChange={(e) => updateTarget(index, { companyName: e.target.value })} className={`mt-1 ${inputClass}`} /></label>
                <label className="text-xs text-gray-500">Company background<input value={target.companyDescription} onChange={(e) => updateTarget(index, { companyDescription: e.target.value })} className={`mt-1 ${inputClass}`} /></label>
              </div>
              <label className="mt-3 block text-xs text-gray-500">What we know about them<textarea rows={3} value={target.knownNeeds.join("\n")} onChange={(e) => updateTarget(index, { knownNeeds: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} className={`mt-1 ${inputClass}`} /></label>
              <label className="mt-3 block text-xs text-gray-500">Why this person matters<textarea rows={2} value={target.relevanceReason} onChange={(e) => updateTarget(index, { relevanceReason: e.target.value })} className={`mt-1 ${inputClass}`} /></label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-gray-500">Priority<select value={target.priority} onChange={(e) => updateTarget(index, { priority: e.target.value as EventTarget["priority"] })} className={`mt-1 ${inputClass}`}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
                <label className="text-xs text-gray-500">Relationship status<select value={target.status} onChange={(e) => updateTarget(index, { status: e.target.value as EventTarget["status"] })} className={`mt-1 ${inputClass}`}><option value="not_contacted">Not contacted</option><option value="contacted">Contacted</option><option value="met">Met</option></select></label>
              </div>
              <button type="button" onClick={() => setDraft({ ...draft, targets: draft.targets.filter((_, targetIndex) => targetIndex !== index) })} className="mt-3 text-xs text-red-600 hover:text-red-700">Remove other party</button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50">
          {saving ? "Saving…" : "Save meeting or event"}
        </button>
      </div>
    </form>
  );
}
