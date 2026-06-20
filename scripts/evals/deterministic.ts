import {
  buildPreparationContext,
  renderPreparationContext,
} from "@/lib/ai/context/preparation";
import { buildTaskExtractionContext } from "@/lib/ai/context/taskExtraction";
import { buildEvalJudgePrompt, EVAL_JUDGE_SCHEMA } from "@/lib/ai/prompts/evalJudge";
import { PREPARATION_SCHEMA, buildPreparationSystemPrompt, renderPreparationUserPrompt } from "@/lib/ai/prompts/preparation/base";
import { buildTaskExtractionPrompt, TASK_EXTRACTION_SCHEMA } from "@/lib/ai/prompts/taskExtraction";
import { resolveWorkflowConfig } from "@/lib/ai/config";
import { validatePreparationOutput, validateTaskExtractionOutput } from "@/lib/ai/validation";
import type { AudienceSegment, CompanyProfile, EventRecord, FounderProfile } from "@/lib/types";
import { loadAllFixtures } from "./loadFixtures";
import { assert, compactObject, isDateString, isTimeString } from "./shared";

type Result = { name: string; ok: boolean; details?: string };

type PreparationFixtureInput = {
  founder_profile: FounderProfile;
  company_profile: CompanyProfile;
  audience_segment?: AudienceSegment | null;
  event: EventRecord;
};

