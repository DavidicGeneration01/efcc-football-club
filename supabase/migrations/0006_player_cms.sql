-- Add an explicit roster/publication lifecycle while keeping inactive legacy
-- rows unpublished until staff can classify them.
alter table public.players
  add column roster_status text not null default 'needs_review'
    check (roster_status in ('current', 'former', 'needs_review')),
  add column publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published')),
  add column published_at timestamptz,
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id) on delete set null,
  add column photo_media_id uuid references public.media_items(id) on delete set null;

update public.players
set roster_status = 'current',
    publication_status = 'published',
    published_at = coalesce(updated_at, created_at, now())
where is_active = true;

alter table public.players
  add constraint players_publication_timestamp_check
  check (
    (publication_status = 'draft' and published_at is null)
    or (publication_status = 'published' and published_at is not null)
  );

create index players_public_squad_idx
  on public.players (roster_status, shirt_number, full_name)
  where publication_status = 'published' and archived_at is null;

create index players_admin_listing_idx
  on public.players (archived_at, publication_status, roster_status, updated_at desc);

create unique index players_photo_media_uidx
  on public.players (photo_media_id)
  where photo_media_id is not null;

alter table public.media_items
  add column usage_scope text not null default 'library'
    check (usage_scope in ('library', 'player_photo'));

drop policy if exists "Public can read active players" on public.players;
create policy "Public can read published player profiles"
on public.players
for select
to anon, authenticated
using (
  publication_status = 'published'
  and archived_at is null
  and roster_status in ('current', 'former')
);

drop policy if exists "Staff manage players" on public.players;
create policy "Staff can read players"
on public.players
for select
to authenticated
using (public.has_staff_role(array['super_admin', 'admin', 'editor']));

create policy "Staff can insert players"
on public.players
for insert
to authenticated
with check (public.has_staff_role(array['super_admin', 'admin', 'editor']));

create policy "Staff can update players"
on public.players
for update
to authenticated
using (public.has_staff_role(array['super_admin', 'admin', 'editor']))
with check (public.has_staff_role(array['super_admin', 'admin', 'editor']));

drop policy if exists "Public can read published media" on public.media_items;
create policy "Public can read published library and player media"
on public.media_items
for select
to anon, authenticated
using (
  (usage_scope = 'library' and published = true)
  or (
    usage_scope = 'player_photo'
    and exists (
      select 1
      from public.players p
      where p.photo_media_id = media_items.id
        and p.publication_status = 'published'
        and p.archived_at is null
        and p.roster_status in ('current', 'former')
    )
  )
);

create policy "Team staff can read player media"
on public.media_items
for select
to authenticated
using (
  usage_scope = 'player_photo'
  and public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.players p
      where p.photo_media_id = media_items.id
    )
  )
);

drop policy if exists "Staff can insert own media" on public.media_items;
create policy "Media staff can insert library media"
on public.media_items
for insert
to authenticated
with check (
  public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and uploaded_by = auth.uid()
  and usage_scope = 'library'
);

create policy "Team staff can insert private player photos"
on public.media_items
for insert
to authenticated
with check (
  public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and uploaded_by = auth.uid()
  and media_type = 'image'
  and category = 'First Team'
  and usage_scope = 'player_photo'
  and published = false
);

drop policy if exists "Staff can update own media" on public.media_items;
create policy "Media staff can update own library media"
on public.media_items
for update
to authenticated
using (
  public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and uploaded_by = auth.uid()
  and usage_scope = 'library'
)
with check (
  public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and uploaded_by = auth.uid()
  and usage_scope = 'library'
);

create policy "Team staff can clean up unassociated player media"
on public.media_items
for delete
to authenticated
using (
  public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and uploaded_by = auth.uid()
  and usage_scope = 'player_photo'
  and published = false
  and not exists (
    select 1 from public.players p
    where p.photo_media_id = media_items.id
  )
);

drop policy if exists "Public can read published EFCC media objects" on storage.objects;
create policy "Public can read published library and player media objects"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'efcc-media'
  and exists (
    select 1
    from public.media_items m
    where m.storage_path = storage.objects.name
      and (
        (m.usage_scope = 'library' and m.published = true)
        or (
          m.usage_scope = 'player_photo'
          and exists (
            select 1
            from public.players p
            where p.photo_media_id = m.id
              and p.publication_status = 'published'
              and p.archived_at is null
              and p.roster_status in ('current', 'former')
          )
        )
      )
  )
);

create policy "Team staff can read associated player photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and exists (
    select 1
    from public.media_items m
    join public.players p on p.photo_media_id = m.id
    where m.storage_path = storage.objects.name
      and m.usage_scope = 'player_photo'
  )
);

create policy "Team staff can upload player photo objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and split_part(name, '/', 1) = 'team'
  and split_part(name, '/', 2) = auth.uid()::text
  and split_part(name, '/', 3) ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and split_part(name, '/', 4) = ''
);

create policy "Team staff can clean up unassociated player photo objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and split_part(name, '/', 1) = 'team'
  and split_part(name, '/', 2) = auth.uid()::text
  and not exists (
    select 1
    from public.media_items m
    join public.players p on p.photo_media_id = m.id
    where m.storage_path = storage.objects.name
      and m.usage_scope = 'player_photo'
  )
);
