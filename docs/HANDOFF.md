# Project Handoff — Founder Task Tracker / Founder Event Copilot

This document is for moving development of this repository from Claude Code to Codex (or any other agent/engineer). Read this fully before changing anything.

---

## 1. Product overview

- **Product name:** Founder Task Tracker (internally also called "TaskBar" in code comments), with its flagship feature being the **Founder Event Copilot**.
- **One-line value proposition:** A task tracker for founders that also acts as an AI copilot which turns a founder's long-term context (who they are, what their company does, who they're targeting) into a personalised strategy and ready-to-do task list for any specific upcoming event.
- **Current core use cases:**
  1. Manually track and complete tasks (today/upcoming/completed).
  2. Paste a raw message (e.g. an email or WhatsApp text) and have AI extract whether it contains an action item — currently a standalone test tool, not yet wired into the task list (see Section 12).
  3. Maintain a founder profile, company profile, and one or more audience segments as durable context.
  4. For a specific event (e.g. a startup expo) with named target people/companies, generate an AI event strategy: positioning, founder introduction, company pitch, per-person pitch angles, talking points, questions to ask, proof points to use, and concrete preparation/follow-up actions.
  5. Convert the AI's preparation/follow-up recommendations into real tasks with one click, without creating duplicates on repeated clicks.
- **Intended hackathon demo story:** "I'm a founder going to a startup expo. The app already knows who I am, what my company does, and who I'm trying to reach. I tell it about this specific event and the people I'll meet, click one button, and it gives me a personalised game plan — then turns that plan into tasks on my actual to-do list, all of which persist if I close and reopen the app."
- **Current USP:** The event-strategy generation is genuinely personalised — it combines founder profile + company profile + audience segment + event details + named targets into one OpenAI call with a strict JSON schema, producing a strategy that differs per target person (a distinct `pitch_angle` per person) and explicitly flags missing information instead of hallucinating facts.

---

## 2. Current product flows

### A. AI task extraction
- User pastes a free-text message into the "Temporary: Test AI Task Extraction" box (`src/components/AiTestPanel.tsx`), shown above the Suggestions list.
- The component calls `POST /api/extract-task` (`src/app/api/extract-task/route.ts`), which sends the message to the OpenAI Responses API with a strict JSON schema (`EXTRACTION_SCHEMA`) and returns a structured result: `is_action_item`, `task_owner`, `task_title`, `due_date`, `due_time`, `action_type`, `confidence`, `missing_information`, `reason_for_classification`.
- **Current issue (confirmed by reading the code, not assumed):** `AiTestPanel.tsx` renders the raw JSON result in a `<pre>` block (lines 71–75) and does nothing else with it. There is **no** "Add to Tasks" / "Edit" / "Dismiss" action wired to this result, and nothing is written to the `task_suggestions` or `tasks` tables from this flow. The component's own comment literally says: *"Temporary manual test tool for the AI task-extraction endpoint. Remove this component once real message ingestion (Gmail/WhatsApp) exists."* This is the single highest-priority gap — see Section 13.

### B. Founder Event Copilot
1. **Founder profile** — edited in `src/components/context/FounderProfileForm.tsx` (under "My Context" tab), auto-saved via `PUT /api/founder-profile`.
2. **Company profile** — edited in `src/components/context/CompanyProfileForm.tsx`, auto-saved via `PUT /api/company-profile`.
3. **Audience segment(s)** — edited in `src/components/context/AudienceSegmentsSection.tsx`, saved via `PUT /api/audience-segments` (replaces the whole array each time; reconciles client-temp ids against real DB UUIDs).
4. **Event** — currently seeded data only (one demo event, "Metro Startup Expo 2026"); there is no UI to create a new event yet. Selected/displayed in `src/components/events/EventsPage.tsx`.
5. **Event targets** — the named people/companies attached to the selected event, rendered via `src/components/events/EventTargetCard.tsx`; also seed-only, no creation UI yet.
6. **Generate Event Strategy** — button in `EventsPage.tsx` calls `POST /api/generate-event-strategy` (`src/app/api/generate-event-strategy/route.ts`), which builds a prompt from founder + company + audience + event + targets, calls OpenAI with a strict schema, persists the result to `event_strategies`, and renders it via `src/components/events/EventStrategyView.tsx`.
7. **Add preparation tasks** — button in `EventsPage.tsx`; bulk-creates tasks from `strategy.preparationItems` via `POST /api/tasks/bulk` with a per-event dedupe key (`event:<eventId>:prep`) so repeated clicks do not create duplicates.
8. **Add follow-up tasks** — same mechanism with dedupe key `event:<eventId>:followup`.

