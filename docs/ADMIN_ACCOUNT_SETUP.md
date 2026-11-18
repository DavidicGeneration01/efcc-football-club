# EFCC administrator account setup

Administrator accounts use Supabase Auth for identity and `public.user_roles`
for authorization. The account's Auth UUID, not its email or profile, is the
role key. The application has no administrator sign-up flow; users cannot
insert, change, or delete role rows through the Supabase client.

## Provision the first Super Admin

1. In the EFCC-controlled Supabase project, locate the intended account under
   **Authentication → Users**. If it does not exist, invite it; if it is
   already present but unconfirmed, complete or resend that account's
   invitation instead of creating a duplicate. Use an official, controlled
   email address. Do not set or share a default password.
2. Apply the repository migrations in order, including
   `supabase/migrations/0003_admin_role_provisioning.sql`, if not already
   applied. Verify the migration history first; do not blindly replay a
   migration on a live project.
3. Confirm the user's email is verified in Supabase Auth. The SQL below fails
   unless it finds exactly one confirmed Auth user for the exact email.
4. Open the project's **SQL Editor** as a trusted project owner. Replace the
   placeholder with that email and run the complete block. Do not run it before
   confirming the account. It refuses to run if another Super Admin exists or
   the target already has a role. It creates a minimal profile only if needed
   and assigns the role to the UUID fetched from `auth.users`.
5. Have the administrator set their own password using Supabase's invitation
   flow and sign in at `/admin/login`. Verify `/admin` loads for that user.

```sql
begin;

do $$
declare
  target_email constant text := lower(trim('REPLACE_WITH_CONFIRMED_ADMIN_EMAIL'));
  target_user_id uuid;
  matching_users integer;
begin
  if target_email = ''
     or target_email = 'replace_with_confirmed_admin_email'
     or position('@' in target_email) = 0 then
    raise exception 'Replace the placeholder with the administrator email';
  end if;

  select count(*)
    into matching_users
    from auth.users
   where lower(email) = target_email;

  if matching_users <> 1 then
    raise exception 'Expected exactly one Auth user for %, found %',
      target_email, matching_users;
  end if;

  select id
    into target_user_id
    from auth.users
   where lower(email) = target_email
     and email_confirmed_at is not null;

  if target_user_id is null then
    raise exception 'The Auth user for % must confirm their email first', target_email;
  end if;

  if exists (select 1 from public.user_roles where role = 'super_admin') then
    raise exception 'A Super Admin already exists; use the trusted role-change process';
  end if;

  if exists (select 1 from public.user_roles where user_id = target_user_id) then
    raise exception 'The target Auth user already has a role; review it before changing access';
  end if;

  insert into public.profiles (id)
  values (target_user_id)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'super_admin');
end;
$$;

commit;
```

If any check fails, the transaction must not be committed. Fix the underlying
account or role state and review the target Auth UUID before retrying.

## Replace an incorrect or inaccessible initial email

This procedure is for a trusted project owner correcting the email on the
intended first administrator. It does not delete the old Auth user or any
application records. Keep query results private; never share passwords, session
tokens, or service-role credentials.

1. In the project's SQL Editor, run these read-only checks using the exact old
   and new email addresses. Confirm the old Auth UUID and whether its email is
   unconfirmed. The new email must resolve to no more than one account.

   ```sql
   select id, email, email_confirmed_at, created_at, last_sign_in_at
   from auth.users
   where lower(email) in (
     lower(trim('OLD_INACCESSIBLE_EMAIL')),
     lower(trim('NEW_CONTROLLED_EMAIL'))
   )
   order by created_at;

   select u.id, u.email, r.role, r.created_at as role_created_at
   from auth.users u
   left join public.user_roles r on r.user_id = u.id
   where lower(u.email) in (
     lower(trim('OLD_INACCESSIBLE_EMAIL')),
     lower(trim('NEW_CONTROLLED_EMAIL'))
   )
   order by u.created_at;

   select p.id, p.display_name, p.created_at
   from public.profiles p
   where p.id in (
     select id from auth.users
     where lower(email) in (
       lower(trim('OLD_INACCESSIBLE_EMAIL')),
       lower(trim('NEW_CONTROLLED_EMAIL'))
     )
   );

   select id, title, status, author_id
   from public.news
   where author_id in (
     select id from auth.users
     where lower(email) in (
       lower(trim('OLD_INACCESSIBLE_EMAIL')),
       lower(trim('NEW_CONTROLLED_EMAIL'))
     )
   )
   order by created_at;
   ```

   The current migrations reference `auth.users` from `profiles.id`,
   `user_roles.user_id`, and `news.author_id`. To check the live schema for
   other public-table foreign keys before considering any future account
   deletion, run:

   ```sql
   select ns.nspname as schema_name, tbl.relname as table_name, col.attname as column_name
   from pg_constraint c
   join pg_class tbl on tbl.oid = c.conrelid
   join pg_namespace ns on ns.oid = tbl.relnamespace
   join lateral unnest(c.conkey) with ordinality as fk(attnum, ord) on true
   join pg_attribute col on col.attrelid = tbl.oid and col.attnum = fk.attnum
   where c.contype = 'f'
     and c.confrelid = 'auth.users'::regclass
     and ns.nspname = 'public'
   order by ns.nspname, tbl.relname, col.attname;
   ```

   Do not delete the old Auth user: its profile and authored content may still
   be meaningful, and deleting it cascades its profile and role while setting
   authored news attribution to null.
