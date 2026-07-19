-- Add a separate Admin app role for user/account administration.
-- Run this in the Supabase SQL editor.

alter type public.app_role add value if not exists 'admin';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'admin'
  )
$$;

drop policy if exists "profiles select own or ceo" on public.profiles;
drop policy if exists "profiles update own or ceo" on public.profiles;
drop policy if exists "profiles select own or ceo admin" on public.profiles;
drop policy if exists "profiles update own or ceo admin" on public.profiles;

create policy "profiles select own or ceo admin"
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_ceo()
  or public.is_admin()
);

create policy "profiles update own or ceo admin"
on public.profiles
for update
using (
  auth.uid() = id
  or public.is_ceo()
  or public.is_admin()
)
with check (
  auth.uid() = id
  or public.is_ceo()
  or public.is_admin()
);

-- Option A: promote an existing user profile to Admin.
-- Replace the email with the account you want to use for admin.
-- If your SQL editor wraps the whole script in one transaction, run the
-- alter type statement above first, then run this update after it succeeds.
update public.profiles
set
  role = 'admin'::public.app_role,
  updated_at = now()
where email = 'admin@example.com';

-- Option B: create the auth user from Supabase Authentication UI first,
-- then insert/update the matching profile here using that auth.users id.
-- Replace all placeholder values before running.
/*
insert into public.profiles (
  id,
  username,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'admin',
  'admin@example.com',
  'Administrator',
  'admin'::public.app_role,
  true,
  now(),
  now()
)
on conflict (id) do update
set
  username = excluded.username,
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();
*/