### C. Task tracker
- **Manual tasks** — created via the "+" button in the sidebar, opens `src/components/TaskModal.tsx`, saved via `POST /api/tasks` (create) or `PUT /api/tasks` (edit).
- **Today / Upcoming / Completed** — derived client-side in `src/app/page.tsx` from the loaded `tasks` array, filtered by `dueDate` and `status`, rendered with `src/components/TaskCard.tsx`.
- **Persistence through Supabase** — all task CRUD (`src/app/api/tasks/route.ts` for single tasks, `src/app/api/tasks/bulk/route.ts` for bulk add) reads/writes the `tasks` table directly; `src/app/page.tsx` does optimistic local updates with rollback on API failure.

---

## 3. Tech stack

- **Next.js:** 16.2.9 (App Router, Turbopack)
- **React:** 19.2.4
- **TypeScript:** ^5 (strict mode, project-wide `npx tsc --noEmit` is the source of truth)
- **Tailwind CSS:** ^4 (via `@tailwindcss/postcss`)
- **OpenAI:** `openai` SDK ^6.44.0, using the **Responses API** (`client.responses.create`) with **Structured Outputs** (`text.format.type: "json_schema", strict: true`)
- **Supabase:** `@supabase/supabase-js` ^2.108.2, Postgres, accessed only via the service-role key from server-side route handlers
- **Git / GitHub:** repository is a git repo on branch `main`, remote `origin` = `https://github.com/mayankmb99/founder-task-tracker.git`
- **Local development URL:** `http://localhost:3000` (`npm run dev`)

---

## 4. Repository structure

Paths below were confirmed by reading the actual repository, not inferred.

| Path | What it does |
|---|---|
| `src/app/page.tsx` | The single client-side orchestration component. On mount, fetches `GET /api/bootstrap` to load all app data; owns all top-level state (`tasks`, `settings`, `founderProfile`, `companyProfile`, `audienceSegments`, `events`, `strategiesByEvent`); renders the sidebar + main content switch; implements debounced auto-save for My Context forms and optimistic-update-with-rollback for task CRUD; passes `onAddTasksBulk` down to `EventsPage`. |
| `src/app/api/extract-task/route.ts` | `POST` — sends a raw message to OpenAI with `EXTRACTION_SCHEMA`, returns the structured task-candidate JSON. Stateless: does not write to any table. |
| `src/app/api/generate-event-strategy/route.ts` | `POST` — builds a prompt from founder/company/audience/event/targets, calls OpenAI with `STRATEGY_SCHEMA`, maps the result to the app's camelCase `EventStrategy` type, persists it to `event_strategies` (delete-then-insert per event so only the latest survives), and returns `{ result, persisted }`. |
| `src/app/api/bootstrap/route.ts` | `GET` — seeds the DB once (idempotent, row-count-checked) for the demo user, then runs 8 parallel Supabase reads (tasks, settings, founder/company profiles, audience segments, events, event targets, event strategies) and returns one combined payload that `page.tsx` loads on mount. |
| `src/app/api/tasks/route.ts` | `POST` (create), `PUT` (update — sets `completed_at` based on status), `DELETE` — single-task CRUD against the `tasks` table, scoped to `user_id`. |
| `src/app/api/tasks/bulk/route.ts` | `POST` — inserts a batch of tasks tagged with a `dedupeKey` stored in the `tasks.related_person` column; if any row with that dedupe tag already exists, the whole batch is skipped (`{ skipped: true }`) instead of inserted again. |
| `src/app/api/settings/route.ts` | `PUT` — true upsert (`onConflict: "user_id"`) against the `settings` table. |
| `src/app/api/founder-profile/route.ts` | `PUT` — true upsert against `founder_profiles`. |
| `src/app/api/company-profile/route.ts` | `PUT` — true upsert against `company_profiles`. |
| `src/app/api/audience-segments/route.ts` | `PUT` — takes the entire audience-segments array, syncs it against the DB (update real-UUID rows, insert client-temp-id rows, delete anything no longer present), returns the canonical list with real DB ids. |
| `src/lib/supabaseServer.ts` | The **only** file that reads `SUPABASE_SERVICE_ROLE_KEY`. Exports `supabaseServer` (the Supabase client) and `DEMO_USER_ID = "demo-founder"`. Throws at import time if `typeof window !== "undefined"`, to prevent accidental client-bundle inclusion. |
| `src/lib/dbMappers.ts` | Pure functions mapping DB snake_case rows to app camelCase types and back: `taskSourceToDb`, `taskFromDb`, `settingsFromDb`, `founderProfileFromDb`, `companyProfileFromDb`, `audienceSegmentFromDb`, `eventTargetFromDb`, `eventFromDb`, `eventStrategyFromDb`. |
| `src/lib/types.ts` | All shared TypeScript types: `Task`, `Suggestion`, `Settings`, `FounderProfile`, `CompanyProfile`, `AudienceSegment`, `EventTarget`, `EventType`, `EventRecord`, `PersonToPrioritise` (`personName`, `reason`, `pitchAngle`), `EventStrategy`. |
| `src/lib/mockData.ts` | Seed/demo data: `initialTasks`, `initialSuggestions`, `initialSettings`, `initialFounderProfile`, `initialCompanyProfile`, `initialAudienceSegments`, `initialEvents`. Used by `bootstrap/route.ts` to seed an empty database exactly once. |
| `src/components/context/MyContextPage.tsx` | Tab switcher for Founder / Company / Audience forms; passes data and `onChange` handlers straight through from `page.tsx`. |
| `src/components/context/FounderProfileForm.tsx` | Editable founder profile fields. |
| `src/components/context/CompanyProfileForm.tsx` | Editable company profile fields. |
| `src/components/context/AudienceSegmentsSection.tsx` | Add/edit/delete audience segments; always calls `onChange` with the full mutated array. |
| `src/components/context/FieldInput.tsx` | Shared labeled-input building block used by the context forms. |
| `src/components/events/EventsPage.tsx` | Event selector + detail view, "Generate Event Strategy" button, renders `EventStrategyView`, owns the "Add preparation tasks" / "Add follow-up tasks" buttons (disabled + relabeled once added per event). |
| `src/components/events/EventStrategyView.tsx` | Read-only render of a generated `EventStrategy`, including the per-target `pitchAngle`. |
| `src/components/events/EventTargetCard.tsx` | Card rendering one target person/company for the selected event. |
| `src/components/TaskCard.tsx` | Renders one task row with complete/edit/delete actions. |
| `src/components/TaskModal.tsx` | Create/edit modal for a single task. |
| `src/components/SuggestionCard.tsx` | Renders one AI suggestion with Add/Edit/Dismiss buttons — **this is the pattern the extract-task flow should eventually reuse** (see Section 13), currently wired only to the unrelated mock `initialSuggestions` data, not to `/api/extract-task`. |
| `src/components/AiTestPanel.tsx` | The temporary raw-JSON test tool described in Section 2A. |
| `src/components/Sidebar.tsx` | Left-nav tab switcher (`today`, `upcoming`, `suggestions`, `completed`, `mycontext`, `events`, `settings`) with per-tab counts. |
| `src/components/SettingsPanel.tsx` | Notification toggle + default reminder minutes, saved via `PUT /api/settings`. |
| `src/components/Toast.tsx` | Transient toast notification used for save confirmations/errors. |
| `src/components/icons.tsx` | Shared inline SVG icon components. |
| `supabase/schema.sql` | Full schema for a fresh Supabase project — all 10 tables, idempotent (`if not exists` / `on conflict do nothing`), with the RLS-disabled security note documented inline. |
| `supabase/migrations/003_founder_event_copilot.sql` | The only migration file present in the repo. Adds `founder_profiles`, `company_profiles`, `audience_segments`, `events`, `event_targets`, `event_strategies` to a database that already has the original 4 tables from `schema.sql`. (Numbered 003 — the base 4 tables were applied directly from `schema.sql`, not as numbered migration files 001/002 in this repo.) |

