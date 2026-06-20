import { Settings, Suggestion, Task } from "./types";

// Reference "today" used to build relative sample dates.
// Fixed at noon UTC and offset using UTC date math so the resulting
// YYYY-MM-DD is identical regardless of the server's or browser's timezone.
const TODAY_UTC = Date.UTC(2026, 5, 20, 12);

function dateOffset(days: number): string {
  const d = new Date(TODAY_UTC);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Send investor update email",
    source: "Gmail",
    dueDate: dateOffset(0),
    dueTime: "10:00",
    reminderMinutes: 15,
    status: "pending",
  },
  {
    id: "t2",
    title: "Call back supplier re: invoice",
    source: "WhatsApp",
    dueDate: dateOffset(0),
    dueTime: "14:30",
    reminderMinutes: 10,
    status: "pending",
  },
  {
    id: "t3",
    title: "Board sync meeting",
    source: "Calendar",
    dueDate: dateOffset(0),
    dueTime: "17:00",
    reminderMinutes: 30,
    status: "pending",
  },
  {
    id: "t4",
    title: "Review product roadmap doc",
    source: "Gmail",
    dueDate: dateOffset(2),
    dueTime: "09:00",
    reminderMinutes: 15,
    status: "pending",
  },
  {
    id: "t5",
    title: "Confirm office lease renewal",
    source: "WhatsApp",
    dueDate: dateOffset(3),
    dueTime: "11:00",
    reminderMinutes: 5,
    status: "pending",
  },
  {
    id: "t6",
    title: "Quarterly tax filing reminder",
    source: "Calendar",
    dueDate: dateOffset(5),
    dueTime: "16:00",
    reminderMinutes: 30,
    status: "pending",
  },
  {
    id: "t7",
    title: "Send onboarding docs to new hire",
    source: "Gmail",
    dueDate: dateOffset(-1),
    dueTime: "09:30",
    reminderMinutes: 10,
    status: "completed",
  },
  {
    id: "t8",
    title: "Pay co-working space invoice",
    source: "WhatsApp",
    dueDate: dateOffset(-2),
    dueTime: "13:00",
    reminderMinutes: 5,
    status: "completed",
  },
];

export const initialSuggestions: Suggestion[] = [
  {
    id: "s1",
    originalMessage:
      "Hey, can you send over the signed NDA before our call tomorrow morning?",
    extractedTitle: "Send signed NDA",
    taskOwner: "You",
    date: dateOffset(1),
    time: "09:00",
    source: "WhatsApp",
    confidence: 92,
  },
  {
    id: "s2",
    originalMessage:
      "Reminder: Q3 budget review is scheduled, please prepare the slide deck beforehand.",
    extractedTitle: "Prepare Q3 budget slide deck",
    taskOwner: "You",
    date: dateOffset(4),
    time: "15:00",
    source: "Gmail",
    confidence: 87,
  },
  {
    id: "s3",
    originalMessage:
      "Don't forget — dentist appointment moved to next Tuesday at 4pm.",
    extractedTitle: "Dentist appointment",
    taskOwner: "You",
    date: dateOffset(6),
    time: "16:00",
    source: "Calendar",
    confidence: 78,
  },
  {
    id: "s4",
    originalMessage:
      "Can we sync on the marketing budget sometime this week? It's getting urgent.",
    extractedTitle: "Sync on marketing budget",
    taskOwner: "You",
    date: dateOffset(2),
    time: "11:30",
    source: "WhatsApp",
    confidence: 65,
  },
];

export const initialSettings: Settings = {
  notificationsEnabled: true,
  defaultReminderMinutes: 15,
};
