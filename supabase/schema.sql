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

-- Table: configurable statutory compliance rules
create table if not exists public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text unique not null,
  rule_value text not null,
  description text not null default '',
  effective_from date not null default current_date,
  updated_at timestamp not null default now()
);

-- Table: configurable Professional Tax slabs
create table if not exists public.pt_rules (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  min_salary numeric not null default 0,
  max_salary numeric,
  pt_amount numeric not null default 0,
  updated_at timestamp not null default now()
);

-- Table: audit trail for rule changes
create table if not exists public.rule_change_history (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  old_value text,
  new_value text not null,
  changed_at timestamp not null default now()
);

-- Ensure storage bucket exists
insert into storage.buckets (id, name, public)
values ('payroll-uploads', 'payroll-uploads', false)
on conflict (id) do nothing;

-- Enable Row Level Security (RLS)
alter table public.leads enable row level security;
alter table public.uploads enable row level security;
alter table public.reports enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.pt_rules enable row level security;
alter table public.rule_change_history enable row level security;

-- Add permissive policy for demo simplicity (allow anonymous insert/read for POC)
create policy "Allow anonymous inserts to leads" on public.leads for insert with check (true);
create policy "Allow anonymous select from leads" on public.leads for select using (true);

create policy "Allow anonymous inserts to uploads" on public.uploads for insert with check (true);
create policy "Allow anonymous select from uploads" on public.uploads for select using (true);

create policy "Allow anonymous inserts to reports" on public.reports for insert with check (true);
create policy "Allow anonymous select from reports" on public.reports for select using (true);

create policy "Allow anonymous select from compliance_rules" on public.compliance_rules for select using (true);
create policy "Allow anonymous insert to compliance_rules" on public.compliance_rules for insert with check (true);
create policy "Allow anonymous update to compliance_rules" on public.compliance_rules for update using (true) with check (true);

create policy "Allow anonymous select from pt_rules" on public.pt_rules for select using (true);
create policy "Allow anonymous insert to pt_rules" on public.pt_rules for insert with check (true);
create policy "Allow anonymous update to pt_rules" on public.pt_rules for update using (true) with check (true);
create policy "Allow anonymous delete from pt_rules" on public.pt_rules for delete using (true);

create policy "Allow anonymous inserts to rule_change_history" on public.rule_change_history for insert with check (true);
create policy "Allow anonymous select from rule_change_history" on public.rule_change_history for select using (true);

-- Seed default compliance rules. Existing customized values are preserved.
insert into public.compliance_rules (rule_key, rule_value, description, effective_from)
values
  ('EPF_EMPLOYEE_RATE', '12', 'Employee EPF percentage of Basic + DA', current_date),
  ('EPF_EMPLOYER_RATE', '3.67', 'Employer EPF percentage of Basic + DA', current_date),
  ('EPS_RATE', '8.33', 'Employer EPS percentage of Basic + DA', current_date),
  ('EPS_MAX_AMOUNT', '1250', 'Maximum monthly EPS contribution amount', current_date),
  ('PF_THRESHOLD', '15000', 'PF mandatory wage threshold', current_date),
  ('ESI_EMPLOYEE_RATE', '0.75', 'Employee ESI percentage of gross salary', current_date),
  ('ESI_EMPLOYER_RATE', '3.25', 'Employer ESI percentage of gross salary', current_date),
  ('ESI_THRESHOLD', '21000', 'ESI eligibility salary threshold', current_date),
  ('HRA_METRO_PERCENT', '50', 'HRA exemption percentage for metro cities', current_date),
  ('HRA_NON_METRO_PERCENT', '40', 'HRA exemption percentage for non-metro cities', current_date),
  ('HRA_RENT_DEDUCTION_PERCENT', '10', 'Salary percentage deducted from rent for HRA exemption', current_date)
on conflict (rule_key) do nothing;

-- Seed default Professional Tax slabs. Existing rows are preserved.

insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Maharashtra', 0, 7500, 0
where not exists (select 1 from public.pt_rules where lower(state) = 'maharashtra');
insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Maharashtra', 7500.01, 10000, 175
where not exists (select 1 from public.pt_rules where lower(state) = 'maharashtra' and min_salary = 7500.01);
insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Maharashtra', 10000.01, null, 200
where not exists (select 1 from public.pt_rules where lower(state) = 'maharashtra' and min_salary = 10000.01);

insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Karnataka', 0, 24999.99, 0
where not exists (select 1 from public.pt_rules where lower(state) = 'karnataka');
insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Karnataka', 25000, null, 200
where not exists (select 1 from public.pt_rules where lower(state) = 'karnataka' and min_salary = 25000);

insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Tamil Nadu', 0, 3500, 0
where not exists (select 1 from public.pt_rules where lower(state) = 'tamil nadu');
insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Tamil Nadu', 3500.01, 5000, 30
where not exists (select 1 from public.pt_rules where lower(state) = 'tamil nadu' and min_salary = 3500.01);
insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Tamil Nadu', 5000.01, 7500, 71
where not exists (select 1 from public.pt_rules where lower(state) = 'tamil nadu' and min_salary = 5000.01);
insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Tamil Nadu', 7500.01, 10000, 155
where not exists (select 1 from public.pt_rules where lower(state) = 'tamil nadu' and min_salary = 7500.01);
insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Tamil Nadu', 10000.01, 12500, 171
where not exists (select 1 from public.pt_rules where lower(state) = 'tamil nadu' and min_salary = 10000.01);
insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
select 'Tamil Nadu', 12500.01, null, 208
where not exists (select 1 from public.pt_rules where lower(state) = 'tamil nadu' and min_salary = 12500.01);
