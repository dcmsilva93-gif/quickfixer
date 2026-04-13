-- ═══════════════════════════════════════════════
--  QUICKFIXER — Supabase Database Setup
--  Paste this entire file into:
--  Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════

create table if not exists professionals (
  id bigint primary key generated always as identity,
  name text not null,
  trade text not null,
  area text not null,
  phone text not null,
  bio_si text,
  bio_en text,
  rating numeric default 0,
  jobs_count int default 0,
  verified boolean default false,
  available boolean default true,
  featured boolean default false,
  initials text,
  color text,
  created_at timestamp with time zone default now()
);

create table if not exists job_requests (
  id bigint primary key generated always as identity,
  customer_name text not null,
  customer_phone text not null,
  trade text not null,
  area text not null,
  description text not null,
  urgency text,
  status text default 'open',
  created_at timestamp with time zone default now()
);

-- Row Level Security (required for anon key access)
alter table professionals enable row level security;
alter table job_requests enable row level security;

create policy "Public read professionals"   on professionals for select using (true);
create policy "Public insert professionals" on professionals for insert with check (true);
create policy "Public update professionals" on professionals for update using (true);
create policy "Public delete professionals" on professionals for delete using (true);

create policy "Public read jobs"   on job_requests for select using (true);
create policy "Public insert jobs" on job_requests for insert with check (true);
create policy "Public update jobs" on job_requests for update using (true);
create policy "Public delete jobs" on job_requests for delete using (true);
