export type AIWorkflow = "taskExtraction" | "preparationStrategy" | "evalJudge";

export type AIReasoningEffort = "low" | "medium" | "high";

export interface AIModelCandidate {
  model: string;
  source: "env" | "fallback";
  envVar?: string;
}

export interface AIWorkflowConfig {
  workflow: AIWorkflow;
  modelCandidates: AIModelCandidate[];
  timeoutMs: number;
  maxAttempts: number;
  reasoningEffort: AIReasoningEffort;
}

export interface AIRequestTelemetry {
  requestId: string;
  timestamp: string;
  workflow: AIWorkflow;
  resolvedModel: string | null;
  interactionType: string | null;
  attemptCount: number;
  latencyMs: number;
  success: boolean;
  refusal: boolean;
  schemaValidationStatus: "passed" | "failed";
  groundingWarningCount: number;
  retrievalEnabled: boolean;
  retrievalResultCount: number;
  confidence: number | null;
  tokenUsage: {
    inputTokens: number | null;
    outputTokens: number | null;
    cachedTokens: number | null;
    totalTokens: number | null;
  } | null;
  errorCategory: string | null;
}

export interface GroundingCheckResult {
  blocked: boolean;
  warnings: string[];
  category: string | null;
}

export interface StructuredAIExecutionResult<T> {
  result: T;
  raw: unknown;
  model: string;
  requestId: string;
  telemetry: AIRequestTelemetry;
  grounding: GroundingCheckResult;
}
