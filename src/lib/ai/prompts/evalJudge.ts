import { SHARED_GROUNDING_RULES, SHARED_OUTPUT_RULES } from "./sharedRules";

export const EVAL_JUDGE_SCHEMA = {
  type: "object",
  properties: {
    groundedness: { type: "number" },
    factualRestraint: { type: "number" },
    relevance: { type: "number" },
    personalisation: { type: "number" },
    actionability: { type: "number" },
    questionQuality: { type: "number" },
    nextStepClarity: { type: "number" },
    missingInformationHandling: { type: "number" },
    criticalFailure: { type: "boolean" },
    notes: { type: "string" },
  },
  required: [
    "groundedness",
    "factualRestraint",
    "relevance",
    "personalisation",
    "actionability",
    "questionQuality",
    "nextStepClarity",
    "missingInformationHandling",
    "criticalFailure",
    "notes",
  ],
  additionalProperties: false,
} as const;

export function buildEvalJudgePrompt(input: {
  workflow: string;
  description: string;
  expected: string;
  actual: string;
}): { system: string; user: string } {
  const system = [
    "You are a strict LLM judge for grounded production AI output.",
    SHARED_GROUNDING_RULES,
    SHARED_OUTPUT_RULES,
    "Score only what is supported by the evidence. Do not reward unsupported confidence.",
    "If a critical hallucination, injection, or schema violation is present, set criticalFailure to true.",
  ].join("\n");

  const user = [
    `Workflow: ${input.workflow}`,
    `Description: ${input.description}`,
    "",
    "Expected:",
    input.expected,
    "",
    "Actual:",
    input.actual,
  ].join("\n");

  return { system, user };
}
