begin;

do $$ begin
  create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed', 'archived');
exception when duplicate_object then null;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  client_name text,
  subject text,
  lead text,
  assigned_engineer_id uuid references public.profiles(id) on delete set null,
  assigned_estimate_engineer_id uuid references public.profiles(id) on delete set null,
  status public.project_status not null default 'active',
  budget_ceiling numeric(14,2) not null check (budget_ceiling > 0),
  currency_code text not null default 'PHP' check (char_length(currency_code) = 3),
  start_date date not null,
  end_date date not null,
  description text,
  image_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint projects_date_order check (end_date >= start_date)
);

create table if not exists public.project_progress_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  activity text not null,
  weight_percent numeric(5,2) not null check (weight_percent > 0 and weight_percent <= 100),
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
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

alter table public.budget_projects add column if not exists project_id uuid references public.projects(id) on delete restrict;
alter table public.project_estimates add column if not exists project_id uuid references public.projects(id) on delete restrict;
alter table public.projects add column if not exists assigned_estimate_engineer_id uuid references public.profiles(id) on delete set null;

create unique index if not exists budget_projects_project_id_uidx on public.budget_projects(project_id) where project_id is not null;
create index if not exists projects_assignee_status_idx on public.projects(assigned_engineer_id, status, created_at desc);
create index if not exists projects_estimate_assignee_status_idx on public.projects(assigned_estimate_engineer_id, status, created_at desc);
create index if not exists projects_status_idx on public.projects(status, created_at desc);
create index if not exists progress_project_sort_idx on public.project_progress_activities(project_id, sort_order, created_at);
create index if not exists progress_submissions_project_idx on public.project_progress_submissions(project_id, submitted_at desc);
create index if not exists estimates_project_idx on public.project_estimates(project_id, updated_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists project_progress_set_updated_at on public.project_progress_activities;
create trigger project_progress_set_updated_at before update on public.project_progress_activities for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_progress_activities enable row level security;
alter table public.project_progress_submissions enable row level security;

drop policy if exists "projects readable by ceo and assignee" on public.projects;
create policy "projects readable by ceo and assignee" on public.projects for select
  using (public.is_ceo() or assigned_engineer_id = auth.uid() or assigned_estimate_engineer_id = auth.uid());
drop policy if exists "projects managed by ceo" on public.projects;
create policy "projects managed by ceo" on public.projects for all
  using (public.is_ceo()) with check (public.is_ceo());

drop policy if exists "progress readable by project members" on public.project_progress_activities;
create policy "progress readable by project members" on public.project_progress_activities for select using (
  exists (select 1 from public.projects p where p.id = project_id and (public.is_ceo() or p.assigned_engineer_id = auth.uid()))
);
drop policy if exists "progress managed by assigned engineer" on public.project_progress_activities;
create policy "progress managed by assigned engineer" on public.project_progress_activities for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.assigned_engineer_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.assigned_engineer_id = auth.uid())
);

drop policy if exists "progress submissions readable by project members" on public.project_progress_submissions;
create policy "progress submissions readable by project members" on public.project_progress_submissions for select using (
  exists (select 1 from public.projects p where p.id = project_id and (public.is_ceo() or p.assigned_engineer_id = auth.uid()))
);
drop policy if exists "progress submissions created by assigned engineer" on public.project_progress_submissions;
create policy "progress submissions created by assigned engineer" on public.project_progress_submissions for insert with check (
  submitted_by = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.assigned_engineer_id = auth.uid())
);

create or replace function public.create_project_with_budget(
  p_actor uuid, p_name text, p_location text, p_subject text, p_lead text,
  p_engineer uuid, p_estimate_engineer uuid, p_budget numeric, p_start date, p_end date,
  p_client text default null, p_description text default null, p_image_url text default null
) returns public.projects language plpgsql security definer set search_path = public as $$
declare new_project public.projects;
begin
  if not exists (select 1 from public.profiles where id = p_actor and role = 'ceo' and is_active) then
    raise exception 'Only an active CEO can create projects';
  end if;
  if p_engineer is not null and not exists (select 1 from public.profiles where id = p_engineer and role = 'engineer' and is_active) then
    raise exception 'Assigned engineer is invalid';
  end if;
  if p_estimate_engineer is not null and not exists (select 1 from public.profiles where id = p_estimate_engineer and role = 'engineer' and is_active) then
    raise exception 'Estimate engineer is invalid';
  end if;
  insert into public.projects(name, location, client_name, subject, lead, assigned_engineer_id, assigned_estimate_engineer_id, budget_ceiling, start_date, end_date, description, image_url, created_by, updated_by)
  values (trim(p_name), trim(p_location), nullif(trim(p_client), ''), nullif(trim(p_subject), ''), nullif(trim(p_lead), ''), p_engineer, coalesce(p_estimate_engineer, p_engineer), p_budget, p_start, p_end, nullif(trim(p_description), ''), nullif(trim(p_image_url), ''), p_actor, p_actor)
  returning * into new_project;
  insert into public.budget_projects(project_id, name, currency_code, starting_budget, created_by, updated_by)
  values (new_project.id, new_project.name, new_project.currency_code, new_project.budget_ceiling, p_actor, p_actor);
  return new_project;
end $$;

drop function if exists public.create_project_with_budget(uuid,text,text,text,text,uuid,numeric,date,date,text,text,text);
revoke all on function public.create_project_with_budget(uuid,text,text,text,text,uuid,uuid,numeric,date,date,text,text,text) from public;
grant execute on function public.create_project_with_budget(uuid,text,text,text,text,uuid,uuid,numeric,date,date,text,text,text) to service_role;

commit;
