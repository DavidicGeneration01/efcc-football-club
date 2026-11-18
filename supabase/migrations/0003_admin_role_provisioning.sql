-- Authenticated users may read their own role, but role assignment is a
-- trusted-operator operation performed through the Supabase SQL Editor.
revoke all privileges on table public.user_roles from public, anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.user_roles from authenticated;
grant select on table public.user_roles to authenticated;
