-- Setup the schema for the Cedur Payroll Compliance Checker

create extension if not exists "pgcrypto";

-- Table: leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  created_at timestamp not null default now()
);

-- Table: uploads
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  uploaded_at timestamp not null default now(),
  processed boolean not null default false
);

-- Table: reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  health_score integer not null,
  critical_issues integer not null,
  warnings integer not null,
  report_data jsonb not null,
  created_at timestamp not null default now()
);

-- Ensure storage bucket exists
insert into storage.buckets (id, name, public)
values ('payroll-uploads', 'payroll-uploads', false)
on conflict (id) do nothing;

-- Enable Row Level Security (RLS)
alter table public.leads enable row level security;
alter table public.uploads enable row level security;
alter table public.reports enable row level security;

-- Add permissive policy for demo simplicity (allow anonymous insert/read for POC)
create policy "Allow anonymous inserts to leads" on public.leads for insert with check (true);
create policy "Allow anonymous select from leads" on public.leads for select using (true);

create policy "Allow anonymous inserts to uploads" on public.uploads for insert with check (true);
create policy "Allow anonymous select from uploads" on public.uploads for select using (true);

create policy "Allow anonymous inserts to reports" on public.reports for insert with check (true);
create policy "Allow anonymous select from reports" on public.reports for select using (true);
