-- Migration 003: Founder Event Copilot
-- Run this in the Supabase SQL Editor against the project where
-- supabase/schema.sql has already been applied.
--
-- This migration ONLY ADDS new tables. It does not touch
-- source_messages, tasks, task_suggestions, or settings, and it is
-- safe to re-run: every statement uses IF NOT EXISTS.
--
-- New tables, in dependency order:
--   founder_profiles, company_profiles, audience_segments  (no dependencies)
--   events                                                  (no dependencies)
--   event_targets        -> references events
--   event_strategies      -> references events
--
-- SECURITY NOTE (same as schema.sql): RLS is not enabled here. All
-- reads/writes to these tables must happen from server-side code using
-- SUPABASE_SERVICE_ROLE_KEY, which must never reach the browser. Real
-- multi-user support later requires Supabase Auth + RLS keyed on user_id.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. founder_profiles
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
-- 2. company_profiles
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
-- 3. audience_segments
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
-- 4. events
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
-- 5. event_targets
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
-- 6. event_strategies
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