2. In **Authentication → Users**, invite the new, controlled email (or verify
   that the intended existing account belongs to you). Open the invitation in
   that mailbox and complete Supabase's confirmation/password flow. Do not
   manually set `email_confirmed_at`, use a SQL update to confirm an email, or
   share/set a default password. Re-run the Auth lookup and verify exactly one
   account matches the new email and `email_confirmed_at` is not null.
3. If the old user has **no `user_roles` row** and there is no existing
   Super Admin, run the first-Super-Admin SQL above with the new confirmed
   email. It creates the new profile if needed. Recheck that the old UUID has
   no role row.
4. If the old user has a role row, do not run the first-admin block: it will
   correctly stop if a Super Admin already exists. After verifying the old
   UUID is the intended unconfirmed account, the new account is confirmed, and
   no other Super Admin exists, a trusted project owner may use this guarded
   role transfer instead. It preserves profiles and content, removes the old
   user's role, and gives the new UUID `super_admin` in one transaction.
   Replace both placeholders and review the diagnostic results before running:

   ```sql
   begin;

   do $$
   declare
     old_email constant text := lower(trim('OLD_INACCESSIBLE_EMAIL'));
     new_email constant text := lower(trim('NEW_CONTROLLED_EMAIL'));
     old_user_id uuid;
     new_user_id uuid;
     old_confirmed_at timestamptz;
     new_confirmed_at timestamptz;
     old_matches integer;
     new_matches integer;
   begin
     if old_email = '' or new_email = ''
        or old_email = 'old_inaccessible_email'
        or new_email = 'new_controlled_email'
        or old_email = new_email then
       raise exception 'Replace both email placeholders with distinct exact addresses';
     end if;

     select count(*) into old_matches
     from auth.users where lower(email) = old_email;
     select count(*) into new_matches
     from auth.users where lower(email) = new_email;

     if old_matches <> 1 or new_matches <> 1 then
       raise exception 'Expected one Auth user for each address; found old %, new %',
         old_matches, new_matches;
     end if;

     select id, email_confirmed_at into old_user_id, old_confirmed_at
     from auth.users where lower(email) = old_email;
     select id, email_confirmed_at into new_user_id, new_confirmed_at
     from auth.users where lower(email) = new_email;

     if old_user_id = new_user_id then
       raise exception 'Old and new addresses resolve to the same Auth user';
     end if;
     if old_confirmed_at is not null then
       raise exception 'Old Auth user is confirmed; stop and review the account state';
     end if;
     if new_confirmed_at is null then
       raise exception 'New Auth user must complete email confirmation first';
     end if;
     if not exists (
       select 1 from public.user_roles where user_id = old_user_id
     ) then
       raise exception 'Old user has no role; use the first-admin bootstrap block instead';
     end if;
     if exists (
       select 1 from public.user_roles where user_id = new_user_id
     ) then
       raise exception 'New user already has a role; stop and review it';
     end if;
     if exists (
       select 1 from public.user_roles
       where role = 'super_admin' and user_id <> old_user_id
     ) then
       raise exception 'Another Super Admin exists; stop and use the trusted role-change process';
     end if;

     insert into public.profiles (id)
     values (new_user_id)
     on conflict (id) do nothing;

     delete from public.user_roles where user_id = old_user_id;
     insert into public.user_roles (user_id, role)
     values (new_user_id, 'super_admin');
   end;
   $$;

   commit;
   ```

   If any statement raises an exception, roll back the transaction and review
   the state; do not retry by weakening the checks. If another Super Admin
   exists, the old address is confirmed, or either email resolves ambiguously,
   stop and have the club's project owner review the account state.
