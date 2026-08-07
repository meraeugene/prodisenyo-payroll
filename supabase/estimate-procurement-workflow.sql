begin;

alter table public.projects alter column status set default 'planning';

alter table public.projects
  add column if not exists active_approved_estimate_id uuid;

alter table public.project_estimate_items
  add column if not exists pricing_basis text not null default 'catalog',
  add column if not exists reference_supplier text,
  add column if not exists reference_quotation text;

alter table public.material_requests
  add column if not exists estimate_item_id uuid references public.project_estimate_items(id) on delete set null;

alter table public.budget_items
  add column if not exists source_estimate_item_id uuid references public.project_estimate_items(id) on delete set null,
  add column if not exists source_material_request_id uuid references public.material_requests(id) on delete set null;

alter table public.project_expenses
  add column if not exists purchase_order_id uuid references public.purchase_orders(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_active_approved_estimate_id_fkey'
  ) then
    alter table public.projects
      add constraint projects_active_approved_estimate_id_fkey
      foreign key (active_approved_estimate_id)
      references public.project_estimates(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'project_estimate_items_pricing_basis_check'
  ) then
    alter table public.project_estimate_items
      add constraint project_estimate_items_pricing_basis_check
      check (pricing_basis in ('catalog', 'supplier_quote'));
  end if;
end
$$;

create index if not exists material_requests_estimate_item_idx
  on public.material_requests(estimate_item_id, status, created_at desc);

create unique index if not exists budget_items_source_estimate_item_unique
  on public.budget_items(source_estimate_item_id)
  where source_estimate_item_id is not null;

create unique index if not exists budget_items_source_material_request_unique
  on public.budget_items(source_material_request_id)
  where source_material_request_id is not null;

create unique index if not exists project_expenses_purchase_order_unique
  on public.project_expenses(purchase_order_id)
  where purchase_order_id is not null;

update public.projects project
set active_approved_estimate_id = latest.id
from (
  select distinct on (project_id) id, project_id
  from public.project_estimates
  where project_id is not null and status = 'approved'
  order by project_id, approved_at desc nulls last, updated_at desc
) latest
where project.id = latest.project_id
  and project.active_approved_estimate_id is null;

insert into public.budget_items(
  project_id,
  name,
  status,
  category,
  estimated_cost,
  actual_spent,
  notes,
  sort_order,
  source_estimate_item_id,
  created_by,
  updated_by
)
select
  budget.id,
  item.item_name_snapshot,
  'upcoming'::public.budget_item_status,
  item.category_snapshot,
  item.line_total,
  0,
  item.notes,
  item.sort_order,
  item.id,
  coalesce(estimate.approved_by, estimate.requested_by),
  estimate.approved_by
from public.projects project
join public.project_estimates estimate on estimate.id = project.active_approved_estimate_id
join public.project_estimate_items item on item.estimate_id = estimate.id
join public.budget_projects budget on budget.project_id = project.id
on conflict (source_estimate_item_id) where source_estimate_item_id is not null
do update set
  name = excluded.name,
  category = excluded.category,
  estimated_cost = excluded.estimated_cost,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_by = excluded.updated_by;

