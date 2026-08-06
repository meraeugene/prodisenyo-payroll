begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  category text not null default 'other' check (category in ('plans','reports','permits','contracts','photos','forms','other')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_documents_project_created_idx
  on public.project_documents(project_id, created_at desc);

alter table public.project_documents enable row level security;

drop policy if exists "project documents readable by project members" on public.project_documents;
create policy "project documents readable by project members"
  on public.project_documents for select
  using (
    public.is_ceo()
    or exists (
      select 1 from public.projects projects
      where projects.id = project_documents.project_id
        and (
          projects.assigned_engineer_id = auth.uid()
          or projects.assigned_estimate_engineer_id = auth.uid()
        )
    )
  );

drop policy if exists "project documents created by assigned engineer" on public.project_documents;
create policy "project documents created by assigned engineer"
  on public.project_documents for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.projects projects
      where projects.id = project_documents.project_id
        and projects.assigned_engineer_id = auth.uid()
    )
  );

drop policy if exists "project documents deleted by uploader" on public.project_documents;
create policy "project documents deleted by uploader"
  on public.project_documents for delete
  using (uploaded_by = auth.uid());

commit;

