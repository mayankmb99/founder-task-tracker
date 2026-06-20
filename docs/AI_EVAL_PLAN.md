# AI Evaluation Plan

Status: implemented. The repo now includes deterministic fixture checks, bounded live eval scripts, and an optional judge workflow routed through the same AI service.

## Deterministic Evals

Use frozen JSONL fixtures and fixed prompt contracts so the same inputs produce comparable results over time.

Determinism rules:

- pin the workflow model explicitly in the eval run;
- pin the judge model explicitly;
- use the same system prompt and context assembly code for every run of a given workflow;
- keep the fixture files versioned in the repo;
- do not mix production traffic with eval traffic;
- record the exact model, reasoning effort, and prompt version used for each run.

The goal is not perfect bit-for-bit repeatability across model versions. The goal is reproducible comparison under a controlled fixture set.

## Ground-Truth Dataset Format

Each fixture line should contain:

- `id`
- `description`
- `input`
- `expected_interaction_type`
- `must_include_criteria`
- `must_not_include_criteria`
- `expected_structured_fields`
- `grounding_requirements`
- `notes`

Recommended file families:

- `evals/task-extraction-cases.jsonl`
- `evals/preparation-strategy-cases.jsonl`
- `evals/rag-cases.jsonl`
- `evals/adversarial-cases.jsonl`

## LLM-As-Judge Criteria

Use a judge model only after the deterministic checks pass.

Judge criteria:

- schema fidelity;
- grounding accuracy;
- missing-information handling;
- usefulness and specificity;
- safety against hallucination or prompt injection;
- duplicate-creation risk;
- policy compliance for the workflow contract.

Suggested judge output:

- score each criterion on a small ordinal scale;
- provide a short reason;
- flag any critical failure explicitly;
- return a binary release recommendation.

## Quality Thresholds

Initial release gates:

- 100% schema parse success on non-adversarial cases;
- 0 critical hallucination failures on adversarial cases;
- 0 invented traction/customer/attendee/pricing facts;
- 0 malformed confidence or date/time values;
- 0 duplicate task-creation regressions;
- at least 90% pass rate on must-include criteria for core happy-path fixtures;
- no regression on the existing startup-event scenario;
- p95 latency within the team’s agreed interactive budget.

Thresholds should be tightened only after a baseline is measured.

## Regression Policy

Block a release when any of the following happens:

- a schema invalid response escapes validation;
- a prompt injection attempt changes the model’s behavior;
- a hallucinated fact appears in a critical field;
- a task is duplicated or double-accepted;
- a persistence write succeeds partially without a clear recovery plan;
- a supported interaction type loses a required section.

Warn, but do not necessarily block, when:

- confidence is too low but the output is still safe;
- the model output is valid but less concise than desired;
- latency rises without a correctness regression.

## Latency And Token Tracking

Record the following per request:

- model;
- reasoning effort;
- prompt token count;
- output token count;
- cached token count;
- latency in milliseconds;
- retry count;
- persistence result;
- schema validation result;
- whether the user approved, edited, or dismissed the output.

Use these measurements to compare:

- extraction cost versus accuracy;
- strategy quality versus latency;
- judge cost versus usefulness;
- cached versus uncached request behavior.

## Model-Comparison Plan

Compare at least:

- extraction baseline versus `gpt-5.4-mini`;
- strategy baseline versus `gpt-5.5`;
- judge baseline versus `gpt-5.5`.

Do not switch the production default model until the chosen model beats the baseline on:

- grounded accuracy;
- critical error rate;
- latency budget;
- token cost;
- refresh/persistence success.

## Release Gate

A release may ship only if:

1. The deterministic suite passes.
2. The judge suite passes the threshold.
3. The adversarial suite shows no critical regressions.
4. The persistence checks confirm data survives refresh.
5. The manual review confirms the output is readable and action-oriented.
6. Any partial persistence path has a documented recovery story.

## Suggested Baseline Coverage

The initial fixture set should cover:

- at least 15 task-extraction cases;
- at least 16 preparation-strategy cases across all interaction types;
- at least 7 retrieval cases;
- at least 7 adversarial or hallucination cases.

That coverage is sufficient for the first release gate, but it should expand as the app grows.
