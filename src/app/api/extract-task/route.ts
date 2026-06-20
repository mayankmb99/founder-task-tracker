import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// This route runs only on the server. The OpenAI API key is read from
// process.env here and is never sent to or bundled into client-side code.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    is_action_item: {
      type: "boolean",
      description: "True only if the message describes a real, not-yet-done task.",
    },
    task_owner: {
      type: "string",
      enum: ["user", "sender", "unknown"],
      description: "Who is responsible for doing the task.",
    },
    task_title: {
      type: ["string", "null"],
      description: "Short title of the task, or null if there is no task.",
    },
    due_date: {
      type: ["string", "null"],
      description: "Date in YYYY-MM-DD format, or null if no date was stated or clearly implied.",
    },
    due_time: {
      type: ["string", "null"],
      description: "Time in 24-hour HH:MM format, or null if no time was stated or clearly implied.",
    },
    action_type: {
      type: "string",
      enum: ["create", "update", "complete", "postpone", "cancel", "none"],
    },
    confidence: {
      type: "number",
      description: "0 to 1 confidence that is_action_item and the extracted fields are correct.",
    },
    missing_information: {
      type: "array",
      items: { type: "string" },
      description: "List of fields that are missing or unclear, e.g. 'due_date', 'due_time'.",
    },
    reason_for_classification: {
      type: "string",
      description: "One short sentence explaining the classification.",
    },
  },
  required: [
    "is_action_item",
    "task_owner",
    "task_title",
    "due_date",
    "due_time",
    "action_type",
    "confidence",
    "missing_information",
    "reason_for_classification",
  ],
  additionalProperties: false,
} as const;

function todayInKolkata(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const SYSTEM_PROMPT = `You extract a possible task from a single message sent to or from the user.

Today's date is ${todayInKolkata()} and the timezone is Asia/Kolkata. Use this only to resolve relative dates like "tomorrow" or "next week" into an actual YYYY-MM-DD date.

Rules you must follow exactly:
- Never invent a date. If the message does not state or clearly imply a specific date, set due_date to null.
- Never invent a time. If the message does not state or clearly imply a specific time, set due_time to null.
- Return null for any field where the information is missing, instead of guessing.
- Distinguish whose task it is: "user" if the message author (the person whose inbox this is) must do it, "sender" if the other person must do it, "unknown" if unclear.
- Do not treat something already done or completed as a new task (e.g. "I already sent it" is not an action item).
- Treat vague possibilities, maybes, or hypotheticals as low confidence (below 0.5), and if too vague, is_action_item should be false.
- A statement of opinion or status with no future action (e.g. "the proposal looks good") is not an action item.
- List every field you could not confidently determine in missing_information.`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const message: string | undefined = body?.message;

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "Request body must include a non-empty 'message' string." },
      { status: 400 }
    );
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "task_extraction",
          schema: EXTRACTION_SCHEMA,
          strict: true,
        },
      },
    });

    const result = JSON.parse(response.output_text);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("extract-task failed:", error);
    return NextResponse.json(
      { error: "Failed to extract task from message." },
      { status: 500 }
    );
  }
}
