import type { PreparationContext } from "../../context/types";
import { SHARED_GROUNDING_RULES, SHARED_OUTPUT_RULES } from "../sharedRules";
import type { EventStrategy } from "@/lib/types";

const PERSON_SCHEMA = {
  type: "object",
  properties: {
    personName: {
      type: "string",
      description: "The exact supplied person or organisation name only; do not append role or company text.",
    },
    reason: {
      type: "string",
      description: "Why this specific person or organisation is worth prioritising for this interaction.",
    },
    pitchAngle: {
      type: "string",
      description: "How to angle the company pitch specifically for this person's role and situation — what to emphasise for them versus other targets, grounded only in supplied facts.",
    },
  },
  required: ["personName", "reason", "pitchAngle"],
  additionalProperties: false,
} as const;

export const PREPARATION_SCHEMA = {
  type: "object",
  properties: {
    positioningSummary: {
      type: "string",
      description: "How the founder should position themselves and the company at this specific interaction, grounded only in the supplied facts.",
    },
    founderIntroduction: {
      type: "string",
      description: "A short self-introduction the founder can say, built only from their real background and achievements.",
    },
    companyPitch: {
      type: "string",
      description: "A short company pitch connecting the real value proposition to this interaction, built only from supplied facts.",
    },
    peopleToPrioritise: {
      type: "array",
      items: PERSON_SCHEMA,
      description: "Which of the supplied target people/companies to prioritise, and why, based only on the facts given about them.",
    },
    proofPointsToUse: {
      type: "array",
      items: { type: "string" },
      description: "Which of the supplied proof points / case studies / traction items are most relevant here. Must only restate proof points that were actually supplied.",
    },
    questionsToAsk: {
      type: "array",
      items: { type: "string" },
    },
    talkingPoints: {
      type: "array",
      items: { type: "string" },
    },
    conversationGoals: {
      type: "array",
      items: { type: "string" },
    },
    preparationItems: {
      type: "array",
      items: { type: "string" },
      description: "Concrete things the founder should prepare before the interaction.",
    },
    followUpActions: {
      type: "array",
      items: { type: "string" },
      description: "Concrete things to do after the interaction.",
    },
    risks: {
      type: "array",
      items: { type: "string" },
      description: "Risks or weak spots in this plan, including any caused by missing information.",
    },
    missingInformation: {
      type: "array",
      items: { type: "string" },
      description: "Specific facts that were not supplied and would have improved this strategy.",
    },
    confidence: {
      type: "number",
      description: "0 to 1 confidence in the overall strategy given how complete the supplied information was.",
    },
  },
  required: [
    "positioningSummary",
    "founderIntroduction",
    "companyPitch",
    "peopleToPrioritise",
    "proofPointsToUse",
    "questionsToAsk",
    "talkingPoints",
    "conversationGoals",
    "preparationItems",
    "followUpActions",
    "risks",
    "missingInformation",
    "confidence",
  ],
  additionalProperties: false,
} as const;

export function buildPreparationSystemPrompt(guidance: string): string {
  return [
    "You are a meeting-and-event preparation copilot for a startup founder.",
    "You will receive founder, company, audience, interaction, target, and optional evidence context.",
    "",
    "Shared grounding rules:",
    SHARED_GROUNDING_RULES,
    "",
    "Shared output rules:",
    SHARED_OUTPUT_RULES,
    "",
    "Preparation strategy rules:",
    "- Never invent customers, traction numbers, achievements, attendee facts, or company information that was not supplied.",
    "- Only reference proof points, case studies, customers, or achievements that literally appear in the supplied confirmed facts.",
    "- Personalise the founderIntroduction and positioning using the founder's actual stated experience, strengths, and achievements.",
    "- Connect the company's actual value proposition to each target person's likely needs, using only what was supplied about them.",
    "- For every person in peopleToPrioritise, explain why they specifically matter, referencing only supplied facts about them.",
    "- Copy personName exactly from the supplied target name. Do not append a role, company, or explanation to it.",
    "- Give each person in peopleToPrioritise a distinct pitchAngle tailored to their role and situation.",
    "- If information needed for a good recommendation is missing, list it in missingInformation instead of filling the gap with a guess.",
    "- Keep talkingPoints, questionsToAsk, and preparationItems concrete and specific to this interaction, not generic advice.",
    "- Clearly separate known facts from recommendations. Describe inferred needs only as likely or possible, never confirmed.",
    "- Use language such as 'likely', 'possible', or 'recommended' when making an inference.",
    "- confidence should reflect how complete the supplied context was.",
    "",
    "Interaction-specific instructions:",
    guidance,
  ].join("\n");
}

