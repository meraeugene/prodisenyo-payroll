begin;

alter type public.app_role add value if not exists 'purchaser';

alter table public.purchase_orders
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'scheduled', 'in_transit', 'delivered')),
  add column if not exists receipt_invoice_reference text;

create index if not exists purchase_orders_assignee_status_idx
  on public.purchase_orders(assigned_to, status, updated_at desc);

create or replace function public.is_purchaser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'purchaser'
      and is_active
  );
$$;

drop policy if exists "material requests readable by purchaser" on public.material_requests;
create policy "material requests readable by purchaser"
  on public.material_requests for select
  using (public.is_purchaser());

drop policy if exists "purchase orders readable by purchaser" on public.purchase_orders;
create policy "purchase orders readable by purchaser"
  on public.purchase_orders for select
  using (public.is_purchaser());

drop policy if exists "purchase orders updated by purchaser" on public.purchase_orders;
create policy "purchase orders updated by purchaser"
  on public.purchase_orders for update
  using (public.is_purchaser() and (assigned_to is null or assigned_to = auth.uid()))
  with check (public.is_purchaser() and (assigned_to is null or assigned_to = auth.uid()));

commit;