function add(result: Result[], name: string, ok: boolean, details?: string) {
  result.push({ name, ok, details });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requiredFields(value: unknown, fields: string[]): boolean {
  return isObject(value) && fields.every((field) => field in value);
}

async function main() {
  const results: Result[] = [];
  const fixtures = await loadAllFixtures();

  const counts = {
    taskExtraction: fixtures.taskExtraction.length,
    preparationStrategy: fixtures.preparationStrategy.length,
    rag: fixtures.rag.length,
    adversarial: fixtures.adversarial.length,
  };

  add(results, "fixture count: task extraction", counts.taskExtraction === 15, `${counts.taskExtraction} cases`);
  add(results, "fixture count: preparation", counts.preparationStrategy === 16, `${counts.preparationStrategy} cases`);
  add(results, "fixture count: rag", counts.rag === 7, `${counts.rag} cases`);
  add(results, "fixture count: adversarial", counts.adversarial === 7, `${counts.adversarial} cases`);

  const allFixtures = [...fixtures.taskExtraction, ...fixtures.preparationStrategy, ...fixtures.rag, ...fixtures.adversarial];
  const uniqueIds = new Set(allFixtures.map((fixture) => fixture.id));
  add(results, "unique fixture IDs", uniqueIds.size === allFixtures.length, `${uniqueIds.size}/${allFixtures.length} unique`);

  const requiredFixtureFields = [
    "id",
    "description",
    "input",
    "expected_interaction_type",
    "must_include_criteria",
    "must_not_include_criteria",
    "expected_structured_fields",
    "grounding_requirements",
    "notes",
  ];
  add(
    results,
    "fixture required fields",
    allFixtures.every((fixture) => requiredFields(fixture, requiredFixtureFields)),
    "all JSONL rows expose the expected fields"
  );

  const validInteractionTypes = new Set([
    "task_extraction",
    "sales_meeting",
    "investor_meeting",
    "partnership_meeting",
    "vendor_negotiation",
    "customer_call",
    "startup_event",
    "conference",
    "other",
    "rag",
  ]);
  add(
    results,
    "fixture interaction types",
    allFixtures.every((fixture) => validInteractionTypes.has(fixture.expected_interaction_type)),
    "all fixtures use known interaction types"
  );

  const modelSummary = [
    `taskExtraction: ${resolveWorkflowConfig("taskExtraction").modelCandidates.map((candidate) => candidate.model).join(" -> ")}`,
    `preparationStrategy: ${resolveWorkflowConfig("preparationStrategy").modelCandidates.map((candidate) => candidate.model).join(" -> ")}`,
    `evalJudge: ${resolveWorkflowConfig("evalJudge").modelCandidates.map((candidate) => candidate.model).join(" -> ")}`,
  ];
  add(results, "model resolution", modelSummary.every(Boolean), modelSummary.join(" | "));

  const taskPromptContext = buildTaskExtractionContext({
    sourceText: "Please send Arjun the proposal tomorrow by 4 PM.",
    sourceType: "gmail",
    receivedAt: "2026-06-20T09:00:00+05:30",
    currentDate: "2026-06-20",
    userTimezone: "Asia/Kolkata",
  });
  const taskPrompt = buildTaskExtractionPrompt(taskPromptContext);
  add(results, "task extraction prompt loads", Boolean(taskPrompt.system && taskPrompt.user && TASK_EXTRACTION_SCHEMA), "prompt and schema are defined");

  const prepFixture = fixtures.preparationStrategy.find((fixture) => fixture.id === "ps-01") ?? fixtures.preparationStrategy[0];
  const prepInput = prepFixture.input as PreparationFixtureInput;
  const prepContext = buildPreparationContext({
    founder: prepInput.founder_profile,
    company: prepInput.company_profile,
    audience: prepInput.audience_segment ?? null,
    event: prepInput.event,
    retrievalStatus: "no_results",
    retrievalEvidence: [],
  });
  const prepPrompt = buildPreparationSystemPrompt("Sales meeting guidance");
  const prepUserPrompt = renderPreparationUserPrompt(prepContext);
  add(results, "preparation prompt loads", Boolean(prepPrompt && prepUserPrompt && PREPARATION_SCHEMA), "prompt and schema are defined");
  add(results, "preparation context renders", Boolean(renderPreparationContext(prepContext)), "rendered context is non-empty");

  const judgePrompt = buildEvalJudgePrompt({
    workflow: "preparationStrategy",
    description: "check judge schema",
    expected: "grounded answer",
    actual: "grounded answer",
  });
  add(results, "judge prompt loads", Boolean(judgePrompt.system && judgePrompt.user && EVAL_JUDGE_SCHEMA), "judge prompt is defined");

  const taskValidation = validateTaskExtractionOutput(
    {
      isActionItem: false,
      taskOwner: "unknown",
      taskTitle: "ignored",
      dueDate: "2026-06-21",
      dueTime: "16:00",
      actionType: "create",
      confidence: 1.2,
      missingInformation: [" dueDate ", "", "dueTime"],
      reasonForClassification: "  Opinion only. ",
    },
    taskPromptContext
  );
  add(
    results,
    "task extraction validation",
    taskValidation.normalized.isActionItem === false &&
      taskValidation.normalized.taskTitle === null &&
      taskValidation.normalized.dueDate === null &&
      taskValidation.normalized.dueTime === null &&
      taskValidation.normalized.actionType === "none" &&
      taskValidation.normalized.confidence === 1,
    JSON.stringify(compactObject({
      isActionItem: taskValidation.normalized.isActionItem,
      taskTitle: taskValidation.normalized.taskTitle,
      dueDate: taskValidation.normalized.dueDate,
      dueTime: taskValidation.normalized.dueTime,
      actionType: taskValidation.normalized.actionType,
      confidence: taskValidation.normalized.confidence,
    }))
  );

  const prepValidationContext = prepContext;
  const unknownTargetValidation = validatePreparationOutput(
    {
      positioningSummary: "summary",
      founderIntroduction: "intro",
      companyPitch: "pitch",
      peopleToPrioritise: [{ personName: "Unknown Person", reason: "not in context", pitchAngle: "generic" }],
      proofPointsToUse: [],
      questionsToAsk: [],
      talkingPoints: [],
      conversationGoals: [],
      preparationItems: [],
      followUpActions: [],
      risks: [],
      missingInformation: [],
      confidence: 0.4,
    },
    prepValidationContext
  );
  add(results, "unknown target-name grounding", unknownTargetValidation.grounding.blocked, unknownTargetValidation.grounding.category ?? "no category");

  const metricValidation = validatePreparationOutput(
    {
      positioningSummary: "summary",
      founderIntroduction: "intro",
      companyPitch: "pitch",
      peopleToPrioritise: [{ personName: prepValidationContext.targets[0]?.personName ?? "Riya Mehta", reason: "known target", pitchAngle: "angle" }],
      proofPointsToUse: ["We grew revenue 120% last quarter"],
      questionsToAsk: [],
      talkingPoints: ["We grew revenue 120% last quarter"],
      conversationGoals: [],
      preparationItems: [],
      followUpActions: [],
      risks: [],
      missingInformation: [],
      confidence: 0.9,
    },
    prepValidationContext
  );
  add(results, "unsupported claim grounding", metricValidation.grounding.blocked, metricValidation.grounding.category ?? "no category");

  const dateChecks = allFixtures
    .flatMap((fixture) => {
      const input = fixture.input as {
        reference_date?: string;
        timezone?: string;
        event?: {
          eventStart?: string;
        };
      };
      const checks: Array<[string, boolean]> = [];
      if (typeof input.reference_date === "string") checks.push([`${fixture.id}: reference_date`, isDateString(input.reference_date)]);
      if (typeof input.timezone === "string") checks.push([`${fixture.id}: timezone`, input.timezone.length > 0]);
      const eventStart = input.event?.eventStart;
      if (typeof eventStart === "string") checks.push([`${fixture.id}: eventStart`, !Number.isNaN(Date.parse(eventStart))]);
      return checks;
    });

  for (const [name, ok] of dateChecks) {
    add(results, name, ok);
  }

  const timeChecks = fixtures.taskExtraction.flatMap((fixture) => {
    const input = fixture.input as {
      expected_structured_fields?: {
        task_title?: string | null;
        due_time?: string | null;
      };
    };
    const checks: Array<[string, boolean]> = [];
    if (typeof input.expected_structured_fields?.task_title === "string") checks.push([`${fixture.id}: task title exists`, input.expected_structured_fields.task_title.length > 0]);
    if (typeof input.expected_structured_fields?.due_time === "string") checks.push([`${fixture.id}: due_time format`, isTimeString(input.expected_structured_fields.due_time)]);
    if (input.expected_structured_fields?.due_time === null) checks.push([`${fixture.id}: ambiguous time remains null`, true]);
    return checks;
  });

  for (const [name, ok] of timeChecks) {
    add(results, name, ok);
  }

  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.details ? ` — ${result.details}` : ""}`);
  }

  console.log(
    JSON.stringify(
      {
        fixtureCounts: counts,
        passCount: results.filter((result) => result.ok).length,
        failCount: failed.length,
        modelSummary,
      },
      null,
      2
    )
  );

  assert(failed.length === 0, `Deterministic eval failed with ${failed.length} issue(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
