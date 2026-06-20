# AI Product Requirements

Status: implemented as an MVP in this repository, with model routing, shared context builders, strict structured outputs, grounding checks, telemetry, and an eval harness.

## Problem

The product currently has two separate AI touchpoints:

1. Task extraction from free text.
2. Preparation strategy generation for a specific meeting or event.

Both work today, but they are implemented as direct route handlers with local prompt text and ad hoc persistence. The user experience is not yet governed by a deliberate AI system with explicit model routing, context assembly, approval gates, retrieval policy, or evaluation coverage.

The result is a system that can work on a happy path, but is harder to reason about, harder to benchmark, and easier to regress:

- extraction output can be structurally valid but still land in the wrong persistence path;
- preparation prompts can drift across interaction types;
- duplicate acceptance prevention is only partially modeled by the current schema;
- observability is minimal;
- there is no formal eval loop to catch hallucinations or grounding failures.

## Target Users

- Primary: a single founder using the app day to day.
- Secondary: future founders or operators who need the same workflows.
- Operationally relevant personas:
  - a founder preparing for sales, investor, partnership, vendor, customer, conference, or startup-event conversations;
  - a founder pasting incoming messages to detect actionable tasks;
  - a future operator reviewing evals, prompt contracts, and model routing.

## Jobs To Be Done

- Turn an incoming message into a grounded, editable task suggestion.
- Turn founder, company, audience, event, and target context into a useful preparation strategy.
- Convert approved AI output into durable application data without duplicates.
- Surface missing information instead of inventing facts.
- Keep the AI layer fast enough for interactive use and cheap enough for repeated daily runs.

## Use Cases

- Paste a message such as a Gmail/WhatsApp/Calendar snippet and determine whether it contains an action item.
- Review the extracted suggestion, edit it, approve it, or dismiss it.
- Prepare for a sales meeting, investor meeting, partnership meeting, vendor negotiation, customer call, startup event, conference, or other interaction.
- Add recommended preparation or follow-up work to the real task list.
- Preserve the result across refreshes and refetches.
- Re-run generation after the user edits context and compare the revised recommendation.

## Supported Interaction Types

The preparation layer should support these user-facing interaction types:

- `sales_meeting`
- `investor_meeting`
- `partnership_meeting`
- `vendor_negotiation`
- `customer_call`
- `startup_event`
- `conference`
- `other`

Current legacy values that still exist in the data model:

- `startup_expo`
- `hackathon`

## User Flow

### Task extraction

1. User pastes a message.
2. The app calls the extraction route.
3. The model returns a structured suggestion.
4. The UI renders a readable suggestion card.
5. The user adds, edits, or dismisses.
6. Accepted suggestions become real tasks.
7. The task list updates immediately and persists on refresh.

### Preparation strategy

1. User selects or creates a meeting/event.
2. The app assembles founder, company, audience, event, and target context.
3. The strategy route generates a structured plan.
4. The UI renders the plan in sections.
5. The user adds preparation or follow-up tasks.
6. The tasks are saved to Supabase and appear in Today or Upcoming.
7. The strategy is reloaded on refresh.

## Functional Requirements

- Use the OpenAI Responses API for both AI workflows.
- Use Structured Outputs, not loose JSON.
- Route extraction and strategy generation through separate prompt contracts.
- Support human approval before task creation from extraction suggestions.
- Support edit-before-save for extraction suggestions.
- Support add-to-tasks for preparation items and follow-up actions.
- Persist accepted extraction suggestions to `tasks`.
- Persist strategy output to `event_strategies`.
- Avoid duplicate acceptance from the same analyzed result.
- Preserve data after browser refresh and bootstrap refetch.
- Show missing information clearly.
- Preserve current startup-event behavior while broadening support to the other interaction types.

## Non-Functional Requirements

- Reliable structured output parsing.
- Deterministic, replayable eval fixtures.
- Clear error states with retry.
- No silent fallback to mock data when the database or model call fails.
- Server-side only secret handling.
- Low enough latency for interactive use.
- Cost-aware model routing.
- Request-level observability for latency, retries, model name, and persistence result.

## Human Approval Requirements

- Task extraction suggestions must require an explicit user action before a task is created.
- Dismissal must not create a task.
- Edit must allow the user to change task details before approval.
- Strategy output must be reviewed by the user before prep or follow-up tasks are added.
- No automatic task creation from raw AI output without user approval.

## Privacy Requirements

- `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must never leave server-side code.
- The browser must never receive the Supabase service-role client.
- Raw user messages and generated AI content should be treated as sensitive application data.
- Prompt content should not be logged with secrets or environment values.
- Any retrieval layer added later must keep the database as the source of truth and avoid exposing unrelated user content across contexts.

## Success Metrics

- Extraction:
  - high precision on action-item detection;
  - low false-accept rate for non-action text;
  - low duplicate-accept rate;
  - high edit/dismiss responsiveness.
- Preparation:
  - high grounding accuracy;
  - no invented company, attendee, traction, or pricing facts;
  - useful interaction-specific recommendations;
  - acceptance of prep/follow-up tasks into the real task list.
- Platform:
  - p95 latency within a usable interactive threshold;
  - low parse failure rate;
  - stable refresh persistence;
  - no secret leakage;
  - measurable cost per request.

## Out Of Scope

- Gmail, WhatsApp, or Calendar ingestion connectors.
- File Search or vector-store implementation in production.
- Database schema changes.
- Multi-user auth and per-user access control.
- Automatic task creation without approval.
- Silent fallback to fake data if Supabase or OpenAI fails.
- Changing the existing event copilot database model.

## Acceptance Criteria

- Extraction output is structured, readable, and editable.
- Approved extracted tasks are created in Supabase and appear in the real task list.
- Duplicate acceptance from the same suggestion is blocked.
- Preparation strategies are produced per interaction type using only supplied facts.
- Strategy sections render consistently across all supported interaction types.
- Added prep/follow-up tasks persist and do not duplicate on repeat clicks.
- Refresh and refetch preserve the saved result.
- Eval fixtures exist for extraction, strategy, retrieval, and adversarial cases.
- A release can be gated on deterministic eval results before model or prompt changes are shipped.
