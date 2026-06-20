import type { AudienceSegment, CompanyProfile, EventRecord, FounderProfile } from "@/lib/types";
import { PREPARATION_CONTEXT_LIMITS } from "./limits";
import type { PreparationContext, PreparationTargetContext, RetrievalEvidence, RetrievalStatus } from "./types";

function trimNonEmpty(value: string | null | undefined): string {
  return value?.trim() || "";
}

function listLines(label: string, items: string[] | undefined, limit: number): string[] {
  const clean = (items ?? []).map((item) => item.trim()).filter(Boolean);
  return clean.slice(0, limit).map((item) => `${label}: ${item}`);
}

function summarizeTarget(target: PreparationTargetContext): string[] {
  return [
    `Target: ${target.personName}`,
    `Role: ${target.role}`,
    `Company: ${target.companyName}`,
    target.companyDescription ? `Company description: ${target.companyDescription}` : "",
    target.knownNeeds.length ? `Known needs: ${target.knownNeeds.join("; ")}` : "Known needs: (not supplied)",
    target.relevanceReason ? `Relevance: ${target.relevanceReason}` : "Relevance: (not supplied)",
    `Priority: ${target.priority}`,
    `Relationship status: ${target.status}`,
  ].filter(Boolean);
}

function toAudienceFacts(audience: AudienceSegment | null): string[] {
  if (!audience) return [];
  return [
    `Audience segment: ${audience.name}`,
    ...listLines("Role", audience.roles, PREPARATION_CONTEXT_LIMITS.maxAudienceFacts),
    ...listLines("Company type", audience.companyTypes, PREPARATION_CONTEXT_LIMITS.maxAudienceFacts),
    ...listLines("Problem", audience.problems, PREPARATION_CONTEXT_LIMITS.maxAudienceFacts),
    ...listLines("Need", audience.needs, PREPARATION_CONTEXT_LIMITS.maxAudienceFacts),
    ...listLines("Objection", audience.objections, PREPARATION_CONTEXT_LIMITS.maxAudienceFacts),
    ...listLines("Desired outcome", audience.desiredOutcomes, PREPARATION_CONTEXT_LIMITS.maxAudienceFacts),
  ].filter(Boolean);
}

