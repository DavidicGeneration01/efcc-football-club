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

create table public.news_media_attachments (
  news_id uuid not null references public.news(id) on delete cascade,
  media_id uuid not null references public.media_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (news_id, media_id)
);

create index news_media_attachments_media_idx
  on public.news_media_attachments (media_id);

alter table public.news_media_attachments enable row level security;
revoke all privileges on table public.news_media_attachments from public, anon, authenticated;
grant select (news_id, media_id) on table public.news_media_attachments to anon, authenticated;
grant insert (news_id, media_id) on table public.news_media_attachments to authenticated;

create policy "Public can read published news media attachments"
on public.news_media_attachments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.news n
    where n.id = news_media_attachments.news_id
      and n.status = 'published'
      and n.published_at is not null
      and n.published_at <= now()
      and position(
        '"mediaId":"' || news_media_attachments.media_id::text || '"'
        in coalesce(n.body, '')
      ) > 0
  )
);

create policy "Staff can attach own news uploads"
on public.news_media_attachments
for insert
to authenticated
with check (
  public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and exists (
    select 1
    from public.news n
    where n.id = news_media_attachments.news_id
  )
  and exists (
    select 1
    from public.media_items m
    where m.id = news_media_attachments.media_id
      and m.usage_scope = 'library'
      and m.media_type = 'image'
      and m.published = false
      and m.uploaded_by = auth.uid()
      and split_part(m.storage_path, '/', 1) = 'news'
  )
);

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
drop policy if exists "Staff can read all media" on public.media_items;
drop policy if exists "Staff manage media" on public.media_items;
create policy "Public can read published library and player media"
on public.media_items
for select
to anon, authenticated
using (
  (
    usage_scope = 'library'
    and (
      published = true
      or exists (
        select 1
        from public.news_media_attachments a
        where a.media_id = media_items.id
      )
    )
  )
  or (
    usage_scope = 'player_photo'
    and media_type = 'image'
    and published = false
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

create policy "Editors can read own unpublished library media"
on public.media_items
for select
to authenticated
using (
  usage_scope = 'library'
  and published = false
  and public.has_staff_role(array['editor'])
  and uploaded_by = auth.uid()
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

create policy "Media staff can read library media"
on public.media_items
for select
to authenticated
using (
  usage_scope = 'library'
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
);

drop policy if exists "Staff can insert own media" on public.media_items;
create policy "Media staff can insert library media"
on public.media_items
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and usage_scope = 'library'
  and (
    public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
    or (
      public.has_staff_role(array['editor'])
      and published = false
    )
  )
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

create policy "News staff can clean up own unassociated draft uploads"
on public.media_items
for delete
to authenticated
using (
  public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and uploaded_by = auth.uid()
  and media_type = 'image'
  and usage_scope = 'library'
  and published = false
  and split_part(storage_path, '/', 1) = 'news'
  and not exists (
    select 1 from public.players p
    where p.photo_media_id = media_items.id
  )
  and not exists (
    select 1
    from public.news n
    where position(media_items.id::text in coalesce(n.body, '')) > 0
       or position(('/api/news-media/' || media_items.id::text) in coalesce(n.featured_image, '')) > 0
  )
);

drop policy if exists "Public can read published EFCC media objects" on storage.objects;
drop policy if exists "Public can read EFCC media" on storage.objects;
drop policy if exists "Staff can read EFCC media objects" on storage.objects;
drop policy if exists "Staff can upload EFCC media" on storage.objects;
drop policy if exists "Staff can update EFCC media" on storage.objects;
drop policy if exists "Staff can delete EFCC media" on storage.objects;
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
        (
          m.usage_scope = 'library'
          and (
            m.published = true
            or exists (
              select 1
              from public.news_media_attachments a
              where a.media_id = m.id
            )
          )
        )
        or (
          m.usage_scope = 'player_photo'
          and m.media_type = 'image'
          and m.published = false
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

create policy "Team staff can preview own unassociated player photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor'])
  and exists (
    select 1 from public.media_items m
    where m.storage_path = storage.objects.name
      and m.usage_scope = 'player_photo'
      and m.uploaded_by = auth.uid()
      and not exists (
        select 1 from public.players p
        where p.photo_media_id = m.id
      )
  )
);

create policy "Media staff can read library media objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and exists (
    select 1 from public.media_items m
    where m.storage_path = storage.objects.name
      and m.usage_scope = 'library'
  )
);

create policy "Editors can preview own unpublished module media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['editor'])
  and exists (
    select 1 from public.media_items m
    where m.storage_path = storage.objects.name
      and m.usage_scope = 'library'
      and m.media_type = 'image'
      and m.published = false
      and (
        m.uploaded_by = auth.uid()
        and split_part(m.storage_path, '/', 1) = 'news'
      )
  )
);

create policy "Staff can upload EFCC media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'efcc-media'
  and split_part(name, '/', 2) = auth.uid()::text
  and split_part(name, '/', 3) ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and split_part(name, '/', 4) = ''
  and (
    (
      public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
      and split_part(name, '/', 1) <> 'team'
    )
    or (
      public.has_staff_role(array['super_admin', 'admin', 'editor'])
      and split_part(name, '/', 1) in ('news', 'team', 'matches', 'club', 'honours')
    )
  )
);

create policy "Media staff can update library media objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and exists (
    select 1 from public.media_items m
    where m.storage_path = storage.objects.name
      and m.usage_scope = 'library'
      and m.uploaded_by = auth.uid()
  )
)
with check (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and exists (
    select 1 from public.media_items m
    where m.storage_path = storage.objects.name
      and m.usage_scope = 'library'
      and m.uploaded_by = auth.uid()
  )
);

create policy "Staff can delete unregistered module uploads"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'efcc-media'
  and split_part(name, '/', 2) = auth.uid()::text
  and split_part(name, '/', 3) ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  and split_part(name, '/', 4) = ''
  and split_part(name, '/', 1) <> 'team'
  and (
    (
      public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
      and (
        split_part(name, '/', 1) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or split_part(name, '/', 1) in ('news', 'matches', 'club', 'honours', 'store')
      )
    )
    or (
      public.has_staff_role(array['editor'])
      and split_part(name, '/', 1) in ('news', 'matches', 'club', 'honours')
    )
  )
  and not exists (
    select 1
    from public.media_items m
    where m.storage_path = storage.objects.name
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
    where m.storage_path = storage.objects.name
      and not (
        m.usage_scope = 'player_photo'
        and m.media_type = 'image'
        and m.published = false
        and m.uploaded_by = auth.uid()
        and not exists (
          select 1 from public.players p
          where p.photo_media_id = m.id
        )
      )
  )
);
