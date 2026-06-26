insert into public.leads (email, phone)
values
  ('payroll@acmeindia.example', null),
  (null, '+919123456780');

insert into public.reports (health_score, critical_issues, warnings, report_data)
values
  (64, 8, 10, '{"source":"seed","summary":"Sample non-compliant payroll report"}'::jsonb),
  (86, 2, 4, '{"source":"seed","summary":"Sample healthy payroll report"}'::jsonb);

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
on conflict (rule_key) do update
set
  rule_value = excluded.rule_value,
  description = excluded.description,
  updated_at = now();

truncate table public.pt_rules;

insert into public.pt_rules (state, min_salary, max_salary, pt_amount)
values
  ('Maharashtra', 0, 7500, 0),
  ('Maharashtra', 7500.01, 10000, 175),
  ('Maharashtra', 10000.01, null, 200),
  ('Karnataka', 0, 24999.99, 0),
  ('Karnataka', 25000, null, 200),
  ('Tamil Nadu', 0, 3500, 0),
  ('Tamil Nadu', 3500.01, 5000, 30),
  ('Tamil Nadu', 5000.01, 7500, 71),
  ('Tamil Nadu', 7500.01, 10000, 155),
  ('Tamil Nadu', 10000.01, 12500, 171),
  ('Tamil Nadu', 12500.01, null, 208),
  ('Andhra Pradesh', 0, 15000, 0),
  ('Andhra Pradesh', 15000.01, 20000, 150),
  ('Andhra Pradesh', 20000.01, null, 200),
  ('Assam', 0, 15000, 0),
  ('Assam', 15000.01, 25000, 180),
  ('Assam', 25000.01, null, 208),
  ('Bihar', 0, 25000, 0),
  ('Bihar', 25000.01, 41666.67, 83.33),
  ('Bihar', 41666.68, 83333.33, 166.67),
  ('Bihar', 83333.34, null, 208.33),
  ('Gujarat', 0, 11999.99, 0),
  ('Gujarat', 12000, null, 200);
