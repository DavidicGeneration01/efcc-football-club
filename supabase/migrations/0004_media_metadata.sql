-- Move EFCC media to private object storage. Published images are delivered
-- through /api/media/{id}; draft objects remain unavailable to public visitors.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'efcc-media') then
    raise exception 'The efcc-media bucket is missing; apply and verify migration 0002 first';
  end if;

  if exists (
    select 1 from public.media_items
    where asset_url like '%/storage/v1/object/sign/efcc-media/%'
  ) then
    raise exception 'Signed efcc-media URLs exist in media_items.asset_url; review them before making the bucket private';
  end if;

  if exists (
    select 1 from public.media_items
    where thumbnail_url like '%/storage/v1/object/public/efcc-media/%'
       or thumbnail_url like '%/storage/v1/object/sign/efcc-media/%'
  ) or exists (
    select 1 from public.news
    where featured_image like '%/storage/v1/object/public/efcc-media/%'
       or featured_image like '%/storage/v1/object/sign/efcc-media/%'
       or excerpt like '%/storage/v1/object/public/efcc-media/%'
       or excerpt like '%/storage/v1/object/sign/efcc-media/%'
       or body like '%/storage/v1/object/public/efcc-media/%'
       or body like '%/storage/v1/object/sign/efcc-media/%'
  ) or exists (
    select 1 from public.players
    where photo_url like '%/storage/v1/object/public/efcc-media/%'
       or photo_url like '%/storage/v1/object/sign/efcc-media/%'
       or biography like '%/storage/v1/object/public/efcc-media/%'
       or biography like '%/storage/v1/object/sign/efcc-media/%'
  ) or exists (
    select 1 from public.transfers
    where image_url like '%/storage/v1/object/public/efcc-media/%'
       or image_url like '%/storage/v1/object/sign/efcc-media/%'
       or description like '%/storage/v1/object/public/efcc-media/%'
       or description like '%/storage/v1/object/sign/efcc-media/%'
  ) or exists (
    select 1 from public.trophies
    where image_url like '%/storage/v1/object/public/efcc-media/%'
       or image_url like '%/storage/v1/object/sign/efcc-media/%'
       or description like '%/storage/v1/object/public/efcc-media/%'
       or description like '%/storage/v1/object/sign/efcc-media/%'
  ) or exists (
    select 1 from public.products
    where array_to_string(image_urls, ',') like '%/storage/v1/object/public/efcc-media/%'
       or array_to_string(image_urls, ',') like '%/storage/v1/object/sign/efcc-media/%'
       or description like '%/storage/v1/object/public/efcc-media/%'
       or description like '%/storage/v1/object/sign/efcc-media/%'
  ) or exists (
    select 1 from public.matches
    where match_report like '%/storage/v1/object/public/efcc-media/%'
       or match_report like '%/storage/v1/object/sign/efcc-media/%'
  ) or exists (
    select 1 from public.site_settings
    where value::text like '%/storage/v1/object/public/efcc-media/%'
       or value::text like '%/storage/v1/object/sign/efcc-media/%'
  ) then
    raise exception 'EFCC media URLs exist outside media_items.asset_url; migrate those references before making the bucket private';
  end if;
end;
$$;

-- Store each image's object path and authenticated uploader.
alter table public.media_items
  add column storage_path text,
  add column uploaded_by uuid references auth.users(id) on delete set null;

-- Backfill existing public bucket URLs without deleting their rows or objects.
update public.media_items
set storage_path = split_part(
  regexp_replace(asset_url, '^https?://[^/]+/storage/v1/object/public/efcc-media/', ''),
  '?',
  1
)
where storage_path is null
  and asset_url ~ '^https?://[^/]+/storage/v1/object/public/efcc-media/';

do $$
begin
  if exists (
    select 1
    from public.media_items m
    where m.storage_path is not null
      and not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'efcc-media' and o.name = m.storage_path
      )
  ) then
    raise exception 'A media_items storage path has no matching efcc-media object; review existing media before applying this migration';
  end if;
end;
$$;

update public.media_items
set asset_url = '/api/media/' || id::text
where storage_path is not null;

create unique index media_items_storage_path_uidx
  on public.media_items (storage_path)
  where storage_path is not null;

-- Keep the existing staff allow-list and require new/updated rows to identify
-- the authenticated staff member making the write.
drop policy if exists "Staff manage media" on public.media_items;
create policy "Staff manage media" on public.media_items
for all to authenticated
using (public.has_staff_role(array['super_admin','admin','media_manager']))
with check (
  public.has_staff_role(array['super_admin','admin','media_manager'])
  and uploaded_by = auth.uid()
);

drop policy if exists "Public can read EFCC media" on storage.objects;
drop policy if exists "Public can read published EFCC media objects" on storage.objects;
create policy "Public can read published EFCC media objects"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'efcc-media'
  and exists (
    select 1 from public.media_items m
    where m.storage_path = storage.objects.name
      and m.published = true
  )
);

drop policy if exists "Staff can read EFCC media objects" on storage.objects;
create policy "Staff can read EFCC media objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin','admin','media_manager'])
);

update storage.buckets
set public = false
where id = 'efcc-media';
