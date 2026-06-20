import { AITransientError, isTransientAIError } from "./errors";
import type { AIWorkflow } from "./models";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  workflow: AIWorkflow,
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  }
): Promise<T> {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 2);
  const baseDelayMs = Math.max(50, options?.baseDelayMs ?? 250);
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      if (!isTransientAIError(error)) {
        throw error;
      }
      if (attempt >= maxAttempts) {
        throw new AITransientError(workflow, "The AI request failed after retrying.", null, error);
      }
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      options?.onRetry?.(attempt, error, delayMs);
      await sleep(delayMs);
    }
  }

  throw new Error("Retry loop exited unexpectedly.");
}
