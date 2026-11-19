# EFCC News and Module Media Migration Plan

This document contains proposed SQL only. It has not been executed and no migration
file or live database object has been changed.

## Why a migration is required

The application now stores structured news content in `public.news.body` using an
EFCC-specific JSON envelope for backward-compatible block rendering. This is a
temporary application representation, not the final relational model.

An editor currently cannot upload and insert module media under the existing
RLS grants unless the live database matches a migration that grants that ability.
The existing media rules intentionally keep Media Library publication and deletion
with media managers and administrators.

## Proposed schema

```sql
create table if not exists public.news_content_blocks (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.news(id) on delete cascade,
  media_id uuid references public.media_items(id) on delete set null,
  position integer not null check (position >= 0),
  kind text not null check (kind in ('text', 'image')),
  text text,
  caption text,
  alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (news_id, position),
  check (
    (kind = 'text' and text is not null and media_id is null)
    or
    (kind = 'image' and media_id is not null)
  )
);

create index if not exists news_content_blocks_news_position_idx
  on public.news_content_blocks (news_id, position);

alter table public.news_content_blocks enable row level security;
```

For existing articles, backfill one text block for `news.body` unless it is already
in the EFCC JSON envelope. Block data should be mapped in a reviewed, reversible
backfill that preserves legacy `featured_image` values. Do not clear
`news.featured_image` during backfill.

## Content block RLS

```sql
drop policy if exists "Public can read published news content" on public.news_content_blocks;
create policy "Public can read published news content"
on public.news_content_blocks
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.news n
    where n.id = news_id
      and n.status = 'published'
      and n.published_at is not null
      and n.published_at <= now()
  )
);

drop policy if exists "Editors manage own news content" on public.news_content_blocks;
create policy "Editors manage own news content"
on public.news_content_blocks
for all
to authenticated
using (
  public.has_staff_role(array['super_admin', 'admin', 'editor'])
)
with check (
  public.has_staff_role(array['super_admin', 'admin', 'editor'])
);
```

The final implementation should additionally verify article ownership or an
editorial administrator's scope in a policy or server action. A single broad
editor-policy is appropriate only after the exact article-ownership requirement
is confirmed.

## Media metadata grants and RLS

Editor upload support should allow only unpublished, uploader-owned draft metadata:

```sql
drop policy if exists "Editors insert draft module media" on public.media_items;
create policy "Editors insert draft module media"
on public.media_items
for insert
to authenticated
with check (
  public.has_staff_role(array['super_admin', 'admin', 'editor', 'media_manager'])
  and uploaded_by = auth.uid()
  and published = false
);
```

This policy must not grant editors update or delete access. Keep existing
Media Library publishing and deletion policies limited to media managers and
administrators, not editors. The following change should be applied only after
replacing or preserving the existing media policies and testing each role:

```sql
revoke all privileges on table public.media_items from authenticated;
grant select on table public.media_items to authenticated;
grant insert on table public.media_items to authenticated;
```

Do not apply the revoke/grant block without checking table grants and the
application's existing published-media reads. It is shown only to explain the
minimum privilege shape.

## Inline media public read and Storage

Add Storage SELECT so an article image can be delivered only while attached to a
published article:

```sql
drop policy if exists "Public can read published news content media" on storage.objects;
create policy "Public can read published news content media"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'efcc-media'
  and exists (
    select 1
    from public.media_items m
    join public.news_content_blocks b on b.media_id = m.id
    join public.news n on n.id = b.news_id
    where m.storage_path = storage.objects.name
      and n.status = 'published'
      and n.published_at is not null
      and n.published_at <= now()
  )
);
```

Before applying, verify whether a published news body JSON still needs a temporary
text lookup in addition to normalized blocks. The final route should check both
the block relation and the article publication state.

## Storage upload scope

Editors may insert files only beneath their module and user path:

```sql
drop policy if exists "Editors upload module media" on storage.objects;
create policy "Editors upload module media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'efcc-media'
  and public.has_staff_role(array['super_admin', 'admin', 'editor', 'media_manager', 'shop_manager'])
  and split_part(name, '/', 1) in ('news', 'team', 'matches', 'club', 'honours', 'store')
  and split_part(name, '/', 2) = auth.uid()::text
  and split_part(name, '/', 3) <> ''
  and split_part(name, '/', 4) = ''
);
```

This must be accompanied by module-role validation:

- News: super-admin, admin, editor.
- First Team, Match Centre, The Club, Honours: super-admin, admin, editor.
- Store: super-admin, admin, shop-manager.
- Media Library publishing/delete: super-admin, admin, media-manager.

Do not grant editors an update or delete Storage policy solely to enable article
uploads. Add explicit media-manager/admin/super-admin update and delete policies
for existing Media Library objects.

## Required application switch

After migration:

1. Persist `news_content_blocks` from the block editor.
2. Keep `news.body` as a compatibility snapshot or remove it in a separate later migration.
3. Switch `/api/news-media/{id}` to use block relations and Storage policies.
4. Backfill existing plain-text article bodies as text blocks.
5. Map existing `featured_image` values to legacy compatibility metadata; do not clear them.
6. Test direct API reads, editor insert denial, media publishing denial, module upload denial,
   public article image access, unpublishing, and media removal.
