export type TaskSource = "Gmail" | "WhatsApp" | "Calendar" | "Manual";

export type TaskStatus = "pending" | "completed";

export interface Task {
  id: string;
  title: string;
  source: TaskSource;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  reminderMinutes: number;
  status: TaskStatus;
}

export interface Suggestion {
  id: string;
  originalMessage: string;
  extractedTitle: string;
  taskOwner: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  source: TaskSource;
  confidence: number; // 0-100
}

export interface Settings {
  notificationsEnabled: boolean;
  defaultReminderMinutes: 5 | 10 | 15 | 30;
}