create or replace function public.ceo_update_submitted_estimate(
  p_estimate_id uuid,
  p_actor uuid,
  p_items jsonb
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  estimate_row public.project_estimates;
  item_payload jsonb;
  before_items jsonb;
  after_items jsonb;
  next_total numeric(14,2) := 0;
  supplied_count integer := 0;
  existing_count integer := 0;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor and role::text = 'ceo' and is_active
  ) then
    raise exception 'Only an active CEO can edit submitted estimates';
  end if;

  select * into estimate_row
  from public.project_estimates
  where id = p_estimate_id
  for update;

  if estimate_row.id is null then raise exception 'Estimate not found'; end if;
  if estimate_row.status <> 'submitted' then
    raise exception 'Only submitted estimates can be edited';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one estimate item is required';
  end if;

  select count(*) into existing_count
  from public.project_estimate_items where estimate_id = p_estimate_id;
  supplied_count := jsonb_array_length(p_items);
  if supplied_count <> existing_count then
    raise exception 'CEO editing cannot add or remove estimate lines';
  end if;

  select coalesce(jsonb_agg(to_jsonb(item) order by item.sort_order), '[]'::jsonb)
  into before_items
  from public.project_estimate_items item
  where item.estimate_id = p_estimate_id;

  for item_payload in select value from jsonb_array_elements(p_items)
  loop
    if coalesce((item_payload->>'quantity')::numeric, 0) <= 0 then
      raise exception 'Estimate quantity must be greater than zero';
    end if;
    if coalesce((item_payload->>'unitCost')::numeric, 0) < 0 then
      raise exception 'Estimate unit cost cannot be negative';
    end if;
    if coalesce(item_payload->>'pricingBasis', 'catalog') = 'supplier_quote'
      and (nullif(trim(item_payload->>'referenceSupplier'), '') is null
        or nullif(trim(item_payload->>'referenceQuotation'), '') is null) then
      raise exception 'Supplier and quotation reference are required for supplier pricing';
    end if;

    update public.project_estimate_items
    set
      quantity = round((item_payload->>'quantity')::numeric, 2),
      unit_cost_snapshot = round((item_payload->>'unitCost')::numeric, 2),
      line_total = round(
        (item_payload->>'quantity')::numeric * (item_payload->>'unitCost')::numeric,
        2
      ),
      notes = nullif(trim(item_payload->>'notes'), ''),
      pricing_basis = coalesce(item_payload->>'pricingBasis', 'catalog'),
      reference_supplier = nullif(trim(item_payload->>'referenceSupplier'), ''),
      reference_quotation = nullif(trim(item_payload->>'referenceQuotation'), '')
    where id = (item_payload->>'id')::uuid
      and estimate_id = p_estimate_id;

    if not found then raise exception 'Estimate item not found'; end if;
  end loop;

  select coalesce(sum(line_total), 0),
    coalesce(jsonb_agg(to_jsonb(item) order by item.sort_order), '[]'::jsonb)
  into next_total, after_items
  from public.project_estimate_items item
  where item.estimate_id = p_estimate_id;

  update public.project_estimates
  set estimate_total = next_total
  where id = p_estimate_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, payload)
  values (
    p_actor,
    'project_estimate_edited_by_ceo',
    'project_estimate',
    p_estimate_id,
    jsonb_build_object('before', before_items, 'after', after_items, 'estimate_total', next_total)
  );

  return next_total;
end
$$;

