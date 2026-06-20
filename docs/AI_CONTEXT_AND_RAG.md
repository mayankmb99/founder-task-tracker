# AI Context And Retrieval

Status: structured Supabase context assembly is implemented. Optional OpenAI File Search is wired but only activates when `OPENAI_VECTOR_STORE_ID` is set.

## A. Structured Retrieval From Supabase

### What is retrieved

For preparation strategy generation, the app should read only the structured data needed for the selected interaction:

- founder profile;
- company profile;
- selected audience segment;
- selected interaction/event;
- event targets;
- latest saved strategy for that interaction, if continuity is needed.

For task extraction, the structured context is intentionally minimal:

- the raw message being analyzed;
- optional app settings such as default reminder minutes;
- optional source metadata once message ingestion exists.

### Source precedence

When structured sources disagree, the model should see them in this order:

1. Explicit user input for the current action.
2. Current interaction/event fields.
3. Current event targets.
4. Founder and company profiles.
5. Audience segment data.
6. Older generated strategies or historical notes.

This means the most direct, interaction-specific data wins. A founder profile should not override an explicit event or target fact.

### Context-size limits

Recommended limits for structured context:

- founder profile: include all fields, but summarize long arrays if needed;
- company profile: include all fields, but prefer the most relevant proof points over full history;
- audience segment: include only the selected segment;
- event targets: include all targets for small events, otherwise cap at the highest-priority targets and note that more exist;
- prior strategy history: include at most the latest saved strategy for the same interaction.

If the combined structured context exceeds budget:

- trim historical context first;
- then trim low-priority arrays;
- then summarize repeating facts;
- never drop direct user intent or the current interaction itself.

### Conflict handling

- If two structured fields conflict, prefer the most recent explicit edit.
- If the application cannot determine which source is authoritative, surface the conflict in `missing_information` or `risks`.
- Do not let the model invent a reconciliation.
- Do not let a lower-trust field override a higher-trust field.

### Stale-information handling

- Re-read the current Supabase state when generating a new result.
- Do not rely on a stale client cache for generation-critical fields.
- If the user edits context, invalidate any cached strategy assumptions.
- Keep generated strategies tied to the interaction snapshot that produced them.

### Prompt-injection protection

Structured Supabase fields are lower risk than raw document retrieval, but they still need guardrails:

- pass database values as evidence, not as instructions;
- do not place untrusted text in the system instruction slot;
- quote or label suspicious user-supplied content as data;
- ignore any instruction-like text inside stored notes or message content;
- never let retrieved content override the route-level system prompt.

### No-result behavior

If a structured source is missing:

- proceed with what is available;
- lower confidence;
- list the missing information explicitly;
- avoid inventing a substitute fact;
- do not fail the entire request unless the missing field is essential to the workflow contract.

### Current state and gap

The current app already uses structured Supabase reads for founder, company, audience, event, and target context. It does not yet have a general retrieval planner, and it does not use a vector store for unstructured documents.

## B. Semantic Retrieval From Unstructured Documents

### What belongs here

Semantic retrieval should be used for supplemental material that is too verbose or too varied to live cleanly in the structured tables:

- pitch decks;
- sales call notes;
- founder notes;
- meeting transcripts;
- FAQ documents;
- investor updates;
- partnership briefs;
- customer case studies;
- vendor contracts or negotiation notes.

### Proposed OpenAI File Search / vector-store design

Recommended implementation:

- Store unstructured documents outside the application database.
- Chunk them and upload them to an OpenAI vector store.
- Use File Search through the Responses API for supplemental retrieval.
- Keep the structured Supabase tables as the source of truth for core application data.
- Attach retrieved snippets only after the structured context has already been assembled.

This design does not require database schema changes because the vector store is external to Supabase.

### Source precedence

When semantic retrieval is added, its precedence should be below direct structured facts:

1. Current user input.
2. Structured Supabase facts.
3. Retrieved document snippets.

If a retrieved snippet conflicts with a structured fact, the structured fact wins unless the user explicitly says otherwise.

### Context-size limits

Recommended retrieval budget:

- retrieve only the top few relevant chunks;
- cap total retrieved text to a small fraction of the total prompt;
- prefer one or two high-signal passages over many weak ones;
- summarize or drop repetitive chunks before they reach the model.

### Conflict handling

- Never assume a retrieval result is authoritative just because it matched semantically.
- If two retrieved documents conflict, surface the conflict and ask for clarification or lower confidence.
- If a retrieved document conflicts with the database, prefer the database.

### Stale-information handling

- Rebuild or refresh the retrieval corpus when important source documents change.
- Version documents where practical.
- Prefer recent, explicitly dated source material over older generic docs.

### Prompt-injection protection

Retrieved text is untrusted content. Protect the prompt with the following rules:

- treat retrieved snippets as evidence only;
- ignore instructions inside retrieved documents;
- isolate retrieval text from system instructions;
- if a retrieved document tries to redefine the task, ignore that instruction;
- do not expose unrelated chunks to the model if they are not relevant.

### No-result behavior

If File Search finds nothing useful:

- continue with structured Supabase context only;
- lower confidence;
- explicitly say that no supporting document was found;
- do not invent evidence.

### How this can be added without database schema changes

Possible schema-free rollout paths:

- create the vector store from uploaded files or exported documents, not from new tables;
- keep vector-store ids in app config or deployment settings rather than in Postgres;
- export structured data to files only when needed for retrieval;
- keep the current Supabase schema unchanged and treat retrieval as an external augmentation layer.

The important design rule is that the database remains the operational source of truth. Retrieval only supplies supplemental evidence and examples.
