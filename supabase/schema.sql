create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.leads alter column email drop not null;
alter table public.leads alter column phone drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_contact_required'
  ) then
    alter table public.leads
      add constraint leads_contact_required
      check (email is not null or phone is not null);
  end if;
end $$;

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text,
  file_size bigint,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  score numeric not null,
  issue_count integer not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('payroll-uploads', 'payroll-uploads', false)
on conflict (id) do nothing;

alter table public.leads enable row level security;
alter table public.uploads enable row level security;
alter table public.reports enable row level security;
