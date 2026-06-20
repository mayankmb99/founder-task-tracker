# AI Architecture

Status: implemented in code. The routes now share a central OpenAI client, use workflow-specific model routing, build explicit context payloads, and persist only after validation.

## Existing Architecture

The current AI layer is split across two server routes:

- `POST /api/extract-task`
- `POST /api/generate-event-strategy`

Both routes currently:

- instantiate their own OpenAI client;
- read `OPENAI_API_KEY` and `OPENAI_MODEL` directly from the environment;
- call the OpenAI Responses API with `text.format.type = "json_schema"` and `strict: true`;
- parse the returned `output_text` as JSON;
- convert the result into application types;
- persist the data to Supabase from the route handler.

Current shape by workflow:

| Workflow | Model selection | Output contract | Persistence |
|---|---|---|---|
| Task extraction | `process.env.OPENAI_MODEL ?? "gpt-5-mini"` | strict JSON schema for `ExtractionResult` | inserts into `task_suggestions`, then accepted tasks into `tasks` |
| Preparation strategy | `process.env.OPENAI_MODEL ?? "gpt-5-mini"` | strict JSON schema for `EventStrategy` | delete-then-insert into `event_strategies` |

Observed characteristics:

- There is no central model router.
- There is no shared context assembler.
- There is no reusable validation layer beyond the JSON schema.
- There is no retry policy specific to transient model/API failures.
- There is minimal observability beyond `console.error`.
- There is no retrieval layer beyond the structured DB context already passed from the page into the strategy route.
- The current extraction flow persists a suggestion immediately, but the acceptance/edit/dismiss path is still application-specific and should be treated as a separate approval layer.

## Proposed Architecture

Introduce a narrow AI orchestration layer with these responsibilities:

1. Choose the right model for the workflow.
2. Assemble only the context needed for that workflow.
3. Apply the correct prompt contract.
4. Validate the structured output.
5. Route the result through the approval/persistence path.
6. Emit observability data.
7. Fail closed when confidence, schema validation, or persistence fails.

The implementation can stay route-based initially, but the route handlers should delegate to shared AI service modules instead of embedding orchestration logic inline.

## Model Routing

Recommended routing target:

| Workflow | Recommended model | Reasoning effort | Notes |
|---|---|---|---|
| Task extraction | `gpt-5.4-mini` | low | classification and field extraction should optimize for speed and cost |
| Preparation strategy | `gpt-5.5` | medium | multi-context grounded recommendation with more nuanced reasoning |
| Eval judge | `gpt-5.5` | medium or high | judge outputs should prioritize consistent critique over speed |

Routing rules:

- Use the workflow-specific model explicitly; do not rely on a single fallback model for all requests.
- Do not silently auto-upgrade or auto-downgrade models in production without eval evidence.
- If a configured model is unavailable, surface a retryable configuration error rather than falling back to mock data.
- If a development fallback is needed, keep it explicit and non-production.

## Data Flow

### Task extraction

1. User pastes a message.
2. Route receives the raw text.
3. Context assembler builds a minimal extraction prompt.
4. Model returns structured extraction fields.
5. Application validates fields and normalizes them.
6. Suggestion is rendered for review.
7. User approves, edits, or dismisses.
8. Approved task is persisted to Supabase.
9. UI updates immediately and then refetches cleanly on refresh.

### Preparation strategy

1. User selects an interaction.
2. Route reads founder, company, audience, interaction, and target data.
3. Context assembler builds a compact structured prompt.
4. Model returns a strategy with per-target prioritization.
5. Application validates the response and persists the latest version.
6. User adds prep or follow-up tasks from the strategy.
7. Tasks are inserted into the real task list and deduped at the application layer.

## Context Assembly

The context assembler should be explicit about source precedence and budget.

Recommended precedence:

1. User-provided values in the current form or request.
2. The selected interaction/event and its targets.
3. Foundational profile data from Supabase.
4. The most recent saved strategy for the same interaction, if needed for continuity.
5. Optional retrieval results from an external document store.

Recommended assembly rules:

- Keep static contract text at the top and dynamic context near the bottom to improve cache reuse.
- Include only the interaction type and facts needed for the current workflow.
- Truncate or summarize long arrays before they hit the model.
- Preserve exact names for people and organizations.
- Separate known facts from recommendations in the prompt text.

## Structured Output Validation

Use two layers of validation:

1. Schema validation at the OpenAI response boundary.
2. Application validation after parsing.

Application validation should confirm:

- required fields exist;
- dates and times are in the expected format;
- enum-like values are allowed by the app and database;
- confidence is within range;
- target names are copied exactly when required;
- no unsupported relationship identifiers are smuggled into unrelated fields;
- the payload can actually be persisted to the current schema.

## Retries And Fallbacks

Recommended retry policy:

- Retry transient network, timeout, 429, and 5xx failures once.
- Retry only if the request is safe to replay.
- Do not retry malformed schema outputs more than once without changing the prompt or context.
- Do not automatically fall back to mock data if persistence fails.

Recommended fallback policy:

- For extraction: show a retryable error and preserve the typed message.
- For strategy generation: show the generated result only if the model response was valid; if persistence fails, surface the unsaved state clearly.
- For persistence failures: keep the user’s current edits in memory and let them retry.

## Failure Modes

The architecture should expect:

- model refusals;
- malformed structured outputs;
- prompt injection through untrusted input;
- stale or conflicting source records;
- partial persistence;
- transient Supabase failures;
- duplicate acceptance or double-click behavior;
- long-tail latency spikes.

Each of those should be surfaced as a deterministic app state, not as a silent fallback.

## Observability

Recommended telemetry per AI request:

- request id;
- workflow name;
- model name;
- reasoning effort;
- input token count;
- output token count;
- cached token count;
- end-to-end latency;
- schema validation result;
- persistence result;
- retry count;
- user action taken after the result.

Recommended logging rules:

- log metadata, not secrets;
- do not log API keys or service-role credentials;
- avoid logging full untrusted content unless explicitly needed for debugging and redaction is in place;
- keep structured error codes that can be aggregated in evals and production monitoring.

## Latency And Cost Controls

- Use smaller models for extraction/classification when quality is sufficient.
- Use GPT-5.5 for the richer strategy workflow.
- Keep prompts compact and stable.
- Keep the shared contract text static and cache-friendly.
- Truncate retrieval context before it becomes expensive.
- Reuse one response per workflow instead of chaining unnecessary model calls.
- Track prompt/output token usage and cached tokens in evals.
- Keep approval and persistence separate from generation so user actions do not trigger extra inference.

## Open Questions

- Should extraction suggestions persist immediately to `task_suggestions` or only on user approval?
- Should task acceptance create a source record first once connector ingestion exists?
- Should retrieval be added as a separate service layer or co-located with the route handlers?
- Should the system keep a single latest strategy per interaction or preserve history intentionally?
