-- Additive Engineer / Project Manager workspace schema.
-- Run after schema.sql and operations-crm-schema.sql.

alter type public.operations_task_status add value if not exists 'waiting_approval';
alter type public.material_request_status add value if not exists 'received';

alter table public.operations_projects
  add column if not exists current_phase text not null default 'planning'
    check (current_phase in ('planning','foundation','structural','finishing','completed')),
  add column if not exists schedule_status text not null default 'on_track'
    check (schedule_status in ('on_track','at_risk','delayed')),
  add column if not exists planned_progress integer not null default 0
    check (planned_progress between 0 and 100),
  add column if not exists project_code text;

alter table public.operations_tasks
  add column if not exists priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  add column if not exists progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  add column if not exists attachment_paths text[] not null default '{}',
  add column if not exists completed_at timestamptz;

alter table public.progress_updates
  add column if not exists title text not null default 'Site progress update',
  add column if not exists description text,
  add column if not exists report_date date not null default current_date,
  add column if not exists risks text,
  add column if not exists next_activity text,
  add column if not exists document_paths text[] not null default '{}';

alter table public.material_requests
  add column if not exists estimated_cost numeric(14,2),
  add column if not exists reason text,
  add column if not exists attachment_path text,
  add column if not exists received_by uuid references public.profiles(id) on delete set null,
  add column if not exists received_at timestamptz;

create table if not exists public.operations_phase_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.operations_projects(id) on delete cascade,
  phase text not null check (phase in ('planning','foundation','structural','finishing','completed')),
  started_at date not null default current_date,
  completed_at date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.operations_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.operations_tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  attachment_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.operations_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.operations_projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  report_type text not null check (report_type in ('daily','weekly','accomplishment')),
  title text not null,
  content_json jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  issues text,
  recommendations text,
  next_schedule text,
  due_date date,
  status text not null default 'draft' check (status in ('draft','submitted','revision_requested','accepted')),
  revision_note text,
  attachment_paths text[] not null default '{}',
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operations_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  href text,
  entity_type text,
  entity_id uuid,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(recipient_id, dedupe_key)
);

create table if not exists public.operations_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.operations_projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  title text not null,
  body text,
  photo_paths text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operations_reports_author_due_idx on public.operations_reports(author_id, status, due_date);
create index if not exists operations_notifications_recipient_idx on public.operations_notifications(recipient_id, read_at, created_at desc);
create index if not exists operations_activity_project_idx on public.operations_activity_events(project_id, created_at desc);
create index if not exists operations_task_comments_task_idx on public.operations_task_comments(task_id, created_at);

drop trigger if exists operations_reports_set_updated_at on public.operations_reports;
create trigger operations_reports_set_updated_at before update on public.operations_reports
  for each row execute function public.set_updated_at();

alter table public.operations_phase_history enable row level security;
alter table public.operations_task_comments enable row level security;
alter table public.operations_reports enable row level security;
alter table public.operations_notifications enable row level security;
alter table public.operations_activity_events enable row level security;

drop policy if exists "phase history visible to project roles" on public.operations_phase_history;
create policy "phase history visible to project roles" on public.operations_phase_history for select
  using (public.is_ceo() or public.is_project_member(project_id));
drop policy if exists "ceo manages phase history" on public.operations_phase_history;
create policy "ceo manages phase history" on public.operations_phase_history for all
  using (public.is_ceo()) with check (public.is_ceo());

drop policy if exists "task comments visible to project roles" on public.operations_task_comments;
create policy "task comments visible to project roles" on public.operations_task_comments for select
  using (exists(select 1 from public.operations_tasks t where t.id=task_id and (public.is_ceo() or public.is_project_member(t.project_id))));
drop policy if exists "project roles create task comments" on public.operations_task_comments;
create policy "project roles create task comments" on public.operations_task_comments for insert
  with check (author_id=auth.uid() and exists(select 1 from public.operations_tasks t where t.id=task_id and public.is_project_member(t.project_id)));

drop policy if exists "reports visible to project roles" on public.operations_reports;
create policy "reports visible to project roles" on public.operations_reports for select
  using (public.is_ceo() or public.is_project_member(project_id));
drop policy if exists "engineers manage own reports" on public.operations_reports;
create policy "engineers manage own reports" on public.operations_reports for all
  using (author_id=auth.uid() and public.is_project_member(project_id))
  with check (author_id=auth.uid() and public.is_project_member(project_id));

drop policy if exists "notifications visible to recipient" on public.operations_notifications;
create policy "notifications visible to recipient" on public.operations_notifications for select
  using (recipient_id=auth.uid() or public.is_ceo());
drop policy if exists "recipient updates notifications" on public.operations_notifications;
create policy "recipient updates notifications" on public.operations_notifications for update
  using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());

drop policy if exists "activity visible to project roles" on public.operations_activity_events;
create policy "activity visible to project roles" on public.operations_activity_events for select
  using (public.is_ceo() or public.is_project_member(project_id));
drop policy if exists "project roles create activity" on public.operations_activity_events;
create policy "project roles create activity" on public.operations_activity_events for insert
  with check ((actor_id=auth.uid() and public.is_project_member(project_id)) or public.is_ceo());

-- Existing operations server actions use the service role after explicit role and ownership checks.
-- Storage policies from operations-crm-schema.sql already cover Engineer evidence uploads.
