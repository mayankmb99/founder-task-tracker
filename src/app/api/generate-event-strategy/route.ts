import { NextRequest, NextResponse } from "next/server";
import {
  AudienceSegment,
  CompanyProfile,
  EventRecord,
  FounderProfile,
} from "@/lib/types";
import { eventStrategyToDb } from "@/lib/dbMappers";
import { buildPreparationContext } from "@/lib/ai/context/preparation";
import type { PreparationContext, RetrievalEvidence } from "@/lib/ai/context/types";
import { executeStructuredAI } from "@/lib/ai/runtime";
import { PREPARATION_SCHEMA, buildPreparationSystemPrompt, normalizePreparationStrategy, renderPreparationUserPrompt } from "@/lib/ai/prompts/preparation/base";
import { SALES_MEETING_GUIDANCE } from "@/lib/ai/prompts/preparation/salesMeeting";
import { INVESTOR_MEETING_GUIDANCE } from "@/lib/ai/prompts/preparation/investorMeeting";
import { PARTNERSHIP_MEETING_GUIDANCE } from "@/lib/ai/prompts/preparation/partnershipMeeting";
import { VENDOR_NEGOTIATION_GUIDANCE } from "@/lib/ai/prompts/preparation/vendorNegotiation";
import { CUSTOMER_CALL_GUIDANCE } from "@/lib/ai/prompts/preparation/customerCall";
import { STARTUP_EVENT_GUIDANCE } from "@/lib/ai/prompts/preparation/startupEvent";
import { CONFERENCE_GUIDANCE } from "@/lib/ai/prompts/preparation/conference";
import { OTHER_INTERACTION_GUIDANCE } from "@/lib/ai/prompts/preparation/other";
import { retrieveFileSearchEvidence } from "@/lib/ai/retrieval/fileSearch";
import { validatePreparationOutput } from "@/lib/ai/validation";
import { AIConfigurationError, AIGroundingError, AIRefusalError, AISchemaError, getErrorMessage, userFacingAIMessage } from "@/lib/ai/errors";
import { DEMO_USER_ID, supabaseServer } from "@/lib/supabaseServer";

function interactionGuidance(eventType: EventRecord["eventType"]): string {
  switch (eventType) {
    case "sales_meeting":
      return SALES_MEETING_GUIDANCE;
    case "investor_meeting":
      return INVESTOR_MEETING_GUIDANCE;
    case "partnership_meeting":
      return PARTNERSHIP_MEETING_GUIDANCE;
    case "vendor_negotiation":
      return VENDOR_NEGOTIATION_GUIDANCE;
    case "customer_call":
      return CUSTOMER_CALL_GUIDANCE;
    case "startup_event":
    case "startup_expo":
    case "hackathon":
      return STARTUP_EVENT_GUIDANCE;
    case "conference":
      return CONFERENCE_GUIDANCE;
    case "other":
    default:
      return OTHER_INTERACTION_GUIDANCE;
  }
}

