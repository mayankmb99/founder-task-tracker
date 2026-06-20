import type { EventStrategy, ExtractionResult } from "@/lib/types";
import type { PreparationContext, PreparationTargetContext, TaskExtractionContext } from "./context/types";
import type { GroundingCheckResult } from "./models";

function emptyGrounding(): GroundingCheckResult {
  return { blocked: false, warnings: [], category: null };
}

function normalizeCandidateName(rawName: string, targets: PreparationTargetContext[]): string | null {
  const clean = rawName.trim().toLowerCase();
  if (!clean) return null;

  for (const target of targets) {
    if (target.personName.trim().toLowerCase() === clean) {
      return target.personName;
    }
  }

  for (const target of targets) {
    const targetName = target.personName.trim().toLowerCase();
    if (
      clean.startsWith(targetName) ||
      targetName.startsWith(clean) ||
      clean.includes(targetName) ||
      targetName.includes(clean)
    ) {
      return target.personName;
    }
  }

  const splitTokens = rawName.split(/[—–-]/)[0]?.trim().toLowerCase();
  if (splitTokens) {
    for (const target of targets) {
      const targetName = target.personName.trim().toLowerCase();
      if (splitTokens === targetName || targetName.startsWith(splitTokens)) {
        return target.personName;
      }
    }
  }

  return null;
}

