import type { AIRequestTelemetry } from "./models";

export function logAIRequestTelemetry(payload: AIRequestTelemetry): void {
  console.log(
    JSON.stringify({
      component: "ai",
      ...payload,
    })
  );
}
