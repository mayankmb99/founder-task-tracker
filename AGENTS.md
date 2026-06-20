<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Instructions — Founder Task Tracker

**Read `docs/HANDOFF.md` first.** It has the full product, architecture, database, testing, and gap details. This section is just the quick-reference summary.

## Product purpose
A founder task tracker plus an AI "Event Copilot": combines a founder's profile, company profile, audience segment, and a specific event with named targets into a personalised AI-generated event strategy, which converts into real tasks. There is also a standalone AI task-extraction test tool that is **not yet** wired into the real task list (see Section 13 of the handoff — this is the current top-priority gap).

## Tech stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · OpenAI Responses API with strict Structured Outputs · Supabase Postgres (service-role key, server-only access, RLS off by design) · local dev at `http://localhost:3000`.

## Demo user
There is no auth. Every table is scoped to a single hardcoded user: `DEMO_USER_ID = "demo-founder"`, defined in `src/lib/supabaseServer.ts`.

## Key file locations
- App orchestration: `src/app/page.tsx`
- AI routes: `src/app/api/extract-task/route.ts`, `src/app/api/generate-event-strategy/route.ts`
- Supabase routes: `src/app/api/bootstrap/route.ts`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/bulk/route.ts`, `src/app/api/settings/route.ts`, `src/app/api/founder-profile/route.ts`, `src/app/api/company-profile/route.ts`, `src/app/api/audience-segments/route.ts`
- Server-only Supabase client: `src/lib/supabaseServer.ts`
- DB row ↔ type mapping: `src/lib/dbMappers.ts`
- Shared types: `src/lib/types.ts`
- Seed/demo data: `src/lib/mockData.ts`
- Schema: `supabase/schema.sql`, migration: `supabase/migrations/003_founder_event_copilot.sql`

## Environment-variable rules
Required: `OPENAI_API_KEY`, `OPENAI_MODEL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Live in `.env.local` (gitignored); `.env.local.example` has placeholders only. **Never print, log, or echo any of these values.** Verify presence with name-only checks (e.g. `grep -q "^VAR=.\+" .env.local`), never `cat`/`echo` the file.

## Supabase server-only rules
All Supabase access goes through `src/lib/supabaseServer.ts` using the service-role key, called only from `src/app/api/**` route handlers. Never import `supabaseServer` from client/browser code — the file already throws if `window` is defined; do not weaken that guard. Do not change the database schema (e.g. add columns, run migrations) without first explaining the change and getting explicit confirmation.

## Commands to run before declaring success
```
npx tsc --noEmit
npm run lint
npm run build
```
For anything touching persistence, also verify by hand: create/update via the API, then refetch (`GET /api/bootstrap` or the specific resource) to confirm the change actually persisted — don't assume it did.

## Current immediate task
Connect the AI task-extraction Test flow (`src/components/AiTestPanel.tsx` → `POST /api/extract-task`) to the real product: replace the raw-JSON display with a readable suggestion card offering Add to Tasks / Edit / Dismiss, persist accepted tasks to `tasks` (and `task_suggestions` where appropriate), prevent duplicate acceptance, and confirm the accepted task appears in Today/Upcoming and survives a refresh. Full detail in `docs/HANDOFF.md` Section 13.

## Rules
- Do not implement unrelated features. Stay scoped to the current task.
- Report honestly what was and was not tested. If browser automation isn't available, say so and give manual steps instead of claiming a UI test passed.
