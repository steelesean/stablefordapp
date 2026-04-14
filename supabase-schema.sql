-- Stableford app — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- The app uses the service role key so it bypasses RLS, but RLS is still enabled as
-- defence-in-depth against anyone stumbling onto the anon key.

-- ------------------------------------------------------------------
-- round_config: single-row table tracking whether the round is open
-- ------------------------------------------------------------------
create table if not exists public.round_config (
  id          integer primary key default 1,
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  constraint round_config_singleton check (id = 1)
);

-- ------------------------------------------------------------------
-- players: one row per participant
--   name        = the player being scored
--   scorer_name = the playing partner holding the phone and entering scores
-- ------------------------------------------------------------------
create table if not exists public.players (
  id            text primary key,
  name          text not null,
  scorer_name   text not null default '',
  handicap      numeric not null,
  tee_id        text not null,
  prediction    text not null default '',
  scores        jsonb not null default '[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  submitted_at  timestamptz
);

create index if not exists players_created_at_idx on public.players (created_at);

-- ------------------------------------------------------------------
-- Migration for existing deployments (pre-scorer field)
-- Run this once if the players table already exists without scorer_name.
-- Safe to run multiple times.
-- ------------------------------------------------------------------
alter table public.players add column if not exists scorer_name text not null default '';

-- ------------------------------------------------------------------
-- RLS: enable but define no policies, so only the service role key
-- (used server-side via SUPABASE_SERVICE_ROLE_KEY) can read/write.
-- ------------------------------------------------------------------
alter table public.round_config enable row level security;
alter table public.players      enable row level security;


-- ==================================================================
-- MULTI-TENANT MIGRATION (Phase 0)
-- Run this after the tables above exist. Safe to run multiple times.
-- ==================================================================

-- ------------------------------------------------------------------
-- competitions: one row per competition/event created by an organizer
-- ------------------------------------------------------------------
create table if not exists public.competitions (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid not null references auth.users(id) on delete cascade,
  name          text not null default '',
  join_code     text not null unique,
  course_name   text not null,
  hole_count    smallint not null default 18,
  hole_names    text[] not null default '{}',
  tees          jsonb not null default '[]',
  status        text not null default 'open' check (status in ('open', 'closed')),
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);

create index if not exists competitions_organizer_idx on public.competitions (organizer_id);
create index if not exists competitions_join_code_idx on public.competitions (join_code);

alter table public.competitions enable row level security;

-- ------------------------------------------------------------------
-- Add competition_id FK to players (nullable for backward compat)
-- ------------------------------------------------------------------
alter table public.players
  add column if not exists competition_id uuid references public.competitions(id) on delete cascade;

create index if not exists players_competition_idx on public.players (competition_id);

-- ------------------------------------------------------------------
-- Leaderboard toggle (run on existing deployments)
-- ------------------------------------------------------------------
alter table public.competitions
  add column if not exists show_leaderboard boolean not null default false;

-- ------------------------------------------------------------------
-- RLS policies for competitions
-- Organizers: full access to their own competitions
-- Public (anon): can read competitions to resolve join codes
-- ------------------------------------------------------------------
create policy "Organizers can manage their competitions"
  on public.competitions
  for all
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

create policy "Anyone can read competitions by join code"
  on public.competitions
  for select
  using (true);

-- ------------------------------------------------------------------
-- RLS policies for players (multi-tenant)
-- Service role bypasses these, but they protect against anon key misuse.
-- Organizers can read players in their competitions.
-- ------------------------------------------------------------------
create policy "Organizers can read their competition players"
  on public.players
  for select
  using (
    competition_id in (
      select id from public.competitions where organizer_id = auth.uid()
    )
  );

create policy "Organizers can manage their competition players"
  on public.players
  for all
  using (
    competition_id in (
      select id from public.competitions where organizer_id = auth.uid()
    )
  )
  with check (
    competition_id in (
      select id from public.competitions where organizer_id = auth.uid()
    )
  );
