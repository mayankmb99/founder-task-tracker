# Founder Task Tracker — Handoff

## What this app is
A Next.js 16 (App Router, Turbopack) app combining two features:
1. **Task tracker** — tasks from Gmail/WhatsApp/Calendar/manual entry, with an AI extraction pipeline (OpenAI Responses API) that turns raw messages into structured task suggestions.
2. **Founder Event Copilot** — given a founder's profile, company profile, an audience segment, and an upcoming event with target people, generates an AI event strategy (positioning, talking points, per-person pitch angles, prep/follow-up actions) and lets the user turn prep/follow-up items into real tasks.

All data is persisted in Supabase Postgres. There is a single hardcoded demo user (`DEMO_USER_ID = "demo-founder"` in `src/lib/supabaseServer.ts`) — there is no auth/login system.

## Tech stack
- Next.js 16 App Router + Turbopack, React, TypeScript, Tailwind
- OpenAI Responses API, structured outputs via `text.format.type: "json_schema", strict: true`
- Supabase Postgres, accessed **only** via the service-role key from server-side route handlers (RLS is disabled by design — access control is enforced entirely by always scoping queries to `user_id` in server code, never by exposing Supabase to the browser)

## Environment setup
`.env.local` (gitignored, mirrored as empty placeholders in `.env.local.example`) needs:
```
OPENAI_API_KEY=
OPENAI_MODEL=          # defaults to gpt-5-mini if unset
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # currently unused by the app — service role key does all server-side access
SUPABASE_SERVICE_ROLE_KEY=
```
The anon key is provisioned but not currently read anywhere in code — everything goes through `supabaseServer.ts` with the service role key. Run:
```
npm install
npx tsc --noEmit && npm run lint && npm run build   # sanity check
npm run dev
```

## Database
- `supabase/schema.sql` — full schema for a fresh install (10 tables).
- `supabase/migrations/003_founder_event_copilot.sql` — the migration that added the Event Copilot tables to an existing DB.
- Tables: `source_messages`, `tasks`, `task_suggestions`, `settings`, `founder_profiles`, `company_profiles`, `audience_segments`, `events`, `event_targets`, `event_strategies`.
- `settings`, `founder_profiles`, `company_profiles` all have a unique constraint on `user_id`, enabling true `upsert(..., { onConflict: "user_id" })`.
- `event_strategies` has **no unique constraint** on `event_id` by design — the app enforces "only the most recent strategy per event" at the application layer (delete-then-insert in `generate-event-strategy/route.ts`), not via the DB schema.

### Known schema gap — not fixed, needs your decision
`events` has no `audience_segment_id` column, so `EventRecord.audienceSegmentId` can't be a real foreign key. Per earlier instruction not to change the schema without asking, `src/app/api/bootstrap/route.ts` works around this by linking every event to the first/only audience segment in the result it builds. **If you want this fixed properly, it needs a migration (`ALTER TABLE events ADD COLUMN audience_segment_id uuid ...`) plus your explicit go-ahead.**

## App architecture
- `src/app/page.tsx` is the single orchestration point: on mount it calls `GET /api/bootstrap`, which seeds the DB once (idempotent, row-count-checked) if empty and then returns all app data in one payload (`tasks`, `settings`, `founderProfile`, `companyProfile`, `audienceSegments`, `events`, `strategiesByEvent`). All subsequent mutations go through dedicated REST routes; `page.tsx` does optimistic local updates with rollback on failure for tasks, and debounced (800ms) auto-save for the My Context forms (founder/company/audience), since those are "edit while typing" forms.
- `src/lib/supabaseServer.ts` — the only place the service-role key is read; throws if accidentally imported into client/browser code.
- `src/lib/dbMappers.ts` — pure functions mapping DB snake_case rows ↔ app camelCase types. Always go through these rather than hand-rolling field mapping in routes.
- API routes (`src/app/api/**`):
  - `GET /api/bootstrap` — seed-if-empty + full data load.
  - `POST/PUT/DELETE /api/tasks` — single task CRUD.
  - `POST /api/tasks/bulk` — bulk insert with a `dedupeKey`; if any existing row already has that dedupe tag (stored in the otherwise-unused `tasks.related_person` column), the whole batch is skipped (`{ skipped: true }`). This is how "Add preparation tasks" / "Add follow-up tasks" avoid creating duplicates on repeated clicks, keyed per event as `event:<eventId>:prep` / `event:<eventId>:followup`.
  - `PUT /api/settings`, `/api/founder-profile`, `/api/company-profile` — true upserts via the `user_id` unique constraint.
  - `PUT /api/audience-segments` — takes the **whole array** and syncs it (update real-UUID rows, insert client-temp-id rows, delete anything missing from the array) — matches the existing form component's "always pass the full array" contract without needing the component rewritten.
  - `POST /api/generate-event-strategy` — calls OpenAI, then persists the result (delete-then-insert per event), and returns `{ result, persisted }` so the UI can warn if generation succeeded but saving failed.

