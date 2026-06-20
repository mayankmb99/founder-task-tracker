import { loadJsonl } from "./shared";

export interface EvalFixture<TInput = unknown> {
  id: string;
  description: string;
  input: TInput;
  expected_interaction_type: string;
  must_include_criteria: string[];
  must_not_include_criteria: string[];
  expected_structured_fields: Record<string, unknown>;
  grounding_requirements: string[];
  notes: string;
}

export async function loadTaskExtractionFixtures() {
  return loadJsonl<EvalFixture>("evals/task-extraction-cases.jsonl");
}

export async function loadPreparationStrategyFixtures() {
  return loadJsonl<EvalFixture>("evals/preparation-strategy-cases.jsonl");
}

export async function loadRagFixtures() {
  return loadJsonl<EvalFixture>("evals/rag-cases.jsonl");
}

export async function loadAdversarialFixtures() {
  return loadJsonl<EvalFixture>("evals/adversarial-cases.jsonl");
}

export async function loadAllFixtures() {
  const [taskExtraction, preparationStrategy, rag, adversarial] = await Promise.all([
    loadTaskExtractionFixtures(),
    loadPreparationStrategyFixtures(),
    loadRagFixtures(),
    loadAdversarialFixtures(),
  ]);

  return { taskExtraction, preparationStrategy, rag, adversarial };
}
