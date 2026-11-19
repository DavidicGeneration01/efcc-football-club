-- Keep public media delivery limited to published media records and restrict
-- staff changes to objects and records owned by the authenticated uploader.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'efcc-media') then
    raise exception 'The efcc-media bucket is missing; apply and verify the earlier media migrations first';
  end if;
end;
$$;

update storage.buckets
set public = false
where id = 'efcc-media';

drop policy if exists "Public can read published media" on public.media_items;
create policy "Public can read published media"
on public.media_items
for select
to anon, authenticated
using (published = true);

drop policy if exists "Staff manage media" on public.media_items;
drop policy if exists "Staff can read all media" on public.media_items;
create policy "Staff can read all media"
on public.media_items
for select
to authenticated
using (public.has_staff_role(array['super_admin', 'admin', 'media_manager']));

drop policy if exists "Staff can insert own media" on public.media_items;
create policy "Staff can insert own media"
on public.media_items
for insert
to authenticated
with check (
  public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and uploaded_by = auth.uid()
);

drop policy if exists "Staff can update own media" on public.media_items;
create policy "Staff can update own media"
on public.media_items
for update
to authenticated
using (
  public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and uploaded_by = auth.uid()
)
with check (
  public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
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
    select 1
    from public.media_items m
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
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
);

drop policy if exists "Staff can upload EFCC media" on storage.objects;
create policy "Staff can upload EFCC media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and split_part(name, '/', 1) <> ''
  and split_part(name, '/', 2) = auth.uid()::text
  and split_part(name, '/', 3) <> ''
  and split_part(name, '/', 4) = ''
);

drop policy if exists "Staff can update EFCC media" on storage.objects;
create policy "Staff can update EFCC media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and split_part(name, '/', 2) = auth.uid()::text
)
with check (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and split_part(name, '/', 1) <> ''
  and split_part(name, '/', 2) = auth.uid()::text
  and split_part(name, '/', 3) <> ''
  and split_part(name, '/', 4) = ''
);

drop policy if exists "Staff can delete EFCC media" on storage.objects;
create policy "Staff can delete EFCC media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'media_manager'])
  and split_part(name, '/', 2) = auth.uid()::text
);

-- Only expose variant identity/options to the public API roles. RLS controls
-- which active-product rows are visible; column grants keep exact stock private.
revoke select on table public.product_variants from public, anon, authenticated;
revoke select (id, product_id, size, colour, stock_quantity)
  on table public.product_variants from public, anon, authenticated;
grant select (id, product_id, size, colour)
  on table public.product_variants to anon, authenticated;
