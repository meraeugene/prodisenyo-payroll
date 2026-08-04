begin;

alter type public.app_role add value if not exists 'purchaser';

alter table public.purchase_orders
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists quotation_reference text,
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending','scheduled','in_transit','delivered','verification_required','accepted','issue_reported')),
  add column if not exists scheduled_delivery_at timestamptz,
  add column if not exists receipt_invoice_reference text;

create unique index if not exists purchase_orders_material_request_unique
  on public.purchase_orders(material_request_id) where material_request_id is not null;

create table if not exists public.workflow_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  storage_path text not null,
  file_name text not null,
  content_type text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workflow_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.delivery_verifications (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  verified_by uuid not null references public.profiles(id) on delete restrict,
  received_quantity numeric(14,2) not null check (received_quantity >= 0),
  condition text not null check (condition in ('accepted','missing','damaged','missing_and_damaged')),
  accepted boolean not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_material_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null unique references public.purchase_orders(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  item_name text not null,
  quantity numeric(14,2) not null,
  unit text not null,
  total_cost numeric(14,2) not null check (total_cost >= 0),
  accepted_by uuid not null references public.profiles(id) on delete restrict,
  accepted_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  expense_date date not null,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_closure_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  final_notes text not null,
  progress_percent numeric(5,2) not null,
  material_cost numeric(14,2) not null default 0,
  other_expense_cost numeric(14,2) not null default 0,
  payroll_cost numeric(14,2) not null default 0,
  status text not null default 'submitted' check (status in ('submitted','approved','returned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  submitted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  due_date date not null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'todo' check (status in ('todo','in_progress','completed','delayed')),
  progress integer not null default 0 check (progress between 0 and 100),
  completion_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into storage.buckets(id,name,public)
values ('workflow-evidence','workflow-evidence',false)
on conflict (id) do update set public = false;

create or replace function public.approve_material_request_and_create_order(
  p_request_id uuid, p_actor uuid, p_notes text default null
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare r public.material_requests; po_id uuid; purchaser_id uuid;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role::text='ceo' and is_active)
  then raise exception 'Only an active CEO can approve material requests'; end if;
  select * into r from public.material_requests where id=p_request_id for update;
  if r.id is null then raise exception 'Material request not found'; end if;
  if r.status not in ('submitted','approved','purchasing') then raise exception 'Material request cannot be approved from status %',r.status; end if;
  select id into purchaser_id from public.profiles where role::text='purchaser' and is_active order by created_at limit 1;
  insert into public.purchase_orders(project_id,material_request_id,created_by,assigned_to,item_name,quantity,unit,status,notes)
  values(r.project_id,r.id,p_actor,purchaser_id,r.material_name,r.quantity,r.unit,'draft',nullif(trim(p_notes),''))
  on conflict (material_request_id) where material_request_id is not null do update set notes=coalesce(excluded.notes,public.purchase_orders.notes)
  returning id into po_id;
  update public.material_requests set status='purchasing',approved_by=p_actor,approved_at=coalesce(approved_at,timezone('utc',now())),
    rejected_by=null,rejected_at=null,rejection_reason=null where id=r.id;
  insert into public.workflow_notifications(recipient_id,project_id,kind,title,message,entity_type,entity_id)
  values(r.requested_by,r.project_id,'material_approved','Material request approved',r.material_name||' was approved for purchasing.','material_request',r.id);
  if purchaser_id is not null then
    insert into public.workflow_notifications(recipient_id,project_id,kind,title,message,entity_type,entity_id)
    values(purchaser_id,r.project_id,'purchase_assigned','Purchase assigned','An approved material request is ready for purchasing.','purchase_order',po_id);
  end if;
  return po_id;
end $$;

alter table public.workflow_evidence enable row level security;
alter table public.workflow_notifications enable row level security;
alter table public.delivery_verifications enable row level security;
alter table public.project_material_receipts enable row level security;
alter table public.project_expenses enable row level security;
alter table public.project_closure_submissions enable row level security;
alter table public.project_tasks enable row level security;

commit;