5. Verify the final state with the read-only Auth/role query above: the new UUID
   must be confirmed and have exactly one `super_admin` role; the old UUID must
   have no `user_roles` row. Keep the old Auth account and its records unless a
   separate dependency review explicitly approves a later deletion. Removing
   the role prevents the old account from passing the application's role guard
   and staff RLS checks; it does not delete the account or its content.

## Add another authorised staff member

There is deliberately no public or in-app role assignment. A trusted project
owner should first invite the person through Supabase Auth and wait for email
confirmation. Then, in SQL Editor, resolve the exact email to one confirmed
Auth user and insert one approved role using that user's UUID:

```sql
select id, email, email_confirmed_at
from auth.users
where lower(email) = lower('EXACT_CONFIRMED_STAFF_EMAIL');

-- After verifying the returned UUID and confirming that it has no role:
insert into public.profiles (id)
values ('VERIFIED_AUTH_USER_UUID')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
values ('VERIFIED_AUTH_USER_UUID', 'admin');
```

Choose only a necessary role from `admin`, `editor`, `media_manager`, or
`shop_manager` for additional staff; reserve `super_admin` for the club's
designated owner(s). The role constraint rejects any other value and each Auth
user can have only one role. Do not let the user execute these statements or
share SQL Editor access with them. Review the resolved UUID before insertion.
For role changes/removal, use the trusted SQL Editor, verify the affected
UUID, and make the narrowest necessary update/delete.

## Access checks and operational notes

- The login action authenticates with `supabase.auth.signInWithPassword`, then
  checks the signed-in user's `user_roles` row. It signs out if role lookup
  fails or the user has no staff role.
- The `/admin` dashboard layout independently calls Supabase `auth.getUser()`
  and checks that same user's role on the server for every request. An
  ordinary authenticated account without a staff role is redirected away.
  The media page applies its own narrower role allow-list.
- The middleware refreshes Supabase Auth cookies. It is not the authorization
  boundary; the server-side role guard is.
- There is no administrator registration page or sign-up action. In Supabase
  Auth settings, disable public sign-ups if the project does not need public
  user registration; continue creating staff with owner-controlled invitations.
- `0003_admin_role_provisioning.sql` explicitly removes direct role writes from
  `anon` and `authenticated` while retaining authenticated users' own-role
  reads required by the server guard.
- No service-role key is needed for this procedure. Never place one in
  `NEXT_PUBLIC_*`, browser code, chat, or this repository.
- Never infer that a migration or account is live from local files. Verify
  migration history and account state in the club's Supabase project.

## Verification checklist

| Test | Expected result |
|---|---|
| Visit `/admin` signed out | Redirect to `/admin/login` |
| Submit invalid credentials | Generic sign-in error; no session |
| Sign in as a confirmed ordinary Auth user without a role | Role check fails, session is signed out, and `/admin` remains inaccessible |
| Sign in as a staff account with an allowed role | `/admin` loads; per-module role checks still apply |
| Attempt a `user_roles` insert/update/delete using the public Supabase client | Denied by table privileges and RLS |
| Run first-admin SQL with unconfirmed, ambiguous, already-role-assigned, or already-provisioned target | SQL raises an exception rather than assigning a role |

After applying migration `0003`, a project owner can verify table grants with:

```sql
select
  has_table_privilege('anon', 'public.user_roles', 'select') as anon_can_select,
  has_table_privilege('authenticated', 'public.user_roles', 'select') as authenticated_can_select,
  has_table_privilege('authenticated', 'public.user_roles', 'insert') as authenticated_can_insert,
  has_table_privilege('authenticated', 'public.user_roles', 'update') as authenticated_can_update,
  has_table_privilege('authenticated', 'public.user_roles', 'delete') as authenticated_can_delete;
```

Expected: `anon_can_select` is false, authenticated select is true, and all
authenticated write privileges are false. RLS further limits authenticated
role reads to the current user's own row.
