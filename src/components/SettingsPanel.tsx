"use client";

import { Settings } from "@/lib/types";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onTestNotification: () => void;
}

const REMINDER_OPTIONS: Array<5 | 10 | 15 | 30> = [5, 10, 15, 30];

export default function SettingsPanel({
  settings,
  onChange,
  onTestNotification,
}: SettingsPanelProps) {
  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Notifications</p>
            <p className="text-xs text-gray-400">
              Get reminded before tasks are due.
            </p>
          </div>
          <button
            onClick={() =>
              onChange({
                ...settings,
                notificationsEnabled: !settings.notificationsEnabled,
              })
            }
            aria-label="Toggle notifications"
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
              settings.notificationsEnabled ? "bg-blue-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                settings.notificationsEnabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-800">Default reminder</p>
        <p className="mb-3 text-xs text-gray-400">
          New tasks will use this reminder time by default.
        </p>
        <div className="flex gap-2">
          {REMINDER_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => onChange({ ...settings, defaultReminderMinutes: m })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                settings.defaultReminderMinutes === m
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-800">Test notification</p>
        <p className="mb-3 text-xs text-gray-400">
          Send yourself a sample reminder to see how it looks.
        </p>
        <button
          onClick={onTestNotification}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
        >
          Test Notification
        </button>
      </div>
    </div>
  );
}
