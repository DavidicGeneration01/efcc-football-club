-- Public delivery is intentional for approved club images. Uploads and changes
-- remain restricted to authenticated staff with an authorized media role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'efcc-media',
  'efcc-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Public can read EFCC media"
on storage.objects
for select
to public
using (bucket_id = 'efcc-media');

create policy "Staff can upload EFCC media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor', 'media_manager'])
);

create policy "Staff can update EFCC media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor', 'media_manager'])
)
with check (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor', 'media_manager'])
);

create policy "Staff can delete EFCC media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor', 'media_manager'])
);
