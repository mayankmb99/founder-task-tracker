import type { AIWorkflow } from "./models";

export type AIErrorCategory =
  | "configuration"
  | "refusal"
  | "schema"
  | "grounding"
  | "transient"
  | "model_unavailable"
  | "validation"
  | "unexpected";

export class AIError extends Error {
  workflow: AIWorkflow;
  category: AIErrorCategory;
  retryable: boolean;
  status: number | null;
  constructor(
    workflow: AIWorkflow,
    category: AIErrorCategory,
    message: string,
    options?: { retryable?: boolean; status?: number | null; cause?: unknown }
  ) {
    super(message);
    this.workflow = workflow;
    this.category = category;
    this.retryable = options?.retryable ?? false;
    this.status = options?.status ?? null;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class AIConfigurationError extends AIError {
  constructor(workflow: AIWorkflow, message: string, cause?: unknown) {
    super(workflow, "configuration", message, { status: null, retryable: false, cause });
  }
}

export class AIRefusalError extends AIError {
  refusal: string;
  constructor(workflow: AIWorkflow, refusal: string) {
    super(workflow, "refusal", "The model refused this request.", {
      status: null,
      retryable: false,
    });
    this.refusal = refusal;
  }
}

export class AISchemaError extends AIError {
  constructor(workflow: AIWorkflow, message: string, cause?: unknown) {
    super(workflow, "schema", message, { status: null, retryable: false, cause });
  }
}

export class AIGroundingError extends AIError {
  warnings: string[];
  constructor(workflow: AIWorkflow, message: string, warnings: string[]) {
    super(workflow, "grounding", message, { status: null, retryable: false });
    this.warnings = warnings;
  }
}

export class AIModelUnavailableError extends AIError {
  constructor(workflow: AIWorkflow, message: string, status: number | null = null) {
    super(workflow, "model_unavailable", message, { status, retryable: false });
  }
}

export class AITransientError extends AIError {
  constructor(workflow: AIWorkflow, message: string, status: number | null = null, cause?: unknown) {
    super(workflow, "transient", message, { status, retryable: true, cause });
  }
}

export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError;
}

export function getErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown AI error.";
}

export function isModelUnavailableLike(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();
  return (
    status === 400 ||
    status === 404 ||
    status === 422 ||
    message.includes("unsupported model") ||
    message.includes("model") && message.includes("not found") ||
    message.includes("invalid model")
  );
}

export function isTransientAIError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error).toLowerCase();
  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" && status >= 500) ||
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("connection")
  );
}

export function userFacingAIMessage(error: unknown, fallback: string): string {
  if (error instanceof AIError) {
    switch (error.category) {
      case "refusal":
        return "The model refused to answer this request. Try rewording the input.";
      case "schema":
        return "The model returned an invalid structured response. Please try again.";
      case "grounding":
        return "The generated content looked suspiciously ungrounded. Please retry with more context.";
      case "model_unavailable":
        return "The configured AI model is unavailable right now. Please try again.";
      case "configuration":
        return "The AI configuration is incomplete on the server.";
      case "transient":
        return "The AI request timed out or hit a temporary error. Please try again.";
      default:
        return fallback;
    }
  }
  return fallback;
}
