# AI Failure Modes

Status: implemented as runtime checks and eval coverage. The app fails closed on malformed or suspicious AI output instead of silently persisting it.

## Overview

The AI layer should be designed to fail closed. If the model, retrieval, or persistence path is uncertain, the app should show a retryable error or a lower-confidence result rather than silently inventing or overwriting data.

## Failure Mode Catalog

| Failure mode | Typical cause | Detection | Preferred mitigation |
|---|---|---|---|
| Hallucinated company facts | Prompt too loose, missing grounding, overconfident model | Compare output against supplied company profile and proof points | Restrict to supplied facts, lower confidence, add adversarial evals |
| Invented traction | Model extrapolates from narrative into metrics | Search for unsupported numbers or claims | Prohibit numeric invention, keep proof points source-bound |
| Unsupported attendee claims | Model invents who is attending or what they want | Compare against target facts only | Only reference supplied people/companies/known needs |
| Incorrect date extraction | Date parsing or relative date resolution error | Review date format and relative-date cases | Resolve dates in the app timezone, validate ISO output |
| Ambiguous time handling | Message says “at 5” or “tomorrow morning” | Missing or vague time field | Leave time null or mark as missing information |
| Prompt injection | Untrusted text tries to override instructions | Look for instruction-like content inside user text or retrieved docs | Treat content as evidence only, ignore embedded instructions |
| Irrelevant retrieval | Semantic search returns loosely related chunks | Retrieval scores or manual review | Tighten query, cap chunks, prefer structured data |
| Stale documents | Retrieval corpus not refreshed after edits | Version mismatch or old timestamps | Refresh corpus on document updates |
| Conflicting sources | Profiles, docs, or targets disagree | Conflict surfaced in context assembly | Prefer source precedence and surface conflict explicitly |
| Malformed output | Model ignores schema or partial parse fails | Schema validation error | Use Structured Outputs, retry once if safe |
| Model timeout | Long reasoning or network delay | Abort/timeout error | Add timeout, retry safely, surface retry button |
| API failure | 429, 5xx, or connectivity issue | HTTP failure or SDK exception | Retry once for transient failures, fail closed otherwise |
| Duplicate task creation | Double-click, repeated retry, or weak dedupe | Existing matching task or suggestion claim | Use explicit approval state and application-level dedupe |
| Partial persistence failure | One write succeeds, another fails | Mismatch between generated result and saved state | Use recovery states, refetch, and best-effort reconciliation |

## Detailed Notes

### Hallucinated company facts

Risk:

- The model sounds specific but cites facts not present in the founder or company profile.

Mitigation:

- keep an explicit "known facts" block;
- make proof points source-bound;
- ask the model to list missing information rather than guessing;
- run adversarial cases that contain thin context.

### Invented traction

Risk:

- The model invents revenue, customers, funding, or usage numbers.

Mitigation:

- prohibit numeric invention in the prompt contract;
- only allow proof points already present in context;
- fail the eval if a new metric appears.

### Unsupported attendee claims

Risk:

- The model invents a target’s pain point or role-specific priority.

Mitigation:

- constrain target-specific guidance to the supplied role, company, known needs, and relevance reason;
- require exact name copying;
- surface missing target details when the context is thin.

### Incorrect date extraction and ambiguous time handling

Risk:

- relative dates are resolved incorrectly;
- vague times become invented exact values.

Mitigation:

- use the app timezone consistently;
- validate date and time strings before persistence;
- keep null when the time is not explicit enough.

### Prompt injection

Risk:

- user text or retrieved docs attempt to change the model’s operating rules.

Mitigation:

- separate system instructions from evidence;
- ignore instructions inside retrieved content;
- keep a hard-coded prompt contract;
- test with adversarial fixtures.

### Irrelevant retrieval and stale documents

Risk:

- the retrieval layer adds noise or outdated facts.

Mitigation:

- prefer structured database facts first;
- cap retrieval chunks;
- refresh the corpus on updates;
- exclude low-signal documents from retrieval.

### Malformed output, API failure, and timeout

Risk:

- the app cannot parse the response or cannot reach the API.

Mitigation:

- enforce Structured Outputs;
- add a reasonable timeout;
- retry only once for transient errors;
- show a clear retry path and preserve the user’s draft.

### Duplicate task creation

Risk:

- the same suggestion is accepted twice or the same bulk-add is repeated.

Mitigation:

- keep an explicit approval state;
- dedupe at the application layer;
- block repeat acceptance;
- refetch after persistence to confirm only one task exists.

### Partial persistence failure

Risk:

- the AI result exists in memory but one of the writes fails.

Mitigation:

- make the unsaved state visible;
- preserve the generated result;
- allow retry without recomputing the model output if possible;
- refetch to reconcile the final state.
