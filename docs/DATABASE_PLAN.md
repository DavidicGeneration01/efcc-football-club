# EFCC Football Club Database Plan

## Current local schema

The base schema in `supabase/migrations/0001_initial.sql` defines these 14
application tables:

| Table | Purpose and notable relationships |
|---|---|
| `profiles` | One row per `auth.users` account; user-owned profile. |
| `user_roles` | One role per auth user; controlled role allow-list. |
| `news_categories` | Unique category name and slug. |
| `news` | Article fields, category (`SET NULL`), auth author (`SET NULL`), content status and publication time. |
| `players` | Base squad identity; 0006 adds publication/archive state and the central Media Library association. |
| `matches` | Opponent, kickoff, venue, score/status, report, and publication flag. |
| `transfers` | Player name, transfer type, status, announcement details. |
| `media_items` | Image/video/live metadata; later migrations add storage ownership and usage scope. |
| `trophies` | Achievement metadata and publication flag. |
| `products` | Product fields, NGN price, image URL array, active flag. |
| `product_variants` | Product variants, size/colour and stock; product delete cascades. |
| `orders` | Customer/delivery details, total/status/payment reference. |
| `order_items` | Order snapshot, optional product reference, quantity and unit price. |
| `site_settings` | JSON settings keyed by text. |

The schema also creates the `content_status` enum, four indexes, and
`public.has_staff_role(text[])`. There is no `payments` table, Storage bucket
migration, or trigger to maintain `updated_at`.

## Roles and authorization

`user_roles.role` accepts `super_admin`, `admin`, `editor`, `media_manager`, or
`shop_manager`. `has_staff_role()` is `STABLE SECURITY DEFINER`, sets an empty
`search_path`, checks the current `auth.uid()` against `user_roles`, and can be
executed by `authenticated` (not `PUBLIC` or `anon`).

Role rows cannot be inserted, updated, or deleted through the policies in this
migration. Initial role provisioning therefore needs a trusted operator/process;
do not expose a self-service role assignment. The helper does not implement a
role hierarchy by itself: each policy explicitly lists roles.

## RLS policy summary

RLS is enabled on every application table:

- Public reads: published news whose `published_at <= now()`, categories,
  published non-archived current/former players, published matches, published transfers, published media, published
  trophies, active products, variants of active products, and only the
  `club_name`, `club_location`, and `social_links` settings.
- Staff writes: news/categories/players/matches/transfers/trophies for
  super-admin/admin/editor; media for super-admin/admin/media-manager;
  products/variants/orders/order-items for super-admin/admin/shop-manager;
  settings for super-admin/admin.
- Player records are archived/restored rather than permanently deleted by the
  application; editors can manage player details and publication state.
- Profiles: authenticated users can select/update their own profile.
- Roles: authenticated users can select their own role; no client role writes.
- Orders and order items have no public/customer policy. The migration comment
  reserves checkout for a future server-side flow.

RLS determines row visibility, not which columns a SELECT query returns.
Currently the public variants policy can reveal `stock_quantity`; consider a
limited public view or other design if exact stock should remain private.
Authenticated users can update their own profile fields, including
`updated_at`, because column-level restrictions or a trigger are not present.

Policies do not independently establish SQL grants. Confirm Supabase API-role
table privileges in the target project, and test both grants and RLS using
`anon`, `authenticated`, and each staff role. Do not solve access failures by
loosening RLS.

## Indexes and integrity gaps

Existing indexes cover published news (`published_at`), match kickoff,
published media creation time, and active products creation time.

Review/add indexes in a later migration based on actual query plans:

- Foreign-key columns used for joins/deletes: news category and author,
  product variant product, order item order and product.
- Common public filters/sorts for player active/name, transfer status/date,
  trophy publication/year, category slug, and product slug.
- If adding gallery tables, index gallery membership/order and publication
  filter.

Other schema decisions to resolve before the corresponding feature:

- `product_variants UNIQUE(product_id, size, colour)` allows duplicate rows
  when a nullable size or colour is NULL under standard PostgreSQL uniqueness.
- Decide whether product image arrays are sufficient or normalized product
  media rows are needed.
- Define monetary unit semantics. `price_ngn`/order totals are integer NGN
  amounts; payment APIs commonly require minor units, so conversion must be
  explicit and tested.
- Ensure order totals and item prices are calculated from server-trusted
  products, never accepted as client authority.
- Add `updated_at` maintenance triggers or set timestamps explicitly in every
  trusted mutation.
- Add appropriate non-negative checks for match scores, valid year/date
  bounds, and publication consistency where required.
- Decide whether deleted products/orders should be retained for audit rather
  than cascade deletion.

## First Team player CMS

The current application uses the existing `players` schema: `full_name`,
`shirt_number`, `position`, `nationality`, `biography`, `photo_url`,
`photo_media_id`, `is_active`, roster/publication status, and archive fields.
Player photographs continue to use the central Media Library and the existing
private `efcc-media` Storage bucket. No additional player columns or child
tables are required for these workflows.

The application does not split `full_name` into assumed first/last names,
does not create another image store, and does not permanently delete player
records. Staff archive/restore actions preserve existing IDs, slugs, and media
relationships. Public application queries filter by publication status,
archive state, roster classification, and the corresponding `is_active` value.

## Master brief entities not represented yet

Candidates to model only after requirements are confirmed (avoid duplicate or
premature tables):

- `news_tags` and a news/tag join table.
- `competitions`, `match_events`, and player/match statistics.
- Player-to-match/competition statistics as justified by real data needs.
- `galleries` and `gallery_images`; video and live-stream metadata may need
  distinct fields/entities.
- `trophy_categories`.
- `product_categories` and normalized product media.
- A customer model (only if guest orders are insufficient), inventory events,
  and payments/webhook event records.
- Sponsors, newsletter subscribers, managed website pages, navigation items,
  and club-contact/FAQ/legal content.

Use foreign keys and publication state for content relationships. Do not store
image/video bytes in PostgreSQL.

## Safe migration plan

The initial migration is a local file, not confirmation of remote state. It is
written for a fresh Supabase project with Supabase-managed `auth` schema and
roles. It uses `CREATE TYPE` and `CREATE TABLE` without `IF NOT EXISTS`; apply it
once using a migration history, not by blindly replaying it on an existing
database. `pgcrypto` is created only if absent.

Before any live application:

1. Check remote migration history and schema through Supabase tooling/dashboard;
   never infer that remote state equals the file.
2. Run a fresh local/disposable Supabase reset and capture SQL errors.
3. Test RLS as anonymous, ordinary authenticated, and each role; test denied
   insert/update/delete as well as allowed reads and staff operations.
4. Add schema changes as new forward migrations; do not rewrite an applied
   migration or drop existing data.
5. Add schema snapshots/types and policy tests to the repository.

Suggested incremental migration sequence:

1. Resolve initial-schema validation, query indexes, timestamp maintenance,
   profile column restrictions, and public stock visibility.
2. Add editorial tags and any confirmed competition/match-event relationships.
3. Add gallery and media metadata relationships; create Storage buckets and
   policies separately with least privilege.
4. Add payment/order audit records only with server-side order creation and
   verified idempotent webhooks designed.
5. Add sponsors, managed pages/navigation, newsletter, and other confirmed
   content models.

No SQL was executed during this audit.