function buildAllowedProofText(context: PreparationContext): string {
  return [
    ...context.founderFacts,
    ...context.companyFacts,
    ...context.audienceFacts,
    context.interactionType,
    context.interactionName,
    context.interactionDescription,
    context.interactionStart,
    context.interactionLocation,
    context.desiredOutcome,
    context.additionalContext,
    ...context.targets.flatMap((target) => [
      target.personName,
      target.role,
      target.companyName,
      target.companyDescription,
      ...target.knownNeeds,
      target.relevanceReason,
      target.priority,
      target.status,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeComparableText(text: string): string {
  const withoutLabel = text.replace(/^[a-z][a-z0-9 /&()._-]{0,60}:\s*/i, "");
  return withoutLabel
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSuspiciousMetricClaim(text: string, allowedFacts: string): boolean {
  const fragments = text.match(
    /(?:\$[0-9][0-9,]*(?:\.[0-9]+)?|\b[0-9][0-9,]*(?:\.[0-9]+)?\s?(?:%|customers?|users?|clients?|revenue|arr|mrr|funding|raised|market size|sla|discount|pricing|price|contract|integration|compliance|attendees?))/gi
  );
  if (!fragments?.length) return false;
  return fragments.some((fragment) => !allowedFacts.includes(normalizeComparableText(fragment)));
}

function collectCoreNarrativeTexts(strategy: EventStrategy): string[] {
  return [
    strategy.positioningSummary,
    strategy.founderIntroduction,
    strategy.companyPitch,
    ...strategy.peopleToPrioritise.flatMap((person) => [person.reason, person.pitchAngle]),
    ...strategy.risks,
    ...strategy.conversationGoals,
  ].filter(Boolean);
}

function shiftDate(dateString: string, days: number): string | null {
  const parsed = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function resolveRelativeDate(text: string, currentDate: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("day after tomorrow")) {
    return shiftDate(currentDate, 2);
  }
  if (lower.includes("tomorrow")) {
    return shiftDate(currentDate, 1);
  }
  if (lower.includes("today")) {
    return currentDate;
  }

  const weekdayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const match = Object.entries(weekdayMap).find(([weekday]) => new RegExp(`\\b(?:next\\s+)?${weekday}\\b`, "i").test(text));
  if (!match) return null;

  const targetDay = match[1];
  const current = new Date(`${currentDate}T00:00:00Z`);
  if (Number.isNaN(current.getTime())) return null;
  const today = current.getUTCDay();
  let delta = (targetDay - today + 7) % 7;
  if (delta === 0 || /\bnext\s+/i.test(text)) {
    delta += 7;
  }
  return shiftDate(currentDate, delta);
}

function resolveExplicitTime(text: string): string | null {
  const lower = text.toLowerCase();
  if (/(around|about|approximately|ish)\s+\d/.test(lower)) return null;
  const match = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (match) {
    let hours = Number(match[1]);
    const minutes = Number(match[2] ?? "00");
    const meridiem = match[3];
    if (hours === 12) {
      hours = meridiem === "am" ? 0 : 12;
    } else if (meridiem === "pm") {
      hours += 12;
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const exactTwentyFourHour = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (exactTwentyFourHour) {
    return `${String(Number(exactTwentyFourHour[1])).padStart(2, "0")}:${exactTwentyFourHour[2]}`;
  }
  return null;
}

export function validateTaskExtractionOutput(
  result: ExtractionResult,
  context: TaskExtractionContext
): { normalized: ExtractionResult; grounding: GroundingCheckResult } {
  const grounding = emptyGrounding();
  const normalized: ExtractionResult = {
    ...result,
    taskTitle: result.taskTitle?.trim() || null,
    dueDate: result.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(result.dueDate) ? result.dueDate : null,
    dueTime: result.dueTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(result.dueTime) ? result.dueTime : null,
    confidence: Math.max(0, Math.min(1, Number.isFinite(result.confidence) ? result.confidence : 0)),
    missingInformation: Array.from(new Set(result.missingInformation.filter(Boolean))),
    reasonForClassification: result.reasonForClassification.trim(),
    taskOwner:
      result.taskOwner === "user" || result.taskOwner === "sender" || result.taskOwner === "unknown"
        ? result.taskOwner
        : "unknown",
    actionType:
      result.actionType === "create" ||
      result.actionType === "update" ||
      result.actionType === "complete" ||
      result.actionType === "postpone" ||
      result.actionType === "cancel"
        ? result.actionType
        : "none",
    isActionItem: Boolean(result.isActionItem),
  };

  if (!normalized.isActionItem) {
    normalized.taskTitle = null;
    normalized.dueDate = null;
    normalized.dueTime = null;
    normalized.actionType = "none";
    normalized.taskOwner = "unknown";
  }

  if (normalized.isActionItem && normalized.taskOwner === "unknown") {
    normalized.missingInformation = Array.from(new Set([...normalized.missingInformation, "taskOwner"]));
  }
  if (normalized.isActionItem && !normalized.taskTitle) {
    normalized.missingInformation = Array.from(new Set([...normalized.missingInformation, "taskTitle"]));
  }
  if (normalized.isActionItem && !normalized.dueDate) {
    const resolvedDate = resolveRelativeDate(context.sourceText, context.currentDate);
    if (resolvedDate) {
      normalized.dueDate = resolvedDate;
      normalized.missingInformation = normalized.missingInformation.filter((field) => field !== "dueDate");
    } else {
      normalized.missingInformation = Array.from(new Set([...normalized.missingInformation, "dueDate"]));
    }
  }
  if (normalized.isActionItem && !normalized.dueTime && context.sourceType !== "calendar") {
    const resolvedTime = resolveExplicitTime(context.sourceText);
    if (resolvedTime) {
      normalized.dueTime = resolvedTime;
      normalized.missingInformation = normalized.missingInformation.filter((field) => field !== "dueTime");
    } else {
      normalized.missingInformation = Array.from(new Set([...normalized.missingInformation, "dueTime"]));
    }
  }

  return { normalized, grounding };
}

export function validatePreparationOutput(
  strategy: EventStrategy,
  context: PreparationContext
): { normalized: EventStrategy; grounding: GroundingCheckResult } {
  const allowedProofText = buildAllowedProofText(context);
  const grounding = emptyGrounding();
  const warnings = new Set<string>();
  const normalizedPeople = strategy.peopleToPrioritise
    .map((person) => {
      const canonical = normalizeCandidateName(person.personName, context.targets);
      if (!canonical) {
        grounding.blocked = true;
        grounding.category = "unknown_person_name";
        warnings.add(`unknown_person_name:${person.personName}`);
      }
      return {
        personName: canonical ?? person.personName.trim(),
        reason: person.reason.trim(),
        pitchAngle: person.pitchAngle.trim(),
      };
    })
    .filter((person) => person.personName.length > 0);

  for (const proofPoint of strategy.proofPointsToUse) {
    if (/\b(no|not|missing|lack|lacks|does not|doesn't)\b/i.test(proofPoint)) {
      continue;
    }
    const normalizedProofPoint = normalizeComparableText(proofPoint);
    if (!allowedProofText.includes(normalizedProofPoint)) {
      grounding.blocked = true;
      grounding.category = "unsupported_proof_point";
      warnings.add(`unsupported_proof_point:${proofPoint}`);
    }
  }

  for (const text of collectCoreNarrativeTexts(strategy)) {
    if (hasSuspiciousMetricClaim(text, allowedProofText)) {
      grounding.blocked = true;
      grounding.category = "unsupported_metric_claim";
      warnings.add(`unsupported_metric_claim:${text.slice(0, 120)}`);
    }
  }

  const normalized: EventStrategy = {
    ...strategy,
    peopleToPrioritise: normalizedPeople,
    proofPointsToUse: Array.from(new Set(strategy.proofPointsToUse.map((item) => item.trim()).filter(Boolean))),
    questionsToAsk: Array.from(new Set(strategy.questionsToAsk.map((item) => item.trim()).filter(Boolean))),
    talkingPoints: Array.from(new Set(strategy.talkingPoints.map((item) => item.trim()).filter(Boolean))),
    conversationGoals: Array.from(new Set(strategy.conversationGoals.map((item) => item.trim()).filter(Boolean))),
    preparationItems: Array.from(new Set(strategy.preparationItems.map((item) => item.trim()).filter(Boolean))),
    followUpActions: Array.from(new Set(strategy.followUpActions.map((item) => item.trim()).filter(Boolean))),
    risks: Array.from(new Set(strategy.risks.map((item) => item.trim()).filter(Boolean))),
    missingInformation: Array.from(new Set(strategy.missingInformation.map((item) => item.trim()).filter(Boolean))),
    confidence: Math.max(0, Math.min(1, Number.isFinite(strategy.confidence) ? strategy.confidence : 0)),
  };

  grounding.warnings = [...warnings];
  if (!grounding.category && grounding.warnings.length > 0) {
    grounding.category = "validation";
  }

  return { normalized, grounding };
}