function groundingRepairNote(): string {
  return [
    "Grounding repair instructions:",
    "- The previous attempt included unsupported or invented facts.",
    "- Use only facts explicitly present in CONFIRMED FACTS and USER-SUPPLIED INFORMATION.",
    "- Do not mention customer counts, revenue, funding, market size, or case-study outcomes unless they appear verbatim in the supplied facts.",
    "- If traction, customers, or proof points are missing, keep proofPointsToUse limited to supplied evidence, and put the gap in missingInformation.",
    "- Rephrase any unsupported claim as a missing-information item or as a recommendation, not as a fact.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const founderProfile: FounderProfile | undefined = body?.founderProfile;
  const companyProfile: CompanyProfile | undefined = body?.companyProfile;
  const audienceSegment: AudienceSegment | null = body?.audienceSegment ?? null;
  const event: EventRecord | undefined = body?.event;
  let retrieval:
    | {
        status: "not_configured" | "configured" | "no_results" | "results" | "failed";
        evidence: RetrievalEvidence[];
      }
    | null = null;
  let context: PreparationContext | null = null;

  if (!founderProfile || !companyProfile || !event) {
    return NextResponse.json(
      { error: "Request body must include founderProfile, companyProfile, and event." },
      { status: 400 }
    );
  }

  try {
    const retrievalQuery = [
      event.eventName,
      event.eventType,
      event.userGoal,
      event.additionalContext,
      event.targets.map((target) => `${target.personName} ${target.role} ${target.companyName}`).join(" "),
    ]
      .filter(Boolean)
      .join(" ");

    retrieval = await retrieveFileSearchEvidence({
      query: retrievalQuery,
      maxResults: 3,
    }).catch((error) => {
      console.error("preparation retrieval failed:", error);
      return { status: "failed" as const, evidence: [] };
    });

    context = buildPreparationContext({
      founder: founderProfile,
      company: companyProfile,
      audience: audienceSegment,
      event,
      retrievalStatus: retrieval!.status,
      retrievalEvidence: retrieval!.evidence,
    });

    const prompt = buildPreparationSystemPrompt(interactionGuidance(event.eventType));
    const userPrompt = renderPreparationUserPrompt(context);

    const execution = await executeStructuredAI({
      workflow: "preparationStrategy",
      interactionType: event.eventType,
      schemaName: "event_strategy",
      schema: PREPARATION_SCHEMA,
      systemPrompt: prompt,
      userPrompt,
      parseRaw: normalizePreparationStrategy,
      validate: (result) => validatePreparationOutput(result, context!),
      retrievalEnabled: retrieval.status !== "not_configured",
      retrievalResultCount: retrieval.evidence.length,
    });

    let persisted = true;
    try {
      await supabaseServer
        .from("event_strategies")
        .delete()
        .eq("user_id", DEMO_USER_ID)
        .eq("event_id", event.id);

      const { error: insertError } = await supabaseServer
        .from("event_strategies")
        .insert({
          user_id: DEMO_USER_ID,
          event_id: event.id,
          ...eventStrategyToDb(execution.result),
        });
      if (insertError) throw insertError;
    } catch (persistError) {
      console.error("generate-event-strategy: failed to persist strategy:", persistError);
      persisted = false;
    }

    return NextResponse.json({
      result: execution.result,
      persisted,
      model: execution.model,
      groundingWarnings: execution.grounding.warnings,
      retrievalStatus: retrieval!.status,
      retrievalCount: retrieval!.evidence.length,
    });
  } catch (error) {
    if (error instanceof AIGroundingError) {
      try {
        if (!retrieval || !context) {
          throw error;
        }
        const repairExecution = await executeStructuredAI({
          workflow: "preparationStrategy",
          interactionType: event.eventType,
          schemaName: "event_strategy",
          schema: PREPARATION_SCHEMA,
          systemPrompt: `${buildPreparationSystemPrompt(interactionGuidance(event.eventType))}\n\n${groundingRepairNote()}`,
          userPrompt: `${renderPreparationUserPrompt(context)}\n\n${groundingRepairNote()}`,
          parseRaw: normalizePreparationStrategy,
          validate: (result) => validatePreparationOutput(result, context!),
          retrievalEnabled: retrieval!.status !== "not_configured",
          retrievalResultCount: retrieval!.evidence.length,
        });

        let persisted = true;
        try {
          await supabaseServer
            .from("event_strategies")
            .delete()
            .eq("user_id", DEMO_USER_ID)
            .eq("event_id", event.id);

          const { error: insertError } = await supabaseServer
            .from("event_strategies")
            .insert({
              user_id: DEMO_USER_ID,
              event_id: event.id,
              ...eventStrategyToDb(repairExecution.result),
            });
          if (insertError) throw insertError;
        } catch (persistError) {
          console.error("generate-event-strategy: failed to persist repaired strategy:", persistError);
          persisted = false;
        }

        return NextResponse.json({
          result: repairExecution.result,
          persisted,
          model: repairExecution.model,
          groundingWarnings: repairExecution.grounding.warnings,
          retrievalStatus: retrieval.status,
          retrievalCount: retrieval.evidence.length,
          repaired: true,
        });
      } catch (repairError) {
        console.error("generate-event-strategy repair failed:", repairError);
        error = repairError;
      }
    }
    console.error("generate-event-strategy failed:", error);
    const messageText = userFacingAIMessage(error, "Failed to generate preparation strategy.");
    const status =
      error instanceof AISchemaError ? 500 :
      error instanceof AIRefusalError ? 422 :
      error instanceof AIGroundingError ? 422 :
      error instanceof AIConfigurationError ? 500 :
      500;
    return NextResponse.json(
      {
        error: messageText,
        category: error instanceof Error && "category" in error ? String((error as { category?: string }).category ?? "unexpected") : "unexpected",
        ...(process.env.NODE_ENV !== "production" && error instanceof Error ? { detail: getErrorMessage(error) } : {}),
      },
      { status }
    );
  }
}
