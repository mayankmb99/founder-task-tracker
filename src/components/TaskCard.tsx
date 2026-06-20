"use client";

import { Task } from "@/lib/types";
import { SourceIcon } from "./icons";

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Formats a "YYYY-MM-DD" calendar date deterministically (same output on
// server and client, regardless of locale or timezone). Computes the
// weekday using Date.UTC so the date is never reinterpreted in local time.
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAY_NAMES[weekdayIndex]}, ${MONTH_NAMES[month - 1]} ${day}`;
}

// Formats a "HH:MM" 24-hour time as 12-hour with AM/PM, without relying on
// Intl/locale formatting which can differ between server and client.
function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minutes = String(m).padStart(2, "0");
  return `${hour12}:${minutes} ${period}`;
}

export default function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const isCompleted = task.status === "completed";

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
      <button
        onClick={() => onToggleComplete(task.id)}
        aria-label="Toggle complete"
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
          isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-300 hover:border-blue-400"
        }`}
      >
        {isCompleted && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path
              d="M2 6L4.5 8.5L10 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <SourceIcon source={task.source} className="h-8 w-8 text-base" />

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            isCompleted ? "text-gray-400 line-through" : "text-gray-800"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
          <span>{task.source}</span>
          <span>·</span>
          <span>{formatDate(task.dueDate)}</span>
          <span>·</span>
          <span>{formatTime(task.dueTime)}</span>
          <span>·</span>
          <span>⏰ {task.reminderMinutes}m before</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={() => onEdit(task)}
          className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
