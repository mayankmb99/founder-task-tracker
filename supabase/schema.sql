-- TaskBar — Supabase schema
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- It creates all tables needed for the app. Safe to re-run: every
-- statement uses IF NOT EXISTS / ON CONFLICT so running it twice will
-- not duplicate tables, rows, or error out.
--
-- SECURITY NOTE FOR THIS HACKATHON BUILD:
-- Row Level Security (RLS) is intentionally NOT enabled below. That is
-- only safe because every table is scoped by a `user_id` column and all
-- reads/writes MUST happen from server-side code (Next.js API routes),
-- using the SUPABASE_SERVICE_ROLE_KEY. That key bypasses RLS entirely
-- and must NEVER be sent to the browser or used in client components.
-- Before this app supports real multiple users, add Supabase Auth and
-- RLS policies that check `auth.uid()` (or an equivalent claim) against
-- each table's `user_id` column.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. source_messages
-- Raw incoming messages from Gmail / WhatsApp / Calendar before AI
-- processing. Created first because both tasks and task_suggestions
-- reference it by foreign key.
--
-- Duplicate protection: the same inbound message (same user, same
-- source, same source_message_id) can never be stored twice — enforced
-- by the unique constraint below, not just by application code.
-- ---------------------------------------------------------------------
create table if not exists source_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-founder',
  source text not null check (source in ('gmail', 'whatsapp', 'calendar')),
  source_message_id text not null,
  thread_id text,
  sender text,
  subject text,
  content text,
  received_at timestamptz,
  processed_at timestamptz,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'failed')),
  metadata jsonb not null default '{}',
  error_message text,
  created_at timestamptz not null default now(),
  constraint uq_source_messages_user_source_msgid
    unique (user_id, source, source_message_id)
);

create index if not exists idx_source_messages_user_source_status
  on source_messages (user_id, source, processing_status);

-- ---------------------------------------------------------------------
-- 2. tasks
-- The user's actual task list (manually added, or accepted from a
-- suggestion). Created before task_suggestions so that
-- task_suggestions.target_task_id can reference it.
--
-- source_message_record_id links back to the originating message when
-- a task came from Gmail/WhatsApp/Calendar; it is null for tasks the
-- user typed in manually. (Named "_record_id" because it points at
-- source_messages.id, the internal database row — not at the source
-- system's own message id.)
-- ---------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-founder',
  title text not null,
  source text not null default 'manual'
    check (source in ('gmail', 'whatsapp', 'calendar', 'manual')),
  source_message_record_id uuid references source_messages (id) on delete set null,
  due_date date,
  due_time time,
  reminder_minutes integer not null default 15
    check (reminder_minutes in (5, 10, 15, 30)),
  task_owner text not null default 'user'
    check (task_owner in ('user', 'sender', 'unknown')),
  related_person text,
  status text not null default 'pending'
    check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_tasks_user_status_due_date
  on tasks (user_id, status, due_date);
create index if not exists idx_tasks_source_message_record_id
  on tasks (source_message_record_id);

-- ---------------------------------------------------------------------
-- 3. task_suggestions
-- AI-extracted task candidates, one per processed source message,
-- awaiting the user's Add / Edit / Dismiss decision.
--
-- source_message_record_id is unique so the same source message can
-- never generate two suggestion rows (one message -> at most one
-- suggestion). target_task_id is filled in once the user accepts the
-- suggestion and a real task is created from it.
-- ---------------------------------------------------------------------
create table if not exists task_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-founder',
  source_message_record_id uuid references source_messages (id) on delete cascade,
  is_action_item boolean not null default false,
  task_owner text not null default 'unknown'
    check (task_owner in ('user', 'sender', 'unknown')),
  task_title text,
  due_date date,
  due_time time,
  action_type text not null default 'none'
    check (action_type in ('create', 'update', 'complete', 'postpone', 'cancel', 'none')),
  confidence numeric(3, 2) check (confidence >= 0 and confidence <= 1),
  original_message text,
  missing_information text[] not null default '{}',
  reason_for_classification text,
  target_task_id uuid references tasks (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'added', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_task_suggestions_source_message_record_id
    unique (source_message_record_id)
);

create index if not exists idx_task_suggestions_user_status
  on task_suggestions (user_id, status);
create index if not exists idx_task_suggestions_target_task_id
  on task_suggestions (target_task_id);

-- ---------------------------------------------------------------------
-- 4. settings
-- One settings row per demo user. user_id is unique so there can never
-- be two settings rows for the same user.
-- ---------------------------------------------------------------------
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-founder',
  notifications_enabled boolean not null default true,
  default_reminder_minutes integer not null default 15
    check (default_reminder_minutes in (5, 10, 15, 30)),
  timezone text not null default 'Asia/Kolkata',
  gmail_connected boolean not null default false,
  whatsapp_connected boolean not null default false,
  constraint uq_settings_user_id unique (user_id)
);

