-- Adds real BOQ organization without replacing the existing cost category.
-- Run this once in Supabase SQL Editor for existing environments.

alter table public.project_estimate_items
  add column if not exists boq_section text not null default 'General Works',
  add column if not exists boq_item_number text not null default '';

update public.project_estimate_items
set boq_section = 'General Works'
where trim(coalesce(boq_section, '')) = '';

update public.project_estimate_items
set boq_item_number = (sort_order + 1)::text
where trim(coalesce(boq_item_number, '')) = '';

create index if not exists project_estimate_items_boq_structure_idx
  on public.project_estimate_items(
    estimate_id,
    boq_section,
    boq_item_number,
    sort_order
  );

comment on column public.project_estimate_items.boq_section is
  'BOQ work section such as Structural Works; distinct from cost category.';

comment on column public.project_estimate_items.boq_item_number is
  'Engineer-defined BOQ item number shared by all cost lines in one item.';