---

## 5. Database

All tables are confirmed by reading `supabase/schema.sql` directly.

### `source_messages`
- **Purpose:** Raw incoming messages from Gmail/WhatsApp/Calendar before AI processing.
- **Important fields:** `source` (`gmail`/`whatsapp`/`calendar`), `source_message_id`, `thread_id`, `sender`, `subject`, `content`, `processing_status` (`pending`/`processed`/`failed`), `metadata` (jsonb).
- **Relationships:** referenced by `tasks.source_message_record_id` and `task_suggestions.source_message_record_id`.
- **Duplicate constraints:** `unique (user_id, source, source_message_id)` — the same inbound message can never be stored twice.
- **App usage:** **Not currently read or written by any route.** No Gmail/WhatsApp/Calendar ingestion exists yet (see Section 12).

### `task_suggestions`
- **Purpose:** AI-extracted task candidates awaiting Add/Edit/Dismiss.
- **Important fields:** `is_action_item`, `task_owner`, `task_title`, `due_date`, `due_time`, `action_type`, `confidence`, `missing_information` (text[]), `target_task_id`, `status` (`pending`/`added`/`dismissed`).
- **Relationships:** `source_message_record_id` → `source_messages.id` (unique — at most one suggestion per message); `target_task_id` → `tasks.id`, filled in once accepted.
- **Duplicate constraints:** `unique (source_message_record_id)`.
- **App usage:** **Not currently read or written by any route.** `/api/extract-task` does not persist its result here — this is the core of the gap in Section 13.