export function renderPreparationUserPrompt(context: PreparationContext): string {
  return [
    "CONFIRMED FACTS",
    ...context.confirmedFacts.map((fact) => `- ${fact}`),
    "",
    "USER-SUPPLIED INFORMATION",
    ...context.userSuppliedInformation.map((fact) => `- ${fact}`),
    "",
    "MISSING INFORMATION",
    ...(context.missingInformation.length ? context.missingInformation.map((item) => `- ${item}`) : ["- (none noted)"]),
    "",
    "OTHER PARTIES",
    ...(context.targets.length
      ? context.targets.flatMap((target, index) => [
          `Target ${index + 1}: ${target.personName}`,
          `Role: ${target.role}`,
          `Company: ${target.companyName}`,
          `Company description: ${target.companyDescription || "(not supplied)"}`,
          `Known needs: ${target.knownNeeds.length ? target.knownNeeds.join("; ") : "(not supplied)"}`,
          `Relevance reason: ${target.relevanceReason || "(not supplied)"}`,
          `Priority: ${target.priority}`,
          `Relationship status: ${target.status}`,
          "",
        ])
      : ["(no targets supplied)"]),
    "",
    "RETRIEVED EVIDENCE",
    ...(context.retrievalEvidence.length
      ? context.retrievalEvidence.flatMap((item) => [
          `Evidence: ${item.title}`,
          `Source: ${item.source}`,
          `Excerpt: ${item.excerpt}`,
          "",
        ])
      : [context.retrievalStatus === "no_results" ? "No relevant retrieved evidence found." : "Document retrieval not configured."]),
    "",
    "GENERATION OBJECTIVE",
    context.generationObjective,
    "",
    "SOURCE TASK CONTEXT",
    ...(context.sourceTaskContext.length ? context.sourceTaskContext.map((item) => `- ${item}`) : ["- (none supplied)"]),
  ].join("\n");
}

export function normalizePreparationStrategy(raw: unknown): EventStrategy {
  const data = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    positioningSummary: typeof data.positioningSummary === "string" ? data.positioningSummary : "",
    founderIntroduction: typeof data.founderIntroduction === "string" ? data.founderIntroduction : "",
    companyPitch: typeof data.companyPitch === "string" ? data.companyPitch : "",
    peopleToPrioritise: Array.isArray(data.peopleToPrioritise)
      ? data.peopleToPrioritise
          .filter((item) => typeof item === "object" && item !== null)
          .map((item) => {
            const person = item as Record<string, unknown>;
            return {
              personName: typeof person.personName === "string" ? person.personName.trim() : "",
              reason: typeof person.reason === "string" ? person.reason.trim() : "",
              pitchAngle: typeof person.pitchAngle === "string" ? person.pitchAngle.trim() : "",
            };
          })
      : [],
    proofPointsToUse: Array.isArray(data.proofPointsToUse)
      ? data.proofPointsToUse.filter((item) => typeof item === "string")
      : [],
    questionsToAsk: Array.isArray(data.questionsToAsk)
      ? data.questionsToAsk.filter((item) => typeof item === "string")
      : [],
    talkingPoints: Array.isArray(data.talkingPoints)
      ? data.talkingPoints.filter((item) => typeof item === "string")
      : [],
    conversationGoals: Array.isArray(data.conversationGoals)
      ? data.conversationGoals.filter((item) => typeof item === "string")
      : [],
    preparationItems: Array.isArray(data.preparationItems)
      ? data.preparationItems.filter((item) => typeof item === "string")
      : [],
    followUpActions: Array.isArray(data.followUpActions)
      ? data.followUpActions.filter((item) => typeof item === "string")
      : [],
    risks: Array.isArray(data.risks)
      ? data.risks.filter((item) => typeof item === "string")
      : [],
    missingInformation: Array.isArray(data.missingInformation)
      ? data.missingInformation.filter((item) => typeof item === "string")
      : [],
    confidence:
      typeof data.confidence === "number" && Number.isFinite(data.confidence)
        ? Math.max(0, Math.min(1, data.confidence))
        : 0,
  };
}
