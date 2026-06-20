export const TASK_EXTRACTION_SUPPORTED_FIELDS = [
  "taskOwner",
  "taskTitle",
  "dueDate",
  "dueTime",
  "actionType",
  "confidence",
  "missingInformation",
  "reasonForClassification",
] as const;

export const TASK_EXTRACTION_AMBIGUITY_RULES = [
  "Never invent a date.",
  "Never invent a time.",
  "Leave ambiguous date or time fields null.",
  "Do not guess the owner if responsibility is unclear.",
] as const;

export const PREPARATION_CONTEXT_LIMITS = {
  maxFounderFacts: 8,
  maxCompanyFacts: 10,
  maxAudienceFacts: 8,
  maxTargets: 6,
  maxEvidenceSnippets: 4,
  maxCharsPerEvidenceSnippet: 500,
} as const;
