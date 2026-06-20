import { getOpenAIClient } from "./client";
import { AIGroundingError, AIConfigurationError, AIRefusalError, AISchemaError, AITransientError, isModelUnavailableLike, isTransientAIError } from "./errors";
import { resolveWorkflowConfig } from "./config";
import { withRetry } from "./retry";
import { logAIRequestTelemetry } from "./telemetry";
import type { AIRequestTelemetry, AIWorkflow, GroundingCheckResult, StructuredAIExecutionResult } from "./models";

type OpenAIResponseLike = {
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      refusal?: string;
    }>;
  }>;
  output_text?: string;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_tokens_details?: {
      cached_tokens?: number;
    };
  };
  error?: unknown;
  incomplete_details?: unknown;
};

function extractRefusal(response: OpenAIResponseLike): string | null {
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "refusal" && typeof content.refusal === "string") {
        return content.refusal;
      }
    }
  }
  return null;
}

function getTokenUsage(response: OpenAIResponseLike): AIRequestTelemetry["tokenUsage"] {
  const usage = response.usage;
  if (!usage) return null;
  return {
    inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : null,
    outputTokens: typeof usage.output_tokens === "number" ? usage.output_tokens : null,
    cachedTokens:
      typeof usage.input_tokens_details?.cached_tokens === "number"
        ? usage.input_tokens_details.cached_tokens
        : null,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : null,
  };
}

export interface ExecuteStructuredAIOptions<T> {
  workflow: AIWorkflow;
  interactionType?: string | null;
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  parseRaw: (raw: unknown) => T;
  validate: (output: T) => { normalized: T; grounding: GroundingCheckResult };
  retrievalEnabled?: boolean;
  retrievalResultCount?: number;
}

export async function executeStructuredAI<T>(
  options: ExecuteStructuredAIOptions<T>
): Promise<StructuredAIExecutionResult<T>> {
  const config = resolveWorkflowConfig(options.workflow);
  const client = getOpenAIClient();
  const requestId = globalThis.crypto?.randomUUID?.() ?? `ai-${Date.now()}-${Math.random()}`;
  const startedAt = Date.now();
  let lastError: unknown = null;
  let attemptCount = 0;

  if (!config.modelCandidates.length) {
    throw new AIConfigurationError(options.workflow, "No AI model candidates are configured.");
  }

  for (const candidate of config.modelCandidates) {
    try {
      const response = await withRetry(
        options.workflow,
        async () => {
          attemptCount += 1;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
          try {
            return await client.responses.create({
              model: candidate.model,
              input: [
                { role: "system", content: options.systemPrompt },
                { role: "user", content: options.userPrompt },
              ],
              reasoning: { effort: config.reasoningEffort },
              text: {
                format: {
                  type: "json_schema",
                  name: options.schemaName,
                  schema: options.schema,
                  strict: true,
                },
              },
            }, { signal: controller.signal });
          } finally {
            clearTimeout(timeoutId);
          }
        },
        { maxAttempts: config.maxAttempts, baseDelayMs: 300 }
      );

      const refusal = extractRefusal(response);
      if (response.error) {
        throw new AITransientError(options.workflow, "The AI API returned an error response.", null, response.error);
      }
      if (response.incomplete_details) {
        throw new AISchemaError(options.workflow, "The AI response was incomplete.", response.incomplete_details);
      }
      if (refusal) {
        const telemetry: AIRequestTelemetry = {
          requestId,
          timestamp: new Date().toISOString(),
          workflow: options.workflow,
          resolvedModel: response.model ?? candidate.model,
          interactionType: options.interactionType ?? null,
          attemptCount,
          latencyMs: Date.now() - startedAt,
          success: false,
          refusal: true,
          schemaValidationStatus: "passed",
          groundingWarningCount: 0,
          retrievalEnabled: Boolean(options.retrievalEnabled),
          retrievalResultCount: options.retrievalResultCount ?? 0,
          confidence: null,
          tokenUsage: getTokenUsage(response),
          errorCategory: "refusal",
        };
        logAIRequestTelemetry(telemetry);
        throw new AIRefusalError(options.workflow, refusal);
      }

      let raw: unknown;
      if (typeof response.output_text !== "string" || !response.output_text.trim()) {
        throw new AISchemaError(options.workflow, "The AI response did not include structured JSON output.");
      }

      try {
        raw = JSON.parse(response.output_text);
      } catch (parseError) {
        throw new AISchemaError(options.workflow, "The model returned invalid structured JSON.", parseError);
      }

      const parsed = options.parseRaw(raw);
      const validation = options.validate(parsed);
      if (validation.grounding.blocked) {
        const telemetry: AIRequestTelemetry = {
          requestId,
          timestamp: new Date().toISOString(),
          workflow: options.workflow,
          resolvedModel: response.model ?? candidate.model,
          interactionType: options.interactionType ?? null,
          attemptCount,
          latencyMs: Date.now() - startedAt,
          success: false,
          refusal: false,
          schemaValidationStatus: "passed",
          groundingWarningCount: validation.grounding.warnings.length,
          retrievalEnabled: Boolean(options.retrievalEnabled),
          retrievalResultCount: options.retrievalResultCount ?? 0,
          confidence: typeof (parsed as { confidence?: number }).confidence === "number" ? (parsed as { confidence: number }).confidence : null,
          tokenUsage: getTokenUsage(response),
          errorCategory: validation.grounding.category ?? "grounding",
        };
        logAIRequestTelemetry(telemetry);
        throw new AIGroundingError(options.workflow, "The generated response failed grounding checks.", validation.grounding.warnings);
      }

      const telemetry: AIRequestTelemetry = {
        requestId,
        timestamp: new Date().toISOString(),
        workflow: options.workflow,
        resolvedModel: response.model ?? candidate.model,
        interactionType: options.interactionType ?? null,
        attemptCount,
        latencyMs: Date.now() - startedAt,
        success: true,
        refusal: false,
        schemaValidationStatus: "passed",
        groundingWarningCount: validation.grounding.warnings.length,
        retrievalEnabled: Boolean(options.retrievalEnabled),
        retrievalResultCount: options.retrievalResultCount ?? 0,
        confidence: typeof (parsed as { confidence?: number }).confidence === "number" ? (parsed as { confidence: number }).confidence : null,
        tokenUsage: getTokenUsage(response),
        errorCategory: null,
      };
      logAIRequestTelemetry(telemetry);
      return {
        result: validation.normalized,
        raw,
        model: response.model ?? candidate.model,
        requestId,
        telemetry,
        grounding: validation.grounding,
      };
    } catch (error) {
      lastError = error;
      if (error instanceof AIRefusalError || error instanceof AISchemaError || error instanceof AIGroundingError) {
        throw error;
      }
      if (error instanceof AITransientError && config.modelCandidates.length > 1) {
        continue;
      }
      if (isModelUnavailableLike(error)) {
        continue;
      }
      if (isTransientAIError(error) && config.modelCandidates.length > 1) {
        continue;
      }
      if (candidate === config.modelCandidates[config.modelCandidates.length - 1]) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new AIConfigurationError(options.workflow, "The AI request failed without a specific error.");
}
