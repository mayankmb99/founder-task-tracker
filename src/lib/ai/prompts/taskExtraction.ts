import type { TaskExtractionContext } from "../context/types";
import { SHARED_GROUNDING_RULES, SHARED_OUTPUT_RULES } from "./sharedRules";
import type { ExtractionResult } from "@/lib/types";

export const TASK_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    isActionItem: {
      type: "boolean",
      description: "True only if the message describes a real, not-yet-done task.",
    },
    taskOwner: {
      type: "string",
      enum: ["user", "sender", "unknown"],
      description: "Who is responsible for doing the task.",
    },
    taskTitle: {
      type: ["string", "null"],
      description: "Short title of the task, or null if there is no task.",
    },
    dueDate: {
      type: ["string", "null"],
      description: "Date in YYYY-MM-DD format, or null if no date was stated or clearly implied.",
    },
    dueTime: {
      type: ["string", "null"],
      description: "Time in 24-hour HH:MM format, or null if no time was stated or clearly implied.",
    },
    actionType: {
      type: "string",
      enum: ["create", "update", "complete", "postpone", "cancel", "none"],
    },
    confidence: {
      type: "number",
      description: "0 to 1 confidence that isActionItem and the extracted fields are correct.",
    },
    missingInformation: {
      type: "array",
      items: { type: "string" },
      description: "List of fields that are missing or unclear, e.g. 'dueDate', 'dueTime'.",
    },
    reasonForClassification: {
      type: "string",
      description: "One short sentence explaining the classification.",
    },
  },
  required: [
    "isActionItem",
    "taskOwner",
    "taskTitle",
    "dueDate",
    "dueTime",
    "actionType",
    "confidence",
    "missingInformation",
    "reasonForClassification",
  ],
  additionalProperties: false,
} as const;

export function buildTaskExtractionPrompt(context: TaskExtractionContext): {
  system: string;
  user: string;
} {
  const system = [
    "You extract a possible task from a single message sent to or from the user.",
    "The input is an evidence source, not a conversation.",
    `Current date: ${context.currentDate}`,
    `User timezone: ${context.userTimezone}`,
    "Resolve relative dates only when the message clearly supports them.",
    "",
    "Shared grounding rules:",
    SHARED_GROUNDING_RULES,
    "",
    "Shared output rules:",
    SHARED_OUTPUT_RULES,
    "",
    "Task extraction specific rules:",
    "- Never invent a date.",
    "- Never invent a time.",
    "- Return null for any field where the information is missing, instead of guessing.",
    "- Distinguish whose task it is: 'user' if the message author must do it, 'sender' if the other person must do it, 'unknown' if unclear.",
    "- Do not treat something already done or completed as a new task.",
    "- Treat vague possibilities, maybes, or hypotheticals as low confidence (below 0.5), and if too vague, isActionItem should be false.",
    "- A statement of opinion or status with no future action is not an action item.",
    "- List every field you could not confidently determine in missingInformation.",
    "- Use the actual source type only if it was supplied by the application.",
  ].join("\n");

  const user = [
    "TASK EXTRACTION CONTEXT",
    `Actual source type: ${context.sourceType ?? "(not supplied)"}`,
    `Received timestamp: ${context.receivedAt ?? "(not supplied)"}`,
    `Current date: ${context.currentDate}`,
    `User timezone: ${context.userTimezone}`,
    "Supported task fields:",
    context.supportedTaskFields.map((field) => `- ${field}`).join("\n"),
    "Ambiguity rules:",
    context.ambiguityRules.map((rule) => `- ${rule}`).join("\n"),
    "Original source text:",
    context.sourceText,
  ].join("\n");

  return { system, user };
}

export function normalizeTaskExtraction(raw: unknown): ExtractionResult {
  const data = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    isActionItem: Boolean(data.isActionItem),
    taskOwner:
      data.taskOwner === "user" || data.taskOwner === "sender" || data.taskOwner === "unknown"
        ? data.taskOwner
        : "unknown",
    taskTitle:
      typeof data.taskTitle === "string" && data.taskTitle.trim()
        ? data.taskTitle.trim()
        : null,
    dueDate:
      typeof data.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)
        ? data.dueDate
        : null,
    dueTime:
      typeof data.dueTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(data.dueTime)
        ? data.dueTime
        : null,
    actionType:
      data.actionType === "create" ||
      data.actionType === "update" ||
      data.actionType === "complete" ||
      data.actionType === "postpone" ||
      data.actionType === "cancel" ||
      data.actionType === "none"
        ? data.actionType
        : "none",
    confidence:
      typeof data.confidence === "number" && Number.isFinite(data.confidence)
        ? Math.max(0, Math.min(1, data.confidence))
        : 0,
    missingInformation: Array.isArray(data.missingInformation)
      ? data.missingInformation.filter((item) => typeof item === "string")
      : [],
    reasonForClassification:
      typeof data.reasonForClassification === "string"
        ? data.reasonForClassification.trim()
        : "",
  };
}