create or replace function public.approve_project_estimate_with_baseline(
  p_estimate_id uuid,
  p_actor uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  estimate_row public.project_estimates;
  project_row public.projects;
  budget_id uuid;
  approved_at_value timestamptz := timezone('utc', now());
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor and role::text = 'ceo' and is_active
  ) then
    raise exception 'Only an active CEO can approve estimates';
  end if;

  select * into estimate_row
  from public.project_estimates
  where id = p_estimate_id
  for update;

  if estimate_row.id is null then raise exception 'Estimate not found'; end if;
  if estimate_row.status not in ('submitted', 'approved') then
    raise exception 'Only submitted estimates can be approved';
  end if;
  if estimate_row.project_id is null then
    raise exception 'Estimate is not linked to a project';
  end if;

  select * into project_row
  from public.projects where id = estimate_row.project_id for update;

  if project_row.active_approved_estimate_id is not null
    and project_row.active_approved_estimate_id <> estimate_row.id
    and exists (
      select 1
      from public.material_requests request
      join public.project_estimate_items item on item.id = request.estimate_item_id
      where item.estimate_id = project_row.active_approved_estimate_id
        and request.status not in ('rejected', 'cancelled')
    ) then
    raise exception 'The active estimate cannot be replaced after procurement has started';
  end if;

  select id into budget_id
  from public.budget_projects
  where project_id = estimate_row.project_id
  order by created_at
  limit 1;
  if budget_id is null then raise exception 'Project budget workspace not found'; end if;

  if project_row.active_approved_estimate_id is not null
    and project_row.active_approved_estimate_id <> estimate_row.id then
    delete from public.budget_items budget_item
    using public.project_estimate_items old_item
    where budget_item.source_estimate_item_id = old_item.id
      and old_item.estimate_id = project_row.active_approved_estimate_id
      and budget_item.actual_spent = 0;
  end if;

  update public.project_estimates
  set
    status = 'approved',
    approved_by = p_actor,
    approved_at = approved_at_value,
    rejected_at = null,
    rejection_reason = null,
    budget_project_id = budget_id
  where id = estimate_row.id;

  update public.projects
  set active_approved_estimate_id = estimate_row.id, updated_by = p_actor
  where id = estimate_row.project_id;

  insert into public.budget_items(
    project_id, name, status, category, estimated_cost, actual_spent,
    notes, sort_order, source_estimate_item_id, created_by, updated_by
  )
  select
    budget_id, item.item_name_snapshot, 'upcoming'::public.budget_item_status,
    item.category_snapshot, item.line_total, 0, item.notes, item.sort_order,
    item.id, p_actor, p_actor
  from public.project_estimate_items item
  where item.estimate_id = estimate_row.id
  on conflict (source_estimate_item_id) where source_estimate_item_id is not null
  do update set
    name = excluded.name,
    category = excluded.category,
    estimated_cost = excluded.estimated_cost,
    notes = excluded.notes,
    sort_order = excluded.sort_order,
    updated_by = excluded.updated_by;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, payload)
  values (
    p_actor, 'project_estimate_approved', 'project_estimate', estimate_row.id,
    jsonb_build_object('estimate_total', estimate_row.estimate_total, 'budget_project_id', budget_id)
  );

  insert into public.workflow_notifications(
    recipient_id, project_id, kind, title, message, entity_type, entity_id
  ) values (
    estimate_row.requested_by, estimate_row.project_id, 'estimate_approved',
    'Cost estimate approved', estimate_row.project_name || ' estimate is now the approved budget baseline.',
    'project_estimate', estimate_row.id
  );

  return budget_id;
end
$$;

create or replace function public.approve_material_request_and_create_order(
  p_request_id uuid,
  p_actor uuid,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.material_requests;
  estimate_cost numeric(14,2) := 0;
  purchase_order_id uuid;
  purchaser_id uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor and role::text = 'ceo' and is_active
  ) then
    raise exception 'Only an active CEO can approve material requests';
  end if;

  select * into request_row
  from public.material_requests where id = p_request_id for update;
  if request_row.id is null then raise exception 'Material request not found'; end if;
  if request_row.status not in ('submitted', 'approved', 'purchasing') then
    raise exception 'Material request cannot be approved from status %', request_row.status;
  end if;

  if request_row.estimate_item_id is not null then
    select unit_cost_snapshot into estimate_cost
    from public.project_estimate_items
    where id = request_row.estimate_item_id;
  end if;

  select id into purchaser_id
  from public.profiles
  where role::text = 'purchaser' and is_active
  order by created_at
  limit 1;

  insert into public.purchase_orders(
    project_id, material_request_id, created_by, assigned_to, item_name,
    quantity, unit, estimated_unit_cost, status, notes
  ) values (
    request_row.project_id, request_row.id, p_actor, purchaser_id,
    request_row.material_name, request_row.quantity, request_row.unit,
    coalesce(estimate_cost, 0), 'draft', nullif(trim(p_notes), '')
  )
  on conflict (material_request_id) where material_request_id is not null
  do update set
    estimated_unit_cost = excluded.estimated_unit_cost,
    notes = coalesce(excluded.notes, public.purchase_orders.notes)
  returning id into purchase_order_id;

  update public.material_requests
  set
    status = 'purchasing',
    approved_by = p_actor,
    approved_at = coalesce(approved_at, timezone('utc', now())),
    rejected_by = null,
    rejected_at = null,
    rejection_reason = null
  where id = request_row.id;

  insert into public.workflow_notifications(
    recipient_id, project_id, kind, title, message, entity_type, entity_id
  ) values (
    request_row.requested_by, request_row.project_id, 'material_approved',
    'Material request approved', request_row.material_name || ' was approved for purchasing.',
    'material_request', request_row.id
  );

  if purchaser_id is not null then
    insert into public.workflow_notifications(
      recipient_id, project_id, kind, title, message, entity_type, entity_id
    ) values (
      purchaser_id, request_row.project_id, 'purchase_assigned', 'Purchase assigned',
      'An approved material request is ready for supplier quotation.',
      'purchase_order', purchase_order_id
    );
  end if;

  return purchase_order_id;