### `tasks`
- **Purpose:** The user's real task list.
- **Important fields:** `title`, `source` (`gmail`/`whatsapp`/`calendar`/`manual`), `due_date`, `due_time`, `reminder_minutes` (5/10/15/30 only), `task_owner`, `related_person` (repurposed as a dedupe tag for bulk-added prep/follow-up tasks — see `src/app/api/tasks/bulk/route.ts`), `status` (`pending`/`completed`), `completed_at`.
- **Relationships:** `source_message_record_id` → `source_messages.id` (nullable, set null on delete).
- **Duplicate constraints:** none beyond the primary key; dedupe for bulk adds is enforced at the application layer via `related_person`, not a DB constraint.
- **App usage:** Fully read/written — `GET /api/bootstrap`, `POST/PUT/DELETE /api/tasks`, `POST /api/tasks/bulk`.

### `settings`
- **Purpose:** One row of app preferences per user.
- **Important fields:** `notifications_enabled`, `default_reminder_minutes`, `timezone`, `gmail_connected`, `whatsapp_connected`.
- **Relationships:** none.
- **Duplicate constraints:** `unique (user_id)` — enables true upsert.
- **App usage:** Read in `GET /api/bootstrap`, written via `PUT /api/settings`. A row exists for `demo-founder` only after the first time the user changes a setting via the app, OR if it was pre-seeded by `schema.sql`'s own `insert ... on conflict do nothing` statement (so it may already exist in the live Supabase project even before any app interaction).

### `founder_profiles`
- **Purpose:** Long-term founder context fed into every event-strategy generation.
- **Important fields:** `founder_name`, `role`, `professional_summary`, `relevant_experience` (jsonb array), `strengths` (jsonb array), `achievements` (jsonb array), `communication_style`.
- **Relationships:** none.
- **Duplicate constraints:** `unique (user_id)`.
- **App usage:** Read in `GET /api/bootstrap`, written via `PUT /api/founder-profile`.

### `company_profiles`
- **Purpose:** Long-term company context fed into every event-strategy generation.
- **Important fields:** `company_name`, `company_description`, `product_or_service`, `problem_solved`, `value_proposition`, `differentiation`/`traction`/`customers`/`proof_points`/`case_studies` (all jsonb arrays).
- **Relationships:** none.
- **Duplicate constraints:** `unique (user_id)`.
- **App usage:** Read in `GET /api/bootstrap`, written via `PUT /api/company-profile`.

### `audience_segments`
- **Purpose:** One or more target-audience definitions a founder can reuse across events.
- **Important fields:** `name`, `roles`/`company_types`/`problems`/`needs`/`objections`/`desired_outcomes` (all jsonb arrays).
- **Relationships:** conceptually linked to `events` (an event targets one audience segment), but **no foreign key exists** — see the schema gap noted in Section 12.
- **Duplicate constraints:** none — `user_id` is intentionally not unique here (a user can have multiple segments).
- **App usage:** Read in `GET /api/bootstrap`, written via `PUT /api/audience-segments` (whole-array sync).

### `events`
- **Purpose:** A specific event the founder is preparing for.
- **Important fields:** `external_event_id`, `event_type` (free text, default `startup_expo`), `event_name`, `event_description`, `event_start`, `event_location`, `user_goal`, `additional_context`.
- **Relationships:** referenced by `event_targets.event_id` and `event_strategies.event_id` (both cascade-delete). **No `audience_segment_id` column** — the app's `EventRecord.audienceSegmentId` is resolved at the application layer in `bootstrap/route.ts` by falling back to the first/only audience segment, not by a real FK.
- **Duplicate constraints:** none.
- **App usage:** Read in `GET /api/bootstrap`. No create/update/delete route exists yet — events are seed-data only at present.

### `event_targets`
- **Purpose:** People/companies the founder may meet at a specific event.
- **Important fields:** `event_id`, `person_name`, `role`, `company_name`, `company_description`, `known_needs` (jsonb array), `relevance_reason`, `priority` (`high`/`medium`/`low`), `status` (`not_contacted`/`contacted`/`met`).
- **Relationships:** `event_id` → `events.id`, cascade delete.
- **Duplicate constraints:** none.
- **App usage:** Read in `GET /api/bootstrap` (joined onto each event). No standalone create/update/delete route — seed-data only.

### `event_strategies`
- **Purpose:** The AI-generated strategy for a specific event; re-generatable over time.
- **Important fields:** `event_id`, `positioning_summary`, `founder_introduction`, `company_pitch`, `people_to_prioritise` (jsonb array — each item now includes `pitch_angle`), `proof_points_to_use`, `questions_to_ask`, `talking_points`, `conversation_goals`, `preparation_items`, `follow_up_actions`, `risks`, `missing_information`, `confidence`.
- **Relationships:** `event_id` → `events.id`, cascade delete.
- **Duplicate constraints:** **None on `event_id`, by design** — the schema comment states the app keeps the most recent row as the active strategy. `generate-event-strategy/route.ts` enforces "one strategy per event" at the application layer via delete-then-insert, not a DB constraint.
- **App usage:** Read in `GET /api/bootstrap` (keeping only the newest row per event), written via `POST /api/generate-event-strategy`.

