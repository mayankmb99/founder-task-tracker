import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";
import { ExtractionResult } from "@/lib/types";
import { buildTaskExtractionContext } from "@/lib/ai/context/taskExtraction";
import { executeStructuredAI } from "@/lib/ai/runtime";
import { TASK_EXTRACTION_SCHEMA, buildTaskExtractionPrompt, normalizeTaskExtraction } from "@/lib/ai/prompts/taskExtraction";
import { validateTaskExtractionOutput } from "@/lib/ai/validation";
import { AIGroundingError, AIRefusalError, AISchemaError, userFacingAIMessage } from "@/lib/ai/errors";

function mapToDb(result: ExtractionResult, originalMessage: string) {
  return {
    user_id: DEMO_USER_ID,
    source_message_record_id: null,
    is_action_item: result.isActionItem,
    task_owner: result.taskOwner,
    task_title: result.taskTitle,
    due_date: result.dueDate,
    due_time: result.dueTime,
    action_type: result.actionType,
    confidence: result.confidence,
    original_message: originalMessage.trim(),
    missing_information: result.missingInformation,
    reason_for_classification: result.reasonForClassification,
    status: "pending" as const,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message: string | undefined = body?.message;
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "Request body must include a non-empty 'message' string." },
      { status: 400 }
    );
  }

  const sourceType =
    typeof body?.sourceType === "string" &&
    ["manual", "gmail", "whatsapp", "calendar"].includes(body.sourceType.toLowerCase())
      ? (body.sourceType.toLowerCase() as "manual" | "gmail" | "whatsapp" | "calendar")
      : "manual";

  const context = buildTaskExtractionContext({
    sourceText: message,
    sourceType,
    receivedAt: typeof body?.receivedAt === "string" ? body.receivedAt : null,
    currentDate: typeof body?.currentDate === "string" ? body.currentDate : undefined,
    userTimezone: typeof body?.userTimezone === "string" ? body.userTimezone : undefined,
  });
  const prompt = buildTaskExtractionPrompt(context);

  try {
    const execution = await executeStructuredAI({
      workflow: "taskExtraction",
      interactionType: context.sourceType,
      schemaName: "task_extraction",
      schema: TASK_EXTRACTION_SCHEMA,
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      parseRaw: normalizeTaskExtraction,
      validate: (result) => validateTaskExtractionOutput(result, context),
      retrievalEnabled: false,
      retrievalResultCount: 0,
    });

    const { data: suggestion, error } = await supabaseServer
      .from("task_suggestions")
      .insert(mapToDb(execution.result, message))
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      result: execution.result,
      suggestionId: suggestion.id,
      groundingWarnings: execution.grounding.warnings,
      model: execution.model,
    });
  } catch (error) {
    console.error("extract-task failed:", error);
    const messageText = userFacingAIMessage(error, "Failed to extract task from message.");
    const status =
      error instanceof AISchemaError ? 500 :
      error instanceof AIRefusalError ? 422 :
      error instanceof AIGroundingError ? 422 :
      500;
    return NextResponse.json(
      {
        error: messageText,
        category: error instanceof Error && "category" in error ? String((error as { category?: string }).category ?? "unexpected") : "unexpected",
      },
      { status }
    );
  }
}
