begin;

-- Full operational data reset. Authentication users and profiles are retained.
-- Back up the database first: this operation is irreversible.
truncate table public.project_progress_activities restart identity cascade;
truncate table public.project_estimate_items restart identity cascade;
truncate table public.project_estimates restart identity cascade;
truncate table public.cost_catalog_items restart identity cascade;
truncate table public.budget_items restart identity cascade;
truncate table public.budget_projects restart identity cascade;
truncate table public.projects restart identity cascade;
truncate table public.audit_logs restart identity cascade;
truncate table public.overtime_requests restart identity cascade;
truncate table public.payroll_adjustments restart identity cascade;
truncate table public.payroll_run_items restart identity cascade;
truncate table public.payroll_runs restart identity cascade;
truncate table public.employee_branch_rates restart identity cascade;
truncate table public.attendance_records restart identity cascade;
truncate table public.attendance_imports restart identity cascade;
truncate table public.role_rates restart identity cascade;
truncate table public.employees restart identity cascade;
truncate table public.sites restart identity cascade;

commit;