export function buildPreparationContext(input: {
  founder: FounderProfile;
  company: CompanyProfile;
  audience: AudienceSegment | null;
  event: EventRecord;
  retrievalEvidence?: RetrievalEvidence[];
  retrievalStatus?: RetrievalStatus;
  sourceTaskContext?: string[];
}): PreparationContext {
  const companyDifferentiation = input.company.differentiation ?? [];
  const companyTraction = input.company.traction ?? [];
  const companyCustomers = input.company.customers ?? [];
  const companyProofPoints = input.company.proofPoints ?? [];
  const companyCaseStudies = input.company.caseStudies ?? [];

  const founderFacts = [
    `Founder: ${trimNonEmpty(input.founder.founderName) || "(not supplied)"}`,
    `Role: ${trimNonEmpty(input.founder.role) || "(not supplied)"}`,
    `Professional summary: ${trimNonEmpty(input.founder.professionalSummary) || "(not supplied)"}`,
    ...listLines("Relevant experience", input.founder.relevantExperience, PREPARATION_CONTEXT_LIMITS.maxFounderFacts),
    ...listLines("Strength", input.founder.strengths, PREPARATION_CONTEXT_LIMITS.maxFounderFacts),
    ...listLines("Achievement", input.founder.achievements, PREPARATION_CONTEXT_LIMITS.maxFounderFacts),
    input.founder.communicationStyle ? `Communication style: ${input.founder.communicationStyle}` : "",
  ].filter(Boolean);

  const companyFacts = [
    `Company: ${trimNonEmpty(input.company.companyName) || "(not supplied)"}`,
    `Description: ${trimNonEmpty(input.company.companyDescription) || "(not supplied)"}`,
    `Product/service: ${trimNonEmpty(input.company.productOrService) || "(not supplied)"}`,
    `Problem solved: ${trimNonEmpty(input.company.problemSolved) || "(not supplied)"}`,
    `Value proposition: ${trimNonEmpty(input.company.valueProposition) || "(not supplied)"}`,
    ...(companyDifferentiation.length
      ? listLines("Differentiation", companyDifferentiation, PREPARATION_CONTEXT_LIMITS.maxCompanyFacts)
      : ["Differentiation: (not supplied)"]),
    ...(companyTraction.length
      ? listLines("Traction", companyTraction, PREPARATION_CONTEXT_LIMITS.maxCompanyFacts)
      : ["Traction: (not supplied)"]),
    ...(companyCustomers.length
      ? listLines("Customer", companyCustomers, PREPARATION_CONTEXT_LIMITS.maxCompanyFacts)
      : ["Customer: (not supplied)"]),
    ...(companyProofPoints.length
      ? listLines("Proof point", companyProofPoints, PREPARATION_CONTEXT_LIMITS.maxCompanyFacts)
      : ["Proof point: (not supplied)"]),
    ...(companyCaseStudies.length
      ? listLines("Case study", companyCaseStudies, PREPARATION_CONTEXT_LIMITS.maxCompanyFacts)
      : ["Case study: (not supplied)"]),
  ].filter(Boolean);

  const audienceFacts = toAudienceFacts(input.audience);

  const targets = input.event.targets.slice(0, PREPARATION_CONTEXT_LIMITS.maxTargets).map(
    (target) =>
      ({
        personName: target.personName,
        role: target.role,
        companyName: target.companyName,
        companyDescription: target.companyDescription,
        knownNeeds: target.knownNeeds,
        relevanceReason: target.relevanceReason,
        priority: target.priority,
        status: target.status,
      }) satisfies PreparationTargetContext
  );

  const targetFacts = targets.flatMap(summarizeTarget);

  const confirmedFacts = [
    ...founderFacts,
    ...companyFacts,
    ...audienceFacts,
    `Interaction type: ${input.event.eventType}`,
    `Interaction name: ${input.event.eventName}`,
    `Interaction description: ${trimNonEmpty(input.event.eventDescription) || "(not supplied)"}`,
    `Interaction start: ${trimNonEmpty(input.event.eventStart) || "(not supplied)"}`,
    `Interaction location: ${trimNonEmpty(input.event.eventLocation) || "(not supplied)"}`,
    `Desired outcome: ${trimNonEmpty(input.event.userGoal) || "(not supplied)"}`,
    `Additional context: ${trimNonEmpty(input.event.additionalContext) || "(not supplied)"}`,
    ...targetFacts,
    ...(input.sourceTaskContext ?? []).map((item) => `Source task context: ${item}`),
  ];

  const missingInformation = [
    !trimNonEmpty(input.event.eventStart) ? "interactionStart" : "",
    !trimNonEmpty(input.event.userGoal) ? "desiredOutcome" : "",
    input.event.targets.length === 0 ? "targets" : "",
    !input.audience ? "audienceSegment" : "",
    !companyTraction.length ? "companyTraction" : "",
    !companyCustomers.length ? "companyCustomers" : "",
    !companyProofPoints.length ? "companyProofPoints" : "",
    !companyCaseStudies.length ? "companyCaseStudies" : "",
  ].filter(Boolean);

  const retrievalStatus = input.retrievalStatus ?? "not_configured";
  const retrievalEvidence = input.retrievalEvidence ?? [];

  return {
    currentDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
    userTimezone: "Asia/Kolkata",
    interactionType: input.event.eventType,
    interactionName: input.event.eventName,
    interactionDescription: trimNonEmpty(input.event.eventDescription),
    interactionStart: trimNonEmpty(input.event.eventStart),
    interactionLocation: trimNonEmpty(input.event.eventLocation),
    desiredOutcome: trimNonEmpty(input.event.userGoal),
    additionalContext: trimNonEmpty(input.event.additionalContext),
    founderFacts,
    companyFacts,
    audienceFacts,
    targets,
    confirmedFacts,
    userSuppliedInformation: [
      `Event name: ${input.event.eventName}`,
      `Desired outcome: ${input.event.userGoal}`,
      `Event type: ${input.event.eventType}`,
      ...targets.map((target) => `Target: ${target.personName} at ${target.companyName}`),
    ],
    missingInformation,
    generationObjective: `Generate a grounded ${input.event.eventType} preparation strategy for ${input.event.eventName}.`,
    sourceTaskContext: (input.sourceTaskContext ?? []).filter(Boolean),
    retrievalStatus,
    retrievalEvidence,
  };
}

export function renderPreparationContext(context: PreparationContext): string {
  const targetSection = context.targets
    .map((target, index) =>
      [
        `Target ${index + 1}`,
        `Person name: ${target.personName}`,
        `Role: ${target.role}`,
        `Company: ${target.companyName}`,
        `Company description: ${target.companyDescription || "(not supplied)"}`,
        `Known needs: ${target.knownNeeds.length ? target.knownNeeds.join("; ") : "(not supplied)"}`,
        `Relevance reason: ${target.relevanceReason || "(not supplied)"}`,
        `Priority: ${target.priority}`,
        `Relationship status: ${target.status}`,
      ].join("\n")
    )
    .join("\n\n");

  const retrievalSection =
    context.retrievalStatus === "results" && context.retrievalEvidence.length > 0
      ? context.retrievalEvidence
          .map(
            (item) =>
              [
                `Evidence: ${item.title}`,
                `Source: ${item.source}`,
                `Excerpt: ${item.excerpt}`,
              ].join("\n")
          )
          .join("\n\n")
      : context.retrievalStatus === "no_results"
        ? "No relevant retrieved evidence found."
        : context.retrievalStatus === "configured"
          ? "Document retrieval is configured but no retrieval run has been attached."
          : "Document retrieval is not configured.";

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
    targetSection || "(no targets supplied)",
    "",
    "RETRIEVED EVIDENCE",
    retrievalSection,
    "",
    "GENERATION OBJECTIVE",
    context.generationObjective,
    "",
    "SOURCE TASK CONTEXT",
    ...(context.sourceTaskContext.length ? context.sourceTaskContext.map((item) => `- ${item}`) : ["- (none supplied)"]),
  ].join("\n");
}
