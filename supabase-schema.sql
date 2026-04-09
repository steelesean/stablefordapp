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
-- ------------------------------------------------------------------
create table if not exists public.players (
  id            text primary key,
  name          text not null,
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
-- RLS: enable but define no policies, so only the service role key
-- (used server-side via SUPABASE_SERVICE_ROLE_KEY) can read/write.
-- ------------------------------------------------------------------
alter table public.round_config enable row level security;
alter table public.players      enable row level security;
