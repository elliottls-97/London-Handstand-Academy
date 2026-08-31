-- ══════════════════════════════════════════════════════════════
-- London Handstand Academy — schema
--
-- Access model: the browser NEVER talks to Supabase. It talks to
-- /api/app/*, and the Netlify function talks to Supabase with the
-- service role key. So every table below has RLS enabled and NO
-- policies: anon and authenticated can reach nothing at all, and the
-- service role bypasses RLS. If the anon key ever leaks it opens
-- nothing.
--
-- Run this in the Supabase SQL editor.
-- ══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── people ────────────────────────────────────────────────────
create table if not exists accounts (
  email            text primary key,
  name             text not null default '',
  hash             text,                        -- PBKDF2, never a password
  marketing        boolean not null default false,
  stage            int,
  plus             boolean not null default false,
  plus_at          timestamptz,
  stripe_customer  text,
  subscription     text,
  cancel_at        timestamptz,
  first_seen       timestamptz not null default now(),
  last_seen        timestamptz not null default now()
);
create index if not exists accounts_stripe_customer_idx
  on accounts (stripe_customer) where stripe_customer is not null;
create index if not exists accounts_last_seen_idx on accounts (last_seen desc);

-- ── the thread ────────────────────────────────────────────────
-- One row per message. This is the whole reason for the move: on Blobs
-- a thread was a single value, so two writes seconds apart could lose
-- one of them for good — a reply could delete the client's message it
-- was replying to. Rows cannot do that. It also retires the 200-message
-- cap and the queue-and-compaction machinery that worked around it.
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  email       text not null references accounts(email) on delete cascade,
  sender      text not null check (sender in ('client','coach')),
  body        text not null default '',
  video       text,                             -- Cloudflare Stream uid
  image       text,                             -- image id
  submission  text,                             -- groups a review's clips
  read_at     timestamptz,                      -- unread is a query now, not an index
  created_at  timestamptz not null default now()
);
create index if not exists messages_email_created_idx on messages (email, created_at desc);
create index if not exists messages_unread_idx on messages (email) where read_at is null;

-- ── training ──────────────────────────────────────────────────
create table if not exists progress (
  email      text primary key references accounts(email) on delete cascade,
  opens      jsonb not null default '[]'::jsonb,
  sessions   jsonb not null default '[]'::jsonb,
  holds      jsonb not null default '[]'::jsonb,
  flags      jsonb not null default '{}'::jsonb,
  tests      jsonb not null default '[]'::jsonb,
  feedback   jsonb not null default '[]'::jsonb,
  best_hold  int,
  last_seen  timestamptz
);

create table if not exists coach_notes (
  email      text primary key references accounts(email) on delete cascade,
  body       text not null default '',
  updated_at timestamptz not null default now()
);

-- ── the coaching cycle ────────────────────────────────────────
create table if not exists cycles (
  email      text primary key references accounts(email) on delete cascade,
  n          int not null default 1,
  started_at timestamptz not null default now()
);

create table if not exists submissions (
  id          uuid primary key default gen_random_uuid(),
  email       text not null references accounts(email) on delete cascade,
  kind        text not null check (kind in ('assessment','test')),
  cycle       int not null default 1,
  numbers     jsonb not null default '{}'::jsonb,
  clips       jsonb not null default '[]'::jsonb,
  status      text not null default 'submitted' check (status in ('submitted','reviewed')),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at  timestamptz not null default now()
);
-- the review queue, oldest first
create index if not exists submissions_open_idx
  on submissions (created_at) where status = 'submitted';
create index if not exists submissions_email_idx on submissions (email, created_at desc);

-- one free form check per account. A unique key, so the limit is the
-- database's job rather than a read-then-write that can race.
create table if not exists free_checks (
  email      text primary key references accounts(email) on delete cascade,
  submission uuid,
  used_at    timestamptz not null default now()
);

-- ── coaching applications ─────────────────────────────────────
create table if not exists applications (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text not null default '',
  answers    jsonb not null default '{}'::jsonb,
  status     text not null default 'new' check (status in ('new','replied','accepted','declined')),
  created_at timestamptz not null default now()
);
create index if not exists applications_new_idx
  on applications (created_at desc) where status = 'new';

-- ── short-lived and housekeeping ──────────────────────────────
create table if not exists codes (
  email      text not null,
  kind       text not null check (kind in ('login','reset')),
  code       text not null,
  tries      int not null default 0,
  expires_at timestamptz not null,
  primary key (email, kind)
);

create table if not exists rate_limits (
  key        text primary key,
  n          int not null default 0,
  window_at  timestamptz not null default now()
);

-- reminders already sent, so a daily job never nags twice
create table if not exists nudges (
  key        text primary key,                  -- 'remind:{email}:{cycle}' | 'chase:{submission}'
  stage      int not null default 0,
  sent_at    timestamptz not null default now()
);

-- the email switch, and anything else that is one value
create table if not exists settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════
-- Lock everything. No policies are defined on purpose: the service
-- role bypasses RLS, and nothing else is allowed a single row.
-- ══════════════════════════════════════════════════════════════
alter table accounts     enable row level security;
alter table messages     enable row level security;
alter table progress     enable row level security;
alter table coach_notes  enable row level security;
alter table cycles       enable row level security;
alter table submissions  enable row level security;
alter table free_checks  enable row level security;
alter table applications enable row level security;
alter table codes        enable row level security;
alter table rate_limits  enable row level security;
alter table nudges       enable row level security;
alter table settings     enable row level security;
