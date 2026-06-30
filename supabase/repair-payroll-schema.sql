alter table public.employee_branch_rates
  add column if not exists regular_paid_hours numeric(8,2) not null default 8;

alter table public.overtime_requests
  add column if not exists approval_mode text not null default 'manual',
  add column if not exists auto_approved_at timestamptz,
  add column if not exists payroll_adjustment_id uuid references public.payroll_adjustments(id) on delete set null,
  add column if not exists role_code text;

alter table public.overtime_requests
  drop constraint if exists overtime_requests_approval_mode_check;

alter table public.overtime_requests
  add constraint overtime_requests_approval_mode_check
  check (approval_mode in ('manual', 'auto_on_date'));

create index if not exists overtime_requests_auto_lookup_idx
  on public.overtime_requests(approval_mode, status, request_date, period_label);

notify pgrst, 'reload schema';