end
$$;

create or replace function public.update_purchase_order_workflow(
  p_order_id uuid,
  p_actor uuid,
  p_supplier_name text,
  p_actual_unit_cost numeric,
  p_quotation_reference text,
  p_status text,
  p_delivery_status text,
  p_receipt_invoice_reference text,
  p_notes text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.purchase_orders;
  request_row public.material_requests;
  budget_id uuid;
  budget_item_id uuid;
  total_cost numeric(14,2);
  now_value timestamptz := timezone('utc', now());
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor and role::text = 'purchaser' and is_active
  ) then
    raise exception 'Only an active purchaser can update purchase orders';
  end if;

  select * into order_row
  from public.purchase_orders where id = p_order_id for update;
  if order_row.id is null then raise exception 'Purchase order not found'; end if;
  if order_row.assigned_to is not null and order_row.assigned_to <> p_actor then
    raise exception 'Purchase order is assigned to another purchaser';
  end if;
  if order_row.status = 'received' then
    raise exception 'Received purchase orders are final';
  end if;
  if p_status not in ('draft','submitted','approved','ordered','received','cancelled') then
    raise exception 'Invalid purchase status';
  end if;
  if p_delivery_status not in ('pending','scheduled','in_transit','delivered') then
    raise exception 'Invalid delivery status';
  end if;
  if coalesce(p_actual_unit_cost, 0) < 0 then
    raise exception 'Actual unit cost cannot be negative';
  end if;
  if p_status <> 'draft' and nullif(trim(p_supplier_name), '') is null then
    raise exception 'Supplier is required once purchasing starts';
  end if;
  if p_status <> 'draft' and nullif(trim(p_quotation_reference), '') is null then
    raise exception 'Quotation reference is required once purchasing starts';
  end if;
  if p_status = 'received' and (
    p_delivery_status <> 'delivered'
    or coalesce(p_actual_unit_cost, 0) <= 0
    or nullif(trim(p_receipt_invoice_reference), '') is null
  ) then
    raise exception 'Received orders require delivered status, a positive price, and a receipt reference';
  end if;

  update public.purchase_orders
  set
    assigned_to = p_actor,
    supplier_name = nullif(trim(p_supplier_name), ''),
    actual_unit_cost = round(coalesce(p_actual_unit_cost, 0), 2),
    quotation_reference = nullif(trim(p_quotation_reference), ''),
    status = p_status,
    delivery_status = p_delivery_status,
    receipt_invoice_reference = nullif(trim(p_receipt_invoice_reference), ''),
    notes = nullif(trim(p_notes), ''),
    ordered_at = case when p_status = 'ordered' then coalesce(ordered_at, now_value) else ordered_at end,
    received_at = case when p_status = 'received' then coalesce(received_at, now_value) else received_at end
  where id = p_order_id;

  if order_row.material_request_id is not null then
    select * into request_row
    from public.material_requests where id = order_row.material_request_id;
  end if;

  select id into budget_id
  from public.budget_projects
  where project_id = order_row.project_id
  order by created_at
  limit 1;

  if request_row.id is not null and budget_id is not null then
    if request_row.estimate_item_id is not null then
      select id into budget_item_id from public.budget_items
      where source_estimate_item_id = request_row.estimate_item_id;
    else
      insert into public.budget_items(
        project_id, name, status, category, estimated_cost, actual_spent,
        notes, source_material_request_id, created_by, updated_by
      ) values (
        budget_id, 'Unplanned - ' || order_row.item_name, 'upcoming', 'materials',
        round(order_row.quantity * coalesce(p_actual_unit_cost, 0), 2), 0,
        'Outside approved estimate', request_row.id, p_actor, p_actor
      )
      on conflict (source_material_request_id) where source_material_request_id is not null
      do update set
        estimated_cost = excluded.estimated_cost,
        updated_by = excluded.updated_by
      returning id into budget_item_id;
    end if;
  end if;

  if p_status = 'received' then
    total_cost := round(order_row.quantity * p_actual_unit_cost, 2);

    insert into public.project_material_receipts(
      purchase_order_id, project_id, item_name, quantity, unit,
      total_cost, accepted_by, accepted_at
    ) values (
      order_row.id, order_row.project_id, order_row.item_name, order_row.quantity,
      order_row.unit, total_cost, p_actor, now_value
    )
    on conflict (purchase_order_id) do update set
      total_cost = excluded.total_cost,
      accepted_by = excluded.accepted_by,
      accepted_at = excluded.accepted_at;

    insert into public.project_expenses(
      project_id, category, description, amount, expense_date, status,
      created_by, submitted_at, reviewed_by, reviewed_at, review_notes,
      purchase_order_id
    ) values (
      order_row.project_id, 'Materials', order_row.item_name, total_cost,
      now_value::date, 'approved', p_actor, now_value, p_actor, now_value,
      'Automatically recorded from received purchase order.', order_row.id
    )
    on conflict (purchase_order_id) where purchase_order_id is not null
    do update set
      amount = excluded.amount,
      expense_date = excluded.expense_date,
      status = 'approved',
      reviewed_by = excluded.reviewed_by,
      reviewed_at = excluded.reviewed_at;

    if budget_item_id is not null then
      update public.budget_items
      set actual_spent = total_cost, status = 'completed', updated_by = p_actor
      where id = budget_item_id;
    end if;

    if request_row.id is not null then
      update public.material_requests set status = 'received'
      where id = request_row.id;
    end if;
  elsif budget_item_id is not null and p_status = 'ordered' then
    update public.budget_items
    set status = 'ongoing', updated_by = p_actor
    where id = budget_item_id and status <> 'completed';
  end if;

  return p_order_id;