### Cross-cutting database rules
- **`user_id = 'demo-founder'`** is hardcoded as `DEMO_USER_ID` in `src/lib/supabaseServer.ts` and used to scope every query in every route. There is no authentication system.
- **RLS is currently off** on every table, intentionally, per the comment block at the top of `supabase/schema.sql`. This is only safe because every table is `user_id`-scoped and **all access happens server-side**.
- **All database access must remain server-side.** Only files under `src/app/api/**` and `src/lib/supabaseServer.ts` should ever import `supabaseServer`.
- **The Supabase service-role key must never enter client code.** `supabaseServer.ts` enforces this with a runtime guard that throws if imported where `window` is defined.

---

## 6. Migrations already run

- **Base schema** (`supabase/schema.sql`): creates `source_messages`, `tasks`, `task_suggestions`, `settings` (the original 4 tables), plus the demo `settings` seed row. This was applied directly via the Supabase SQL Editor (not tracked as a separate numbered migration file in this repo).
- **`supabase/migrations/003_founder_event_copilot.sql`** — the only migration file present. Adds `founder_profiles`, `company_profiles`, `audience_segments`, `events`, `event_targets`, `event_strategies` (the Event Copilot tables). Idempotent (`if not exists` throughout).

**The Event Copilot tables are already present in the live Supabase project** — this has been confirmed by live reads/writes against them during regression testing (see Section 10), not just by reading the migration file. No migration needs to be (re-)run before continuing work.

---

## 7. Environment variables

Variable names only — no values are included anywhere in this document or were printed while preparing it.

