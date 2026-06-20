"use client";

import { EventTarget } from "@/lib/types";

const PRIORITY_STYLES: Record<EventTarget["priority"], string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

export default function EventTargetCard({ target }: { target: EventTarget }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {target.personName}
          </p>
          <p className="text-xs text-gray-500">
            {target.role} · {target.companyName}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            PRIORITY_STYLES[target.priority]
          }`}
        >
          {target.priority} priority
        </span>
      </div>
      {target.companyDescription && (
        <p className="mt-2 text-xs text-gray-500">{target.companyDescription}</p>
      )}
      {target.knownNeeds.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Known needs: </span>
          {target.knownNeeds.join("; ")}
        </p>
      )}
      {target.relevanceReason && (
        <p className="mt-1 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Why relevant: </span>
          {target.relevanceReason}
        </p>
      )}
    </div>
  );
}
