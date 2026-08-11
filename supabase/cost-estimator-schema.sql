do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'estimate_status' and n.nspname = 'public'
  ) then
    create type public.estimate_status as enum (
      'draft',
      'submitted',
      'approved',
      'rejected'
    );
  end if;
end
$$;

alter type public.estimate_status add value if not exists 'draft';
alter type public.estimate_status add value if not exists 'submitted';
alter type public.estimate_status add value if not exists 'approved';
alter type public.estimate_status add value if not exists 'rejected';

create table if not exists public.cost_catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.budget_item_category not null,
  unit_label text not null,
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  notes text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_estimates (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  project_type public.budget_project_type,
  client_name text,
  location text,
  owner_name text,
  notes text,
  status public.estimate_status not null default 'draft',
  estimate_total numeric(14,2) not null default 0 check (estimate_total >= 0),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  budget_project_id uuid references public.budget_projects(id) on delete set null,
  source_estimate_id uuid references public.project_estimates(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.project_estimates alter column client_name drop not null;

-- Keep older environments in sync with the latest estimate fields.
alter table public.project_estimates
  add column if not exists location text,
  add column if not exists owner_name text;

create table if not exists public.project_estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.project_estimates(id) on delete cascade,
  catalog_item_id uuid references public.cost_catalog_items(id) on delete set null,
  boq_section text not null default 'General Works',
  boq_item_number text not null default '',
  item_name_snapshot text not null,
  material_name_snapshot text not null default '',
  category_snapshot public.budget_item_category not null,
  unit_label_snapshot text not null,
  unit_cost_snapshot numeric(14,2) not null default 0 check (unit_cost_snapshot >= 0),
  quantity numeric(14,2) not null default 0 check (quantity >= 0),
  line_total numeric(14,2) not null default 0 check (line_total >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.project_estimate_items
  add column if not exists material_name_snapshot text not null default '',
  add column if not exists boq_section text not null default 'General Works',
  add column if not exists boq_item_number text not null default '';

create index if not exists cost_catalog_items_active_idx
  on public.cost_catalog_items(is_active, category, name);

create index if not exists project_estimates_requester_status_idx
  on public.project_estimates(requested_by, status, updated_at desc);

create index if not exists project_estimates_status_updated_idx
  on public.project_estimates(status, updated_at desc);

create index if not exists project_estimate_items_estimate_id_idx
  on public.project_estimate_items(estimate_id, sort_order, created_at);

drop trigger if exists cost_catalog_items_set_updated_at on public.cost_catalog_items;
create trigger cost_catalog_items_set_updated_at
before update on public.cost_catalog_items
for each row execute function public.set_updated_at();

drop trigger if exists project_estimates_set_updated_at on public.project_estimates;
create trigger project_estimates_set_updated_at
before update on public.project_estimates
for each row execute function public.set_updated_at();

drop trigger if exists project_estimate_items_set_updated_at on public.project_estimate_items;
create trigger project_estimate_items_set_updated_at
before update on public.project_estimate_items
for each row execute function public.set_updated_at();

alter table public.cost_catalog_items enable row level security;
alter table public.project_estimates enable row level security;
alter table public.project_estimate_items enable row level security;

drop policy if exists "cost catalog readable by engineers and ceo" on public.cost_catalog_items;
drop policy if exists "cost catalog managed by engineers" on public.cost_catalog_items;
drop policy if exists "project estimates readable by engineer owner or ceo" on public.project_estimates;
drop policy if exists "project estimates managed by engineer owner" on public.project_estimates;
drop policy if exists "project estimate items readable by engineer owner or ceo" on public.project_estimate_items;
drop policy if exists "project estimate items managed by engineer owner" on public.project_estimate_items;

create policy "cost catalog readable by engineers and ceo"
  on public.cost_catalog_items
  for select
  using (public.is_ceo() or public.is_engineer());

create policy "cost catalog managed by engineers"
  on public.cost_catalog_items
  for all
  using (public.is_engineer())
  with check (public.is_engineer());

create policy "project estimates readable by engineer owner or ceo"
  on public.project_estimates
  for select
  using (public.is_ceo() or requested_by = auth.uid());

create policy "project estimates managed by engineer owner"
  on public.project_estimates
  for all
  using (requested_by = auth.uid())
  with check (requested_by = auth.uid());

create policy "project estimate items readable by engineer owner or ceo"
  on public.project_estimate_items
  for select
  using (
    public.is_ceo()
    or exists (
      select 1
      from public.project_estimates estimates
      where estimates.id = project_estimate_items.estimate_id
        and estimates.requested_by = auth.uid()
    )
  );

create policy "project estimate items managed by engineer owner"
  on public.project_estimate_items
  for all
  using (
    exists (
      select 1
      from public.project_estimates estimates
      where estimates.id = project_estimate_items.estimate_id
        and estimates.requested_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.project_estimates estimates
      where estimates.id = project_estimate_items.estimate_id
        and estimates.requested_by = auth.uid()
    )
  );