| Variable | Public/Secret | Where used |
|---|---|---|
| `OPENAI_API_KEY` | **Secret** | `src/app/api/extract-task/route.ts`, `src/app/api/generate-event-strategy/route.ts` — server-side only |
| `OPENAI_MODEL` | Not secret (just a model name string) | Same two routes; falls back to `"gpt-5-mini"` if unset |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (by `NEXT_PUBLIC_` convention) | `src/lib/supabaseServer.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (anon key is meant to be public) | Provisioned in `.env.local` but **not currently read anywhere in the codebase** — the app does all Supabase access via the service-role key from server code, never the anon key from the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret — highest sensitivity in this project** | `src/lib/supabaseServer.ts` only; bypasses RLS entirely |

- `.env.local` is gitignored (confirmed: `.gitignore` contains `.env*`).
- `.env.local.example` contains placeholder/empty values only (`OPENAI_MODEL=gpt-5-mini` is the only non-empty default; all others are blank).
- Do not print, read back, log, or expose any real value from `.env.local` at any point.

---

## 8. OpenAI usage

- **Model variable:** `process.env.OPENAI_MODEL`, falling back to `"gpt-5-mini"` if unset. Used identically in both AI routes.
- **`src/app/api/extract-task/route.ts`:** Classifies a single pasted message into a structured task candidate (`EXTRACTION_SCHEMA`). System prompt resolves relative dates ("tomorrow") against the current Asia/Kolkata date, explicitly forbids inventing a date/time, requires `missing_information` to list any field it couldn't confidently determine, and requires low confidence for vague/hypothetical statements.
- **`src/app/api/generate-event-strategy/route.ts`:** Generates a full event strategy (`STRATEGY_SCHEMA`) from founder + company + audience + event + targets. System prompt (`SYSTEM_PROMPT` constant) enforces:
  - **Anti-hallucination rules:** "Never invent customers, traction numbers, achievements, attendee facts, or company information that was not supplied," and "Only reference proof points, case studies, customers, or achievements that literally appear in the supplied KNOWN FACTS."
  - **Missing-information handling:** "If information needed for a good recommendation is missing ... list it in missing_information instead of filling the gap with a guess."
  - **Facts vs. recommendations:** the prompt explicitly labels the input block "KNOWN FACTS" and instructs the model that everything else it produces is a recommendation built on top of those facts.
  - **Target-specific pitch-angle support:** each entry in `people_to_prioritise` includes a `pitch_angle` field (schema-required), and the prompt explicitly instructs: "Give each person in people_to_prioritise a distinct pitch_angle tailored to their role and situation. Do not reuse the same angle wording across people with clearly different roles."
- Both routes use `text.format.type: "json_schema", strict: true`, so the model's output is guaranteed to match the declared schema shape exactly (`additionalProperties: false` on every object).

---

## 9. Supabase persistence status

Confirmed currently persisting to Supabase (verified by live API calls + refetch during regression testing, not just by reading code):
- Tasks: create, edit, complete/uncomplete, delete.
- Reminder minutes: stored per task (`reminder_minutes`) and per user default (`settings.default_reminder_minutes`).
- Founder profile, company profile, audience segments: full edit persistence with debounced auto-save.
- Events, event targets: read-only from seed data currently (no create/update/delete route exists for these yet).
- Event strategies: generated and persisted (delete-then-insert per event), survives refresh.
- Preparation tasks, follow-up tasks: bulk-inserted via `/api/tasks/bulk` with per-event dedupe keys; persist and do not duplicate on repeated "Add" clicks.
- Settings: persisted via upsert.

**Bootstrap flow:** `GET /api/bootstrap` (`src/app/api/bootstrap/route.ts`) is called once on app mount by `page.tsx`. It first calls `seedIfEmpty()`, which checks row counts/existence per table for the demo user before inserting any seed data from `src/lib/mockData.ts` — this makes seeding safe to run on every cold load without ever creating duplicate rows. It then runs 8 parallel Supabase queries and returns one combined JSON payload.

**One-time seed behaviour:** Confirmed idempotent — re-running bootstrap against an already-seeded database does not insert anything new (verified during regression testing).

**Duplicate-task dedupe keys:** Stored in the otherwise-unused `tasks.related_person` column. Current keys in use: `event:<eventId>:prep` and `event:<eventId>:followup`. `POST /api/tasks/bulk` checks for any existing row with the submitted `dedupeKey` before inserting; if found, the whole batch is skipped and `{ skipped: true }` is returned.

**Loading/saving/error states:** `page.tsx` shows a full-screen "Loading your data…" state while bootstrap is in flight, and a retry-button error screen if it fails. My Context forms show a "Saving…" → "✓ Saved" / "⚠ Failed to save" badge (`SaveStatusBadge` component in `page.tsx`) driven by per-section save status state.

**Data survives refresh:** Confirmed — tasks, founder/company profiles, audience segments, settings, and generated event strategies were all independently re-fetched via a fresh `GET /api/bootstrap` after each mutation and found unchanged from what was just saved.

---

## 10. Tests completed

### Actually executed via live API/curl against the running dev server and the real configured Supabase project
- Task CRUD (create/update/delete) — persistence verified via independent refetch after each operation.
- My Context persistence — founder profile edit and audience segment add, verified via refetch, including real DB-UUID assignment for newly added segments.
- Event strategy generation and persistence — `persisted: true` returned, strategy confirmed present after a separate refetch.
- Preparation/follow-up task bulk-add — first call inserted (7 prep, 5 follow-up tasks in the last run), second call with the same dedupe key correctly returned `{ skipped: true }` with zero new rows; confirmed no duplicates via refetch.
- Supabase read-failure handling — simulated by pointing `NEXT_PUBLIC_SUPABASE_URL` at an unreachable host; `GET /api/bootstrap` eventually returned a generic `500` (no secret/internal detail leaked) after approximately 43 seconds (see gap in Section 12).
- Supabase write-failure handling — under the same simulated outage, `POST /api/tasks` failed fast (~0.1s) with a generic `500`.
- Database connectivity — confirmed live reads/writes against the real Supabase project after restoring the correct URL.
- AI extraction correctness — multiple scenarios (full context, missing context, weak/irrelevant experience) tested via direct calls to `/api/extract-task` and `/api/generate-event-strategy`, with real OpenAI responses inspected by hand for hallucination and calibration.
- Target-specific positioning — confirmed via a live call returning genuinely distinct `pitch_angle` values across three differently-roled targets (cohort/ecosystem framing vs. time-saving workflow framing vs. structured vendor-conversation framing).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` — all run and passed clean (one harmless unused-import lint warning was found and fixed).

### Verified through code inspection only (not executed)
- `source_messages` and `task_suggestions` tables are unused by any route — confirmed by reading every route file, not by a runtime test (there is nothing to execute).
- The `AiTestPanel.tsx` raw-JSON-only behavior — confirmed by reading the component and its comment.

### Manually verified by the user
- None recorded as explicitly user-confirmed in this repository's history at the time of writing; the user has been actively driving and reviewing each step.

### Not executable because browser automation was unavailable
- Full click-through browser UI flow (no browser-automation tool was available in this environment). Exact manual steps were provided to the user instead — see the "Exact browser steps" content from the prior regression report, summarized here:
  1. Load the app, confirm data loads.
  2. Edit My Context, refresh, confirm it stuck.
  3. Generate an event strategy, refresh, confirm it persists.
  4. Click Add preparation/follow-up tasks twice each, confirm no duplicates appear in Today/Upcoming.
  5. Complete/delete a task, refresh, confirm it stuck.

