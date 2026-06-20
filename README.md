# Founder Task Tracker

Founder Task Tracker is a Next.js app with two AI workflows:

1. task extraction from manual text/messages
2. preparation strategy generation for founder meetings and events

It uses OpenAI’s Responses API with strict Structured Outputs and Supabase Postgres for persistence. The database schema is frozen: no migrations, no new tables/columns, and no schema edits.

## What the app does

- turns short text into actionable task suggestions
- lets you add, edit, or dismiss task suggestions
- stores accepted tasks in Supabase and keeps them in Today / Upcoming
- generates a grounded preparation strategy for sales, investor, partnership, vendor, customer-call, startup-event, conference, and other interaction types
- persists preparation strategies and strategy-derived tasks
- supports optional document retrieval through OpenAI File Search when configured

## AI workflows

### Task extraction

- route: `POST /api/extract-task`
- input: source text plus optional source metadata
- output: structured suggestion with actionability, owner, title, due date/time, confidence, missing information, and classification reason
- acceptance flow: Add to Tasks / Edit / Dismiss

### Preparation strategy

- route: `POST /api/generate-event-strategy`
- input: founder profile, company profile, audience segment, interaction, and targets
- output: structured strategy with positioning, introduction, pitch, prioritisation, proof points, questions, talking points, goals, prep items, follow-up actions, risks, missing info, confidence
- persistence: strategy is written to `event_strategies` after validation

## Model routing

The app uses one shared OpenAI client and resolves models in this order:

- Task extraction: `OPENAI_TASK_MODEL` → `OPENAI_MODEL` → `gpt-5-mini`
- Preparation strategy: `OPENAI_STRATEGY_MODEL` → `OPENAI_MODEL` → `gpt-5-mini`
- Eval judge: `OPENAI_EVAL_MODEL` → `OPENAI_STRATEGY_MODEL` → `OPENAI_MODEL` → `gpt-5-mini`

Reasoning effort is set per workflow in code. The current verified live fallback model during this pass was `gpt-5-mini-2025-08-07`.

Preferred models (`gpt-5.4-mini` for task extraction and `gpt-5.5` for strategy / judge) can be enabled through env overrides once they are verified in your account.

## Retrieval

Structured retrieval from Supabase is always available through the existing app data.

Document retrieval via OpenAI File Search is optional and only activates when `OPENAI_VECTOR_STORE_ID` is set. It was not configured during this implementation pass.

## Environment variables

Required:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `OPENAI_TASK_MODEL`
- `OPENAI_STRATEGY_MODEL`
- `OPENAI_EVAL_MODEL`
- `OPENAI_VECTOR_STORE_ID`

Never print these values to logs or commit them to git.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks and tests

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run eval:deterministic
npm run eval:task
npm run eval:strategy
```

The live eval scripts use the local dev server and clean up temporary test records after they run.

## Data provenance and guardrails

- task extraction never guesses a date, time, person, or deadline
- preparation generation only uses supplied founder, company, audience, interaction, and target facts
- unsupported proof points or suspicious invented claims are blocked before persistence
- task acceptance is blocked when a suggestion has already been added or dismissed
- all Supabase access stays server-side

## Current limitations

- document RAG is not configured unless `OPENAI_VECTOR_STORE_ID` is set
- task-to-interaction linkage is not persisted because the frozen schema has no supported relationship field
- some low-context preparation requests may still surface required missing information instead of a complete strategy
- the repository currently uses the configured fallback model; the preferred GPT-5.4 / GPT-5.5 routing is opt-in

## Roadmap

- verify and enable preferred model routing in production credentials
- add document retrieval once a vector store is configured
- expand evaluation coverage if new interaction types are added

## Demo / screenshots

- Demo link: _add here_
- Screenshots: _add here_

