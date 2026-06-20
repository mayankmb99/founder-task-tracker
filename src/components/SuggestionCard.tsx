"use client";

import { Suggestion } from "@/lib/types";
import { SourceIcon } from "./icons";

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAdd: (s: Suggestion) => void;
  onEdit: (s: Suggestion) => void;
  onDismiss: (id: string) => void;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 85) return "bg-green-100 text-green-700";
  if (confidence >= 70) return "bg-yellow-100 text-yellow-700";
  return "bg-orange-100 text-orange-700";
}

export default function SuggestionCard({
  suggestion,
  onAdd,
  onEdit,
  onDismiss,
}: SuggestionCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SourceIcon source={suggestion.source} className="h-7 w-7 text-sm" />
          <span className="text-xs font-medium text-gray-400">
            {suggestion.source}
          </span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${confidenceColor(
            suggestion.confidence
          )}`}
        >
          {suggestion.confidence}% confidence
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs italic text-gray-500">
        “{suggestion.originalMessage}”
      </p>

      <div className="mt-3 space-y-1 text-sm">
        <p className="font-semibold text-gray-800">{suggestion.extractedTitle}</p>
        <p className="text-xs text-gray-400">
          Owner: <span className="text-gray-600">{suggestion.taskOwner}</span> ·{" "}
          {suggestion.date} · {suggestion.time}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAdd(suggestion)}
          className="flex-1 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-600"
        >
          Add
        </button>
        <button
          onClick={() => onEdit(suggestion)}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
