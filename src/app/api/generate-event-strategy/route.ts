import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import {
  AudienceSegment,
  CompanyProfile,
  EventRecord,
  FounderProfile,
} from "@/lib/types";

// Server-side only. The API key never reaches the browser — this route
// is the only place that reads process.env.OPENAI_API_KEY.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PERSON_SCHEMA = {
  type: "object",
  properties: {
    person_name: { type: "string" },
    reason: {
      type: "string",
      description: "Why this specific person is worth prioritising at this event.",
    },
    pitch_angle: {
      type: "string",
      description: "How to angle the company pitch specifically for this person's role and situation — what to emphasise for them versus other targets, grounded only in supplied facts. Must differ meaningfully between people with different roles.",
    },
  },
  required: ["person_name", "reason", "pitch_angle"],
  additionalProperties: false,
} as const;

const STRATEGY_SCHEMA = {
  type: "object",
  properties: {
    positioning_summary: {
      type: "string",
      description: "How the founder should position themselves and the company at this specific event, grounded only in the supplied facts.",
    },
    founder_introduction: {
      type: "string",
      description: "A short self-introduction the founder can say, built only from their real background and achievements.",
    },
    company_pitch: {
      type: "string",
      description: "A short company pitch connecting the real value proposition to this event's audience, built only from supplied facts.",
    },
    people_to_prioritise: {
      type: "array",
      items: PERSON_SCHEMA,
      description: "Which of the supplied target people/companies to prioritise, and why, based only on the facts given about them.",
    },
    proof_points_to_use: {
      type: "array",
      items: { type: "string" },
      description: "Which of the supplied proof points / case studies / traction items are most relevant here. Must only restate proof points that were actually supplied.",
    },
    questions_to_ask: {
      type: "array",
      items: { type: "string" },
    },
    talking_points: {
      type: "array",
      items: { type: "string" },
    },
    conversation_goals: {
      type: "array",
      items: { type: "string" },
    },
    preparation_items: {
      type: "array",
      items: { type: "string" },
      description: "Concrete things the founder should prepare before the event.",
    },
    follow_up_actions: {
      type: "array",
      items: { type: "string" },
      description: "Concrete things to do after the event.",
    },
    risks: {
      type: "array",
      items: { type: "string" },
      description: "Risks or weak spots in this plan, including any caused by missing information.",
    },
    missing_information: {
      type: "array",
      items: { type: "string" },
      description: "Specific facts that were not supplied and would have improved this strategy (e.g. a target person's exact pain point, an investor's check size).",
    },
    confidence: {
      type: "number",
      description: "0 to 1 confidence in the overall strategy given how complete the supplied information was.",
    },
  },
  required: [
    "positioning_summary",
    "founder_introduction",
    "company_pitch",
    "people_to_prioritise",
    "proof_points_to_use",
    "questions_to_ask",
    "talking_points",
    "conversation_goals",
    "preparation_items",
    "follow_up_actions",
    "risks",
    "missing_information",
    "confidence",
  ],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are an event-preparation copilot for a startup founder. You will be given long-term context about the founder, their company, and a target audience, plus the details of one specific upcoming event and the people/companies they may meet there.

Everything under "KNOWN FACTS" below is real, supplied information. Everything else you produce is a recommendation built on top of those facts.

Rules you must follow exactly:
- Never invent customers, traction numbers, achievements, attendee facts, or company information that was not supplied. If you don't have a fact, do not make one up.
- Only reference proof points, case studies, customers, or achievements that literally appear in the supplied KNOWN FACTS.
- Personalise the founder_introduction and positioning using the founder's actual stated experience, strengths, and achievements — not generic founder language.
- Connect the company's actual value proposition to each target person's likely needs, using only what was supplied about them (role, company, known needs, relevance reason). If a target has no known needs supplied, say so rather than guessing their needs.
- For every person in people_to_prioritise, explain why they specifically matter, referencing only supplied facts about them.
- Give each person in people_to_prioritise a distinct pitch_angle tailored to their role and situation. Do not reuse the same angle wording across people with clearly different roles (e.g. an accelerator lead, a SaaS founder, and an enterprise manager should each get a different emphasis).
- If information needed for a good recommendation is missing (e.g. no known needs for a target, no audience segment provided, thin company traction), list it in missing_information instead of filling the gap with a guess.
- Keep talking_points, questions_to_ask, and preparation_items concrete and specific to this event, not generic advice.
- confidence should reflect how complete the supplied context was, not just how confident you sound.`;

function formatList(items: string[] | undefined, label: string): string {
  if (!items || items.length === 0) return `${label}: (none supplied)`;
  return `${label}:\n${items.map((i) => `  - ${i}`).join("\n")}`;
}

function buildPrompt(
  founder: FounderProfile,
  company: CompanyProfile,
  audience: AudienceSegment | null,
  event: EventRecord
): string {
  const founderBlock = `FOUNDER (known facts):
Name: ${founder.founderName}
Role: ${founder.role}
Professional summary: ${founder.professionalSummary}
${formatList(founder.relevantExperience, "Relevant experience")}
${formatList(founder.strengths, "Strengths")}
${formatList(founder.achievements, "Achievements")}
Preferred communication style: ${founder.communicationStyle}`;

  const companyBlock = `COMPANY (known facts):
Name: ${company.companyName}
Description: ${company.companyDescription}
Product/service: ${company.productOrService}
Problem solved: ${company.problemSolved}
Value proposition: ${company.valueProposition}
${formatList(company.differentiation, "Differentiation")}
${formatList(company.traction, "Traction")}
${formatList(company.customers, "Customers")}
${formatList(company.proofPoints, "Proof points")}
${formatList(company.caseStudies, "Case studies")}`;

  const audienceBlock = audience
    ? `TARGET AUDIENCE SEGMENT "${audience.name}" (known facts):
${formatList(audience.roles, "Roles")}
${formatList(audience.companyTypes, "Company types")}
${formatList(audience.problems, "Problems")}
${formatList(audience.needs, "Needs")}
${formatList(audience.objections, "Objections")}
${formatList(audience.desiredOutcomes, "Desired outcomes")}`
    : `TARGET AUDIENCE SEGMENT: (none supplied — treat audience needs as missing information)`;

  const targetsBlock = event.targets.length
    ? event.targets
        .map(
          (t, i) => `Target ${i + 1}: ${t.personName} — ${t.role} at ${t.companyName}
  Company description: ${t.companyDescription || "(not supplied)"}
  ${formatList(t.knownNeeds, "  Known needs")}
  Relevance reason supplied by user: ${t.relevanceReason || "(not supplied)"}
  Priority: ${t.priority}`
        )
        .join("\n\n")
    : "(no target people or companies supplied)";

  const eventBlock = `EVENT (known facts):
Name: ${event.eventName}
Type: ${event.eventType}
Description: ${event.eventDescription}
Date: ${event.eventStart}
Location: ${event.eventLocation}
User's goal for this event: ${event.userGoal}
Additional context: ${event.additionalContext || "(none supplied)"}

TARGET PEOPLE / COMPANIES AT THIS EVENT (known facts):
${targetsBlock}`;

  return `${founderBlock}\n\n${companyBlock}\n\n${audienceBlock}\n\n${eventBlock}`;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const founderProfile: FounderProfile | undefined = body?.founderProfile;
  const companyProfile: CompanyProfile | undefined = body?.companyProfile;
  const audienceSegment: AudienceSegment | null = body?.audienceSegment ?? null;
  const event: EventRecord | undefined = body?.event;

  if (!founderProfile || !companyProfile || !event) {
    return NextResponse.json(
      { error: "Request body must include founderProfile, companyProfile, and event." },
      { status: 400 }
    );
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildPrompt(founderProfile, companyProfile, audienceSegment, event),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "event_strategy",
          schema: STRATEGY_SCHEMA,
          strict: true,
        },
      },
    });

    const raw = JSON.parse(response.output_text);

    // Map the AI's snake_case output (matching the event_strategies table
    // columns) to the app's camelCase EventStrategy type.
    const result = {
      positioningSummary: raw.positioning_summary,
      founderIntroduction: raw.founder_introduction,
      companyPitch: raw.company_pitch,
      peopleToPrioritise: (raw.people_to_prioritise ?? []).map(
        (p: { person_name: string; reason: string; pitch_angle: string }) => ({
          personName: p.person_name,
          reason: p.reason,
          pitchAngle: p.pitch_angle,
        })
      ),
      proofPointsToUse: raw.proof_points_to_use ?? [],
      questionsToAsk: raw.questions_to_ask ?? [],
      talkingPoints: raw.talking_points ?? [],
      conversationGoals: raw.conversation_goals ?? [],
      preparationItems: raw.preparation_items ?? [],
      followUpActions: raw.follow_up_actions ?? [],
      risks: raw.risks ?? [],
      missingInformation: raw.missing_information ?? [],
      confidence: raw.confidence,
    };

    // Persist the strategy, replacing any previous strategy for this
    // event so there is never more than one stored row per event (the
    // most recent generation wins). If persistence fails, the
    // generated content is still returned to the browser below — the
    // user sees the result even though it wasn't saved, and a retry of
    // "Generate Event Strategy" will attempt to save again.
    let persisted = true;
    try {
      const { DEMO_USER_ID, supabaseServer } = await import("@/lib/supabaseServer");
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
          positioning_summary: raw.positioning_summary,
          founder_introduction: raw.founder_introduction,
          company_pitch: raw.company_pitch,
          people_to_prioritise: raw.people_to_prioritise ?? [],
          proof_points_to_use: raw.proof_points_to_use ?? [],
          questions_to_ask: raw.questions_to_ask ?? [],
          talking_points: raw.talking_points ?? [],
          conversation_goals: raw.conversation_goals ?? [],
          preparation_items: raw.preparation_items ?? [],
          follow_up_actions: raw.follow_up_actions ?? [],
          risks: raw.risks ?? [],
          missing_information: raw.missing_information ?? [],
          confidence: raw.confidence,
        });
      if (insertError) throw insertError;
    } catch (persistError) {
      console.error("generate-event-strategy: failed to persist strategy:", persistError);
      persisted = false;
    }

    return NextResponse.json({ result, persisted });
  } catch (error) {
    console.error("generate-event-strategy failed:", error);
    return NextResponse.json(
      { error: "Failed to generate event strategy." },
      { status: 500 }
    );
  }
}