### Final status summary
| Area | Status |
|---|---|
| AI task extraction (classification correctness) | PASS (multiple scenarios, live-tested) |
| Missing-context / hallucination safeguards | PASS (live-tested, no fabricated facts observed) |
| Target-specific positioning | PASS (live-tested, distinct angles confirmed) |
| Duplicate strategy/task handling | PASS (delete-then-insert for strategies; dedupe-key skip for bulk tasks, both live-tested) |
| Supabase persistence (tasks, context, strategies) | PASS (live-tested via refetch) |
| Read/write failure handling | PASS, with a noted UX gap (43s hang on read failure) |
| Database connectivity | PASS (live-tested) |
| TypeScript / lint / production build | PASS (all three commands run clean) |

---

## 11. Bugs already fixed

- **Missing per-target pitch angle:** originally the strategy schema had only one global `company_pitch`, with no mechanism to differentiate pitch framing per target person. Fixed by adding a required `pitch_angle` field to `PersonToPrioritise` (`src/lib/types.ts`) and `PERSON_SCHEMA` (`generate-event-strategy/route.ts`), plus a system-prompt rule requiring distinct angles per differently-roled target, then rendering it in `EventStrategyView.tsx`. Re-verified live.
- **Duplicate preparation/follow-up task creation:** clicking "Add preparation tasks" / "Add follow-up tasks" twice originally created duplicate tasks with new ids but identical titles. Fixed by adding `prepTasksAdded`/`followUpTasksAdded` state in `EventsPage.tsx` (disabling the button and relabeling it "✓ ... added"), backed by a server-side dedupe-key check in `POST /api/tasks/bulk` so duplicates are blocked even if the UI state is ever bypassed (e.g. after a page refresh before the button re-syncs).
- **Missing Supabase persistence:** the app originally held all state in React-only `useState` seeded from `src/lib/mockData.ts`, with no database writes at all. Fixed by building the full persistence layer described in Sections 4–9: `supabaseServer.ts`, `dbMappers.ts`, the bootstrap route, and per-resource CRUD/upsert routes, then rewiring `page.tsx` and `EventsPage.tsx` to load from and save to these routes instead of local-only state.
- **Lint warning (minor):** an unused `initialSettings` import in `src/app/api/bootstrap/route.ts` was flagged by `npm run lint` and removed (settings are not seeded by bootstrap — they're created lazily on first user edit, or pre-seeded directly by `schema.sql`'s own insert statement).

No other functional fixes are recorded in this repository's history beyond the three initial commits (`Initial commit from Create Next App`, `Phase 1 complete - task tracker UI`, `Added OpenAI task extraction`) and the uncommitted Event Copilot + persistence work described above.

---

## 12. Known gaps and limitations

