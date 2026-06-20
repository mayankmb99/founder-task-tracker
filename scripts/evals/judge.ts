import { buildEvalJudgePrompt, EVAL_JUDGE_SCHEMA } from "@/lib/ai/prompts/evalJudge";
import { executeStructuredAI } from "@/lib/ai/runtime";

export interface JudgeInput {
  workflow: string;
  description: string;
  expected: string;
  actual: string;
}

export async function judgeCase(input: JudgeInput) {
  const prompt = buildEvalJudgePrompt(input);
  return executeStructuredAI({
    workflow: "evalJudge",
    interactionType: input.workflow,
    schemaName: "eval_judge",
    schema: EVAL_JUDGE_SCHEMA,
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    parseRaw: (raw) => raw,
    validate: (output) => {
      if (
        typeof output !== "object" ||
        output === null ||
        typeof (output as { groundedness?: unknown }).groundedness !== "number"
      ) {
        return {
          normalized: output,
          grounding: { blocked: true, warnings: ["invalid_judge_output"], category: "validation" },
        };
      }

      return {
        normalized: output,
        grounding: { blocked: false, warnings: [], category: null },
      };
    },
  }).catch((error) => {
    console.error("judgeCase failed:", error);
    return null;
  });
}
