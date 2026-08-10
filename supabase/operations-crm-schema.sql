-- Construction Operations CRM. Run after schema.sql and budget-tracker-schema.sql.
alter type public.app_role add value if not exists 'purchaser';

do $$ begin
  create type public.operations_project_status as enum ('planning','active','on_hold','completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.operations_task_status as enum ('todo','in_progress','blocked','completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.material_request_status as enum ('pending','approved','rejected','assigned','ordered','partially_delivered','delivered','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.operations_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null, site text not null, description text,
  status public.operations_project_status not null default 'planning',
  reported_progress integer not null default 0 check (reported_progress between 0 and 100),
  start_date date, target_date date,
  lead_engineer_id uuid references public.profiles(id) on delete set null,
  budget_project_id uuid references public.budget_projects(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.operations_project_members (
  project_id uuid not null references public.operations_projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(project_id, profile_id)
);
create table if not exists public.operations_milestones (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.operations_projects(id) on delete cascade,
  title text not null, due_date date, is_completed boolean not null default false, sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.operations_tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.operations_projects(id) on delete cascade,
  milestone_id uuid references public.operations_milestones(id) on delete set null, title text not null, description text,
  assignee_id uuid references public.profiles(id) on delete set null, status public.operations_task_status not null default 'todo',
  due_date date, created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.progress_updates (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.operations_projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict, progress_percent integer not null check (progress_percent between 0 and 100),
  completed_work text not null, next_steps text not null, blockers text, photo_paths text[] not null default '{}',
  is_flagged boolean not null default false, flagged_by uuid references public.profiles(id) on delete set null, flagged_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.progress_update_comments (
  id uuid primary key default gen_random_uuid(), update_id uuid not null references public.progress_updates(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict, body text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.material_requests (
  id uuid primary key default gen_random_uuid(), legacy_request_id uuid unique,
  project_id uuid references public.operations_projects(id) on delete set null,
  task_id uuid references public.operations_tasks(id) on delete set null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  material_name text not null, quantity numeric(12,2) not null check(quantity > 0), unit text not null,
  needed_by date not null, site text, priority text not null check(priority in ('low','medium','high','urgent')), notes text,
  status public.material_request_status not null default 'pending', decision_by uuid references public.profiles(id) on delete set null,
  decision_at timestamptz, rejection_reason text, assigned_purchaser_id uuid references public.profiles(id) on delete set null,
  supplier text, actual_cost numeric(14,2), order_date date, receipt_path text, delivery_date date,
  delivered_quantity numeric(12,2), purchase_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.material_request_history (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.material_requests(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict, status public.material_request_status not null,
  notes text, created_at timestamptz not null default now()
);

create index if not exists operations_projects_lead_idx on public.operations_projects(lead_engineer_id, status);
create index if not exists operations_tasks_project_idx on public.operations_tasks(project_id, status, due_date);
create index if not exists progress_updates_project_idx on public.progress_updates(project_id, created_at desc);
create index if not exists material_requests_queue_idx on public.material_requests(status, assigned_purchaser_id, created_at desc);

drop trigger if exists operations_projects_set_updated_at on public.operations_projects;
create trigger operations_projects_set_updated_at before update on public.operations_projects for each row execute function public.set_updated_at();
drop trigger if exists operations_tasks_set_updated_at on public.operations_tasks;
create trigger operations_tasks_set_updated_at before update on public.operations_tasks for each row execute function public.set_updated_at();
drop trigger if exists material_requests_set_updated_at on public.material_requests;
create trigger material_requests_set_updated_at before update on public.material_requests for each row execute function public.set_updated_at();

create or replace function public.is_purchaser() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role::text='purchaser' and is_active=true)
$$;
create or replace function public.is_project_member(target uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.operations_projects p where p.id=target and p.lead_engineer_id=auth.uid())
    or exists(select 1 from public.operations_project_members m where m.project_id=target and m.profile_id=auth.uid())
$$;

alter table public.operations_projects enable row level security;
alter table public.operations_project_members enable row level security;
alter table public.operations_milestones enable row level security;
alter table public.operations_tasks enable row level security;
alter table public.progress_updates enable row level security;
alter table public.progress_update_comments enable row level security;
alter table public.material_requests enable row level security;
alter table public.material_request_history enable row level security;

create policy "operations projects visible to assigned roles" on public.operations_projects for select using (public.is_ceo() or public.is_project_member(id));
create policy "operations projects managed by ceo" on public.operations_projects for all using (public.is_ceo()) with check (public.is_ceo());
create policy "project members visible to project roles" on public.operations_project_members for select using (public.is_ceo() or public.is_project_member(project_id));
create policy "project members managed by ceo" on public.operations_project_members for all using (public.is_ceo()) with check (public.is_ceo());
create policy "milestones visible to project roles" on public.operations_milestones for select using (public.is_ceo() or public.is_project_member(project_id));
create policy "milestones managed by ceo" on public.operations_milestones for all using (public.is_ceo()) with check (public.is_ceo());
create policy "tasks visible to project roles" on public.operations_tasks for select using (public.is_ceo() or public.is_project_member(project_id));
create policy "tasks managed by ceo" on public.operations_tasks for all using (public.is_ceo()) with check (public.is_ceo());
create policy "updates visible to project roles" on public.progress_updates for select using (public.is_ceo() or public.is_project_member(project_id));
create policy "engineers create updates" on public.progress_updates for insert with check (author_id=auth.uid() and public.is_project_member(project_id));
create policy "ceo flags updates" on public.progress_updates for update using (public.is_ceo()) with check (public.is_ceo());
create policy "comments visible with update" on public.progress_update_comments for select using (exists(select 1 from public.progress_updates u where u.id=update_id and (public.is_ceo() or public.is_project_member(u.project_id))));
create policy "ceo comments" on public.progress_update_comments for insert with check (public.is_ceo() and author_id=auth.uid());
create policy "material requests role visibility" on public.material_requests for select using (public.is_ceo() or requested_by=auth.uid() or assigned_purchaser_id=auth.uid());
create policy "engineers request materials" on public.material_requests for insert with check (requested_by=auth.uid() and public.is_engineer());
create policy "ceo manages requests" on public.material_requests for update using (public.is_ceo()) with check (public.is_ceo());
create policy "purchaser updates assignments" on public.material_requests for update using (assigned_purchaser_id=auth.uid() and public.is_purchaser()) with check (assigned_purchaser_id=auth.uid());
create policy "request history visible to roles" on public.material_request_history for select using (exists(select 1 from public.material_requests r where r.id=request_id and (public.is_ceo() or r.requested_by=auth.uid() or r.assigned_purchaser_id=auth.uid())));
create policy "request history authored by actor" on public.material_request_history for insert with check (actor_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('operations-evidence','operations-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
create policy "operations evidence uploads" on storage.objects for insert to authenticated with check (bucket_id='operations-evidence' and (public.is_ceo() or public.is_engineer() or public.is_purchaser()));
create policy "operations evidence reads" on storage.objects for select to authenticated using (bucket_id='operations-evidence' and (public.is_ceo() or public.is_engineer() or public.is_purchaser()));

-- Preserve legacy engineer requests that were stored in audit_logs.
insert into public.material_requests(legacy_request_id,requested_by,material_name,quantity,unit,needed_by,site,priority,notes,created_at)
select a.entity_id::uuid, a.actor_id, a.payload->>'materialName', (a.payload->>'quantity')::numeric,
  a.payload->>'unit', (a.payload->>'neededBy')::date, nullif(a.payload->>'site',''), a.payload->>'priority', nullif(a.payload->>'notes',''), a.created_at
from public.audit_logs a
where a.entity_type='material_request' and a.action='material_request_created' and a.actor_id is not null
on conflict(legacy_request_id) do nothing;