- **The AI task-extraction Test box currently shows raw JSON but does not create a real task.** (`src/components/AiTestPanel.tsx` — confirmed by reading the component.)
- **No Add/Edit/Dismiss flow exists for extracted suggestions** — `SuggestionCard.tsx` exists and implements this UI pattern, but it is wired only to the unrelated `initialSuggestions` mock data, not to `/api/extract-task` output.
- **No `audience_segment_id` column on `events`** — the current fallback in `bootstrap/route.ts` links every event to the first/only audience segment. A real fix requires a migration (`ALTER TABLE events ADD COLUMN audience_segment_id uuid references audience_segments(id)`), which has **not** been applied and needs explicit sign-off before doing so.
- **`GET /api/bootstrap` read failure can take ~43 seconds** before returning an error, because `seedIfEmpty()` plus 8 parallel queries each retry DNS resolution under an outage before failing — there is no request timeout/`AbortController` wrapper.
- **The `settings` row is created only after the first user change** via the app (unless it was pre-seeded directly by `schema.sql`'s own insert statement) — `bootstrap/route.ts` does not seed `settings`.
- **Gmail integration is not built** — `source_messages.source = 'gmail'` and `settings.gmail_connected` exist in the schema but no ingestion code exists.
- **WhatsApp integration is not built** — same situation, `source = 'whatsapp'` / `settings.whatsapp_connected`.
- **Google Calendar integration is not built** — `source = 'calendar'` exists in the schema's check constraints but no ingestion code exists.
- **No browser automation tests** — all testing this session was via direct API calls (curl) plus code inspection; no Playwright/Cypress/etc. exists in the repo.
- **Single demo user only** — `DEMO_USER_ID = "demo-founder"` is hardcoded; there is no login, session, or per-user routing.
- **RLS/Auth not configured** — by design for this hackathon build (see Section 5); must be added before any real multi-user deployment.

---

## 13. Highest-priority next task

**Connect the AI task-extraction Test flow to the real product.**

Concretely, this means:
- Replace the raw-only JSON `<pre>` block in `AiTestPanel.tsx` (or build a new component reusing the `SuggestionCard.tsx` pattern) with a readable suggestion card showing the extracted title, due date/time, owner, and confidence.
- Show **Add to Tasks / Edit / Dismiss** actions on that card.
- On **Add to Tasks**: save the accepted task to the `tasks` table via the existing `POST /api/tasks` route (no new route needed for this part).
- Save or update the corresponding `task_suggestions` row where appropriate — likely requires a new route (e.g. `POST /api/task-suggestions` or extending `/api/extract-task` itself to persist the suggestion row), since no route currently writes to `task_suggestions` at all.
- Support editing missing-information fields (e.g. due date) before accepting, reusing the existing `TaskModal.tsx` if practical.
- Prevent duplicate acceptance of the same suggestion (e.g. mark `task_suggestions.status = 'added'` and disable further Add clicks for that suggestion, mirroring the `prepTasksAdded`/`followUpTasksAdded` pattern already used in `EventsPage.tsx`).
- Confirm the accepted task shows up in **Today** or **Upcoming** immediately (optimistic update, same pattern as `handleSaveTask` in `page.tsx`).
- Confirm persistence after a full page refresh (refetch via `/api/bootstrap` and verify the task is still there).

---

## 14. Recommended next steps in order

1. Fix the AI extraction approval-to-task flow (Section 13).
2. Manually verify the full browser flow end-to-end (no automation tool was available — this needs a human or a future agent with browser access).
3. Commit and push a stable checkpoint (current working tree has substantial uncommitted work — see Section 16).
4. Decide whether to add Google Calendar ingestion.
5. Add Gmail OAuth if time permits.
6. Prepare README, demo script, AI Impact Statement, and slides for the hackathon presentation.

---

## 15. Exact local commands

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev

# TypeScript check (no emitted files, just error checking)
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build

# Check git status
git status
```

---

## 16. Git status

(As inspected at the time this document was written — re-run `git status` yourself before acting on this, since it will change as work continues.)

- **Current branch:** `main`, up to date with `origin/main` (no local commits ahead/behind at the time of writing — all listed changes below are uncommitted working-tree changes).
- **Modified (tracked) files:**
  - `package-lock.json`
  - `package.json` (added `@supabase/supabase-js` dependency)
  - `src/app/page.tsx`
  - `src/components/Sidebar.tsx`
  - `src/lib/mockData.ts`
  - `src/lib/types.ts`
- **Untracked files/directories:**
  - `handoff.md` (an earlier, narrower handoff note written before this document — superseded by `docs/HANDOFF.md`)
  - `src/app/api/audience-segments/`
  - `src/app/api/bootstrap/`
  - `src/app/api/company-profile/`
  - `src/app/api/founder-profile/`
  - `src/app/api/generate-event-strategy/`
  - `src/app/api/settings/`
  - `src/app/api/tasks/`
  - `src/components/context/`
  - `src/components/events/`
  - `src/lib/dbMappers.ts`
  - `src/lib/supabaseServer.ts`
  - `supabase/` (schema + migrations)
  - `docs/` (this document and `AGENTS.md` companion, once added)
- **What should be committed before moving to Codex:** All of the above — this represents the entire Event Copilot feature, its Supabase persistence layer, and the My Context/Events UI. None of it is committed yet. Recommend a single descriptive commit (or a small number of logically grouped commits: schema/migrations, lib/server, API routes, UI) before handing off, so Codex starts from a clean, reviewable git history rather than a large uncommitted diff. **This document does not commit anything — that step is left to you.**

---

## 17. Safety rules for the next agent

- **Read `docs/HANDOFF.md` (this file) before changing anything.**
- **Do not expose secrets.** Never print, log, or echo `.env.local` contents or any API key/token value. Verify env var presence with name-only checks (e.g. `grep -q "^VAR=.\+" .env.local`), never `cat`/`echo` the file.
- **Do not put the service-role key in client code.** It must only ever be read in `src/lib/supabaseServer.ts`, which already guards against client-side import — do not weaken or bypass that guard.
- **Do not change the database schema without explaining why** — in particular, do not silently add the missing `audience_segment_id` column or any other migration without first stating the change and getting explicit confirmation.
- **Do not rerun migrations blindly.** The Event Copilot tables are already present in the live Supabase project (confirmed via live reads/writes) — do not re-apply `supabase/migrations/003_founder_event_copilot.sql` or `supabase/schema.sql` without first checking current table state.
- **Do not claim browser tests passed without actually running them.** If no browser-automation tool is available, say so explicitly and provide manual steps instead, exactly as done in Section 10.
- **Preserve the working Event Copilot and persistence flows** described in Sections 2B, 9, and 10 — they have been live-tested and work; avoid regressions while implementing Section 13.
- **Keep changes focused and test after every feature.** Run `npx tsc --noEmit && npm run lint && npm run build` after each meaningful change, and re-verify persistence (create → refetch → confirm) for anything touching the database.