## UI structure
- `src/components/Sidebar.tsx` — tab switcher (`today`, `upcoming`, `suggestions`, `completed`, `mycontext`, `events`, `settings`). **The Events screen is not the default tab** — click "Events" in the sidebar to reach it.
- `src/components/context/MyContextPage.tsx` + `FounderProfileForm.tsx` / `CompanyProfileForm.tsx` / `AudienceSegmentsSection.tsx` — the long-term context forms that feed every event strategy generation.
- `src/components/events/EventsPage.tsx` — event selector, event detail, "Generate Event Strategy" button, `EventStrategyView` render, and the prep/follow-up task buttons (disabled + relabeled to "✓ ... added" once clicked, reset only when a new strategy is generated).
- `src/components/AiTestPanel.tsx` — manual test harness for the AI extraction pipeline, shown above Suggestions.

## Testing status (as of last full regression pass)
All of the following were **actually executed** against the live dev server and a real Supabase project (not simulated):
- Task CRUD persistence (create/update/delete, verified via independent refetch).
- My Context persistence (founder profile edits, audience segment add/remove with real UUID assignment).
- Event strategy generation + persistence, including survival across refetch.
- Prep/follow-up task bulk-add with dedupe (repeated clicks verified to not duplicate).
- Supabase read-failure handling (`/api/bootstrap` under a simulated DNS failure: returns a generic 500 after ~43s, no crash, no secret leakage — see gap below).
- Supabase write-failure handling (`/api/tasks` POST under the same simulated failure: fails fast with a generic 500).
- AI extraction correctness across multiple scenarios (full context, missing context, weak context, irrelevant experience) and event-strategy correctness (target-specific positioning, anti-hallucination) — verified via direct API calls with real OpenAI responses inspected by hand.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass clean.

**Not yet automated:** full browser UI click-through (no browser-automation tool was available this session). Manual steps:
1. Open the app, confirm "Loading your data…" then real data appears.
2. Edit something in My Context, watch "Saving…" → "✓ Saved", refresh, confirm it stuck.
3. Go to Events, generate a strategy, refresh, confirm it's still there without regenerating.
4. Click "Add preparation tasks" / "Add follow-up tasks", confirm buttons disable and relabel, confirm clicking again doesn't duplicate tasks in Today/Upcoming.
5. Toggle-complete / delete a task, refresh, confirm it stuck.

## Known gaps / suggested next steps
1. `events.audience_segment_id` missing column (see above) — needs a migration + your sign-off.
2. `/api/bootstrap` has no fetch timeout; a Supabase outage causes a ~43s hang before the error screen shows (seeding + 8 parallel queries each retry DNS resolution before failing). Worth wrapping in an `AbortController` if outages are a realistic concern.
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is provisioned but unused — fine as-is since the app never talks to Supabase from the browser, but flagging in case you intended client-side Supabase usage somewhere.
4. No auth — single hardcoded `demo-founder` user. Anything beyond a personal/demo deployment needs real auth wired through `DEMO_USER_ID`.
5. Settings only get a DB row the first time the user changes them (no seed row) — by design, not a bug, but means a brand-new DB will show client-side defaults until the user touches Settings once.

## Secret handling discipline (carried over from prior sessions — please keep following)
- Never print, log, or echo the contents of `.env.local` or any API key/secret value.
- Verify env var presence with name-only checks (e.g. `grep -q "^VAR=.\+" .env.local`), never `cat`/`echo` the file.
- The service-role key is read in exactly one file (`src/lib/supabaseServer.ts`), guarded against client-side import.
