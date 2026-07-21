begin;

alter table public.projects
  add column if not exists assigned_estimate_engineer_id uuid references public.profiles(id) on delete set null;

create index if not exists projects_estimate_assignee_status_idx
  on public.projects(assigned_estimate_engineer_id, status, created_at desc);

alter table public.project_estimates
  add column if not exists project_id uuid references public.projects(id) on delete restrict;

create index if not exists estimates_project_idx
  on public.project_estimates(project_id, updated_at desc);

create table if not exists public.material_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  material_name text not null,
  quantity numeric(14,2) not null check (quantity > 0),
  unit text not null,
  needed_by date not null,
  site text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected', 'purchasing', 'ordered', 'received', 'cancelled')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  material_request_id uuid references public.material_requests(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  supplier_name text,
  item_name text not null,
  quantity numeric(14,2) not null check (quantity > 0),
  unit text not null,
  estimated_unit_cost numeric(14,2) not null default 0 check (estimated_unit_cost >= 0),
  actual_unit_cost numeric(14,2) not null default 0 check (actual_unit_cost >= 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'ordered', 'received', 'cancelled')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  ordered_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_progress_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  activity_count integer not null default 0 check (activity_count >= 0),
  submitted_at timestamptz not null default timezone('utc', now())
);

create index if not exists material_requests_project_status_idx
  on public.material_requests(project_id, status, created_at desc);

create index if not exists material_requests_requester_idx
  on public.material_requests(requested_by, created_at desc);

create index if not exists purchase_orders_project_status_idx
  on public.purchase_orders(project_id, status, created_at desc);

create index if not exists progress_submissions_project_idx
  on public.project_progress_submissions(project_id, submitted_at desc);

drop trigger if exists material_requests_set_updated_at on public.material_requests;
create trigger material_requests_set_updated_at
before update on public.material_requests
for each row execute function public.set_updated_at();

drop trigger if exists purchase_orders_set_updated_at on public.purchase_orders;
create trigger purchase_orders_set_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

alter table public.material_requests enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.project_progress_submissions enable row level security;

drop policy if exists "material requests readable by project members" on public.material_requests;
create policy "material requests readable by project members"
  on public.material_requests
  for select
  using (
    public.is_ceo()
    or requested_by = auth.uid()
    or exists (
      select 1
      from public.projects projects
      where projects.id = material_requests.project_id
        and (
          projects.assigned_engineer_id = auth.uid()
          or projects.assigned_estimate_engineer_id = auth.uid()
        )
    )
  );

drop policy if exists "material requests created by assigned site engineer" on public.material_requests;
create policy "material requests created by assigned site engineer"
  on public.material_requests
  for insert
  with check (
    requested_by = auth.uid()
    and exists (
      select 1
      from public.projects projects
      where projects.id = material_requests.project_id
        and projects.assigned_engineer_id = auth.uid()
    )
  );

drop policy if exists "material requests managed by ceo" on public.material_requests;
create policy "material requests managed by ceo"
  on public.material_requests
  for update
  using (public.is_ceo())
  with check (public.is_ceo());

drop policy if exists "purchase orders readable by project members" on public.purchase_orders;
create policy "purchase orders readable by project members"
  on public.purchase_orders
  for select
  using (
    public.is_ceo()
    or created_by = auth.uid()
    or exists (
      select 1
      from public.projects projects
      where projects.id = purchase_orders.project_id
        and (
          projects.assigned_engineer_id = auth.uid()
          or projects.assigned_estimate_engineer_id = auth.uid()
        )
    )
  );

drop policy if exists "purchase orders managed by ceo" on public.purchase_orders;
create policy "purchase orders managed by ceo"
  on public.purchase_orders
  for all
  using (public.is_ceo())
  with check (public.is_ceo());

drop policy if exists "progress submissions readable by project members" on public.project_progress_submissions;
create policy "progress submissions readable by project members"
  on public.project_progress_submissions
  for select
  using (
    public.is_ceo()
    or exists (
      select 1
      from public.projects projects
      where projects.id = project_progress_submissions.project_id
        and projects.assigned_engineer_id = auth.uid()
    )
  );

drop policy if exists "progress submissions created by assigned engineer" on public.project_progress_submissions;
create policy "progress submissions created by assigned engineer"
  on public.project_progress_submissions
  for insert
  with check (
    submitted_by = auth.uid()
    and exists (
      select 1
      from public.projects projects
      where projects.id = project_progress_submissions.project_id
        and projects.assigned_engineer_id = auth.uid()
    )
  );

create or replace function public.create_project_with_budget(
  p_actor uuid,
  p_name text,
  p_location text,
  p_subject text,
  p_lead text,
  p_engineer uuid,
  p_estimate_engineer uuid,
  p_budget numeric,
  p_start date,
  p_end date,
  p_client text default null,
  p_description text default null,
  p_image_url text default null
) returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project public.projects;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor and role = 'ceo' and is_active
  ) then
    raise exception 'Only an active CEO can create projects';
  end if;

  if p_engineer is not null and not exists (
    select 1 from public.profiles
    where id = p_engineer and role = 'engineer' and is_active
  ) then
    raise exception 'Assigned site engineer is invalid';
  end if;

  if p_estimate_engineer is not null and not exists (
    select 1 from public.profiles
    where id = p_estimate_engineer and role = 'engineer' and is_active
  ) then
    raise exception 'Assigned estimate engineer is invalid';
  end if;

  insert into public.projects(
    name,
    location,
    client_name,
    subject,
    lead,
    assigned_engineer_id,
    assigned_estimate_engineer_id,
    budget_ceiling,
    start_date,
    end_date,
    description,
    image_url,
    created_by,
    updated_by
  )
  values (
    trim(p_name),
    trim(p_location),
    nullif(trim(p_client), ''),
    nullif(trim(p_subject), ''),
    nullif(trim(p_lead), ''),
    p_engineer,
    coalesce(p_estimate_engineer, p_engineer),
    p_budget,
    p_start,
    p_end,
    nullif(trim(p_description), ''),
    nullif(trim(p_image_url), ''),
    p_actor,
    p_actor
  )
  returning * into new_project;

  insert into public.budget_projects(
    project_id,
    name,
    currency_code,
    starting_budget,
    created_by,
    updated_by
  )
  values (
    new_project.id,
    new_project.name,
    new_project.currency_code,
    new_project.budget_ceiling,
    p_actor,
    p_actor
  );

  return new_project;
end;
$$;

drop function if exists public.create_project_with_budget(uuid,text,text,text,text,uuid,numeric,date,date,text,text,text);
revoke all on function public.create_project_with_budget(uuid,text,text,text,text,uuid,uuid,numeric,date,date,text,text,text) from public;
grant execute on function public.create_project_with_budget(uuid,text,text,text,text,uuid,uuid,numeric,date,date,text,text,text) to service_role;

commit;
