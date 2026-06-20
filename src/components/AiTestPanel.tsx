"use client";

import { useState } from "react";

interface ExtractionResult {
  is_action_item: boolean;
  task_owner: "user" | "sender" | "unknown";
  task_title: string | null;
  due_date: string | null;
  due_time: string | null;
  action_type: "create" | "update" | "complete" | "postpone" | "cancel" | "none";
  confidence: number;
  missing_information: string[];
  reason_for_classification: string;
}

// Temporary manual test tool for the AI task-extraction endpoint.
// Remove this component once real message ingestion (Gmail/WhatsApp) exists.
export default function AiTestPanel() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/extract-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setResult(data.result);
      }
    } catch {
      setError("Could not reach the AI extraction endpoint.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-dashed border-purple-300 bg-purple-50/60 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-500">
        Temporary: Test AI Task Extraction
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

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {result && (
        <div className="mt-3 rounded-lg bg-white p-3 text-xs text-gray-700">
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