end
$$;

create or replace function public.activate_project_after_estimate(
  p_project_id uuid,
  p_actor uuid,
  p_engineer uuid
) returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  project_row public.projects;
  activated_project public.projects;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor and role::text = 'ceo' and is_active
  ) then
    raise exception 'Only an active CEO can activate projects';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_engineer and role::text = 'engineer' and is_active
  ) then
    raise exception 'Select an active project engineer';
  end if;

  select * into project_row
  from public.projects
  where id = p_project_id
  for update;

  if project_row.id is null then raise exception 'Project not found'; end if;
  if project_row.status <> 'planning' then
    raise exception 'Only projects pending cost estimation can be activated';
  end if;
  if project_row.active_approved_estimate_id is null then
    raise exception 'Approve the project cost estimate before activation';
  end if;
  if not exists (
    select 1 from public.project_estimates estimate
    where estimate.id = project_row.active_approved_estimate_id
      and estimate.project_id = project_row.id
      and estimate.status = 'approved'
  ) then
    raise exception 'The approved estimate baseline is invalid';
  end if;

  update public.projects
  set
    status = 'active',
    assigned_engineer_id = p_engineer,
    updated_by = p_actor
  where id = project_row.id
  returning * into activated_project;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, payload)
  values (
    p_actor,
    'project_activated_after_estimate',
    'project',
    project_row.id::text,
    jsonb_build_object(
      'approved_estimate_id', project_row.active_approved_estimate_id,
      'assigned_engineer_id', p_engineer,
      'previous_status', project_row.status,
      'new_status', 'active'
    )
  );

  insert into public.workflow_notifications(
    recipient_id, project_id, kind, title, message, entity_type, entity_id
  ) values (
    p_engineer,
    project_row.id,
    'project_activated',
    'Project activated',
    project_row.name || ' is active. The approved estimate is now the project baseline.',
    'project',
    project_row.id
  );

  return activated_project;
end
$$;

revoke all on function public.activate_project_after_estimate(uuid,uuid,uuid) from public;
grant execute on function public.activate_project_after_estimate(uuid,uuid,uuid) to service_role;

commit;
