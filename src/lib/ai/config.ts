import type { AIModelCandidate, AIReasoningEffort, AIWorkflow, AIWorkflowConfig } from "./models";

function uniqueCandidates(values: AIModelCandidate[]): AIModelCandidate[] {
  const seen = new Set<string>();
  return values.filter((candidate) => {
    const key = candidate.model.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function envCandidate(value: string | undefined, envVar: string): AIModelCandidate | null {
  if (!value || !value.trim()) return null;
  return { model: value.trim(), source: "env", envVar };
}

function fallbackCandidates(values: string[]): AIModelCandidate[] {
  return values.map((model) => ({ model, source: "fallback" as const }));
}

function workflowDefaults(workflow: AIWorkflow): {
  timeoutMs: number;
  maxAttempts: number;
  reasoningEffort: AIReasoningEffort;
  fallbackModels: string[];
} {
  switch (workflow) {
    case "taskExtraction":
      return {
        timeoutMs: 20_000,
        maxAttempts: 2,
        reasoningEffort: "low",
        fallbackModels: ["gpt-5-mini"],
      };
    case "preparationStrategy":
      return {
        timeoutMs: 60_000,
        maxAttempts: 2,
        reasoningEffort: "medium",
        fallbackModels: ["gpt-5-mini"],
      };
    case "evalJudge":
      return {
        timeoutMs: 20_000,
        maxAttempts: 2,
        reasoningEffort: "medium",
        fallbackModels: ["gpt-5-mini"],
      };
  }
}

export function resolveWorkflowConfig(workflow: AIWorkflow): AIWorkflowConfig {
  const defaults = workflowDefaults(workflow);
  const envModels =
    workflow === "taskExtraction"
      ? uniqueCandidates([
          envCandidate(process.env.OPENAI_TASK_MODEL, "OPENAI_TASK_MODEL"),
          envCandidate(process.env.OPENAI_MODEL, "OPENAI_MODEL"),
          ...fallbackCandidates(defaults.fallbackModels),
        ].filter(Boolean) as AIModelCandidate[])
      : workflow === "preparationStrategy"
        ? uniqueCandidates([
            envCandidate(process.env.OPENAI_STRATEGY_MODEL, "OPENAI_STRATEGY_MODEL"),
            envCandidate(process.env.OPENAI_MODEL, "OPENAI_MODEL"),
            ...fallbackCandidates(defaults.fallbackModels),
          ].filter(Boolean) as AIModelCandidate[])
        : uniqueCandidates([
            envCandidate(process.env.OPENAI_EVAL_MODEL, "OPENAI_EVAL_MODEL"),
            envCandidate(process.env.OPENAI_STRATEGY_MODEL, "OPENAI_STRATEGY_MODEL"),
            envCandidate(process.env.OPENAI_MODEL, "OPENAI_MODEL"),
            ...fallbackCandidates(defaults.fallbackModels),
          ].filter(Boolean) as AIModelCandidate[]);

  return {
    workflow,
    modelCandidates: envModels,
    timeoutMs: defaults.timeoutMs,
    maxAttempts: defaults.maxAttempts,
    reasoningEffort: defaults.reasoningEffort,
  };
}

export function resolveConfiguredModel(workflow: AIWorkflow): string {
  return resolveWorkflowConfig(workflow).modelCandidates[0]?.model ?? "gpt-5-mini";
}

export function describeModelCandidate(candidate: AIModelCandidate): string {
  return candidate.envVar ? `${candidate.model} (${candidate.envVar})` : candidate.model;
}
