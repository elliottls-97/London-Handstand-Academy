create table if not exists questions (
  id         uuid primary key default gen_random_uuid(),
  email      text not null references accounts(email) on delete cascade,
  body       text not null,
  answer     text,
  status     text not null default 'new' check (status in ('new','answered')),
  answered_at timestamptz,
  answered_by text,
  created_at timestamptz not null default now()
);
create index if not exists questions_open_idx on questions (created_at) where status = 'new';
create index if not exists questions_email_idx on questions (email, created_at desc);
alter table questions enable row level security;