-- Create the one demo user's settings row. Safe to re-run: if a row
-- for 'demo-founder' already exists, this does nothing instead of
-- creating a duplicate.
insert into settings (user_id, notifications_enabled, default_reminder_minutes, timezone, gmail_connected, whatsapp_connected)
values ('demo-founder', true, 15, 'Asia/Kolkata', false, false)
on conflict (user_id) do nothing;

-- =======================================================================
-- Founder Event Copilot tables
-- (see supabase/migrations/003_founder_event_copilot.sql for the
-- migration that adds these to a database that already has the tables
-- above. The definitions here are identical, for fresh installs.)
-- =======================================================================

-- ---------------------------------------------------------------------
-- 5. founder_profiles
-- Long-term context about the founder. One row per demo user.
-- ---------------------------------------------------------------------
create table if not exists founder_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique default 'demo-founder',
  founder_name text,
  role text,
  professional_summary text,
  relevant_experience jsonb not null default '[]',
  strengths jsonb not null default '[]',
  achievements jsonb not null default '[]',
  communication_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. company_profiles
-- Long-term context about the company. One row per demo user.
-- ---------------------------------------------------------------------
create table if not exists company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique default 'demo-founder',
  company_name text,
  company_description text,
  product_or_service text,
  problem_solved text,
  value_proposition text,
  differentiation jsonb not null default '[]',
  traction jsonb not null default '[]',
  customers jsonb not null default '[]',
  proof_points jsonb not null default '[]',
  case_studies jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. audience_segments
-- A user can define multiple target-audience segments, so user_id is
-- not unique here (unlike founder_profiles / company_profiles).
-- ---------------------------------------------------------------------
create table if not exists audience_segments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-founder',
  name text not null,
  roles jsonb not null default '[]',
  company_types jsonb not null default '[]',
  problems jsonb not null default '[]',
  needs jsonb not null default '[]',
  objections jsonb not null default '[]',
  desired_outcomes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audience_segments_user_id
  on audience_segments (user_id);

-- ---------------------------------------------------------------------
-- 8. events
-- A specific event the founder is preparing for. event_type is text
-- (not a fixed enum) so future use cases (sales_meeting,
-- investor_meeting, partnership_meeting, conference,
-- vendor_negotiation, hackathon) can be added without a schema change.
-- Only 'startup_expo' is fully implemented in the app for now.
-- ---------------------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-founder',
  external_event_id text,
  event_type text not null default 'startup_expo',
  event_name text not null,
  event_description text,
  event_start timestamptz,
  event_location text,
  user_goal text,
  additional_context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_user_id_type
  on events (user_id, event_type);

-- ---------------------------------------------------------------------
-- 9. event_targets
-- People or companies the founder may meet at a specific event.
-- ---------------------------------------------------------------------
create table if not exists event_targets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-founder',
  event_id uuid references events (id) on delete cascade,
  person_name text,
  role text,
  company_name text,
  company_description text,
  known_needs jsonb not null default '[]',
  relevance_reason text,
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'not_contacted'
    check (status in ('not_contacted', 'contacted', 'met')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_targets_event_id
  on event_targets (event_id);

-- ---------------------------------------------------------------------
-- 10. event_strategies
-- The AI-generated strategy for a specific event. One event can be
-- re-generated over time, so this is not unique on event_id — the app
-- keeps the most recent row (by created_at) as the active strategy.
-- ---------------------------------------------------------------------
create table if not exists event_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-founder',
  event_id uuid references events (id) on delete cascade,
  positioning_summary text,
  founder_introduction text,
  company_pitch text,
  people_to_prioritise jsonb not null default '[]',
  proof_points_to_use jsonb not null default '[]',
  questions_to_ask jsonb not null default '[]',
  talking_points jsonb not null default '[]',
  conversation_goals jsonb not null default '[]',
  preparation_items jsonb not null default '[]',
  follow_up_actions jsonb not null default '[]',
  risks jsonb not null default '[]',
  missing_information jsonb not null default '[]',
  confidence numeric(3, 2) check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_strategies_event_id
  on event_strategies (event_id);
