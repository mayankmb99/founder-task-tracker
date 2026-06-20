import { TASK_EXTRACTION_AMBIGUITY_RULES, TASK_EXTRACTION_SUPPORTED_FIELDS } from "./limits";
import type { TaskExtractionContext, TaskExtractionSourceType } from "./types";

function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function buildTaskExtractionContext(input: {
  sourceText: string;
  sourceType?: TaskExtractionSourceType | null;
  receivedAt?: string | null;
  currentDate?: string;
  userTimezone?: string;
}): TaskExtractionContext {
  const userTimezone = input.userTimezone ?? "Asia/Kolkata";
  return {
    sourceText: input.sourceText.trim(),
    sourceType: input.sourceType ?? null,
    receivedAt: input.receivedAt ?? null,
    currentDate: input.currentDate ?? todayInTimezone(userTimezone),
    userTimezone,
    supportedTaskFields: [...TASK_EXTRACTION_SUPPORTED_FIELDS],
    ambiguityRules: [...TASK_EXTRACTION_AMBIGUITY_RULES],
  };
}

export function renderTaskExtractionContext(context: TaskExtractionContext): string {
  return [
    "TASK EXTRACTION CONTEXT",
    `Current date: ${context.currentDate}`,
    `User timezone: ${context.userTimezone}`,
    `Actual source type: ${context.sourceType ?? "(not supplied)"}`,
    `Received timestamp: ${context.receivedAt ?? "(not supplied)"}`,
    "Original source text:",
    context.sourceText,
    "Supported task fields:",
    context.supportedTaskFields.map((field) => `- ${field}`).join("\n"),
    "Ambiguity rules:",
    context.ambiguityRules.map((rule) => `- ${rule}`).join("\n"),
  ].join("\n");
}
