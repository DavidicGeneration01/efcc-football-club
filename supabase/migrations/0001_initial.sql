-- EFCC Football Club initial schema.
-- Apply through Supabase CLI migrations or the SQL Editor.
create extension if not exists pgcrypto;

create type public.content_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','admin','editor','media_manager','shop_manager')),
  created_at timestamptz not null default now()
);

create table public.news_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  body text not null default '',
  featured_image text,
  category_id uuid references public.news_categories(id) on delete set null,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  slug text not null unique,
  shirt_number integer,
  position text,
  nationality text,
  biography text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  opponent text not null,
  competition text,
  venue text,
  kickoff_at timestamptz,
  home_away text check (home_away in ('home','away')),
  efcc_score integer,
  opponent_score integer,
  status text not null default 'upcoming' check (status in ('upcoming','live','half_time','full_time','postponed','cancelled')),
  match_report text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  transfer_type text not null check (transfer_type in ('incoming','outgoing','contract','announcement')),
  from_club text,
  to_club text,
  image_url text,
  description text,
  status public.content_status not null default 'draft',
  announced_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  media_type text not null check (media_type in ('image','video','live')),
  category text,
  asset_url text,
  thumbnail_url text,
  provider text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.trophies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  competition text,
  achievement_year integer,
  description text,
  image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_ngn integer not null check (price_ngn >= 0),
  image_urls text[] not null default '{}',
  category text,
  sku text unique,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  colour text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  unique(product_id, size, colour)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  delivery_address text not null,
  total_ngn integer not null check (total_ngn >= 0),
  status text not null default 'pending' check (status in ('pending','paid','processing','shipped','completed','cancelled','refunded')),
  payment_reference text unique,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_ngn integer not null check (unit_price_ngn >= 0)
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index news_published_idx on public.news (published_at desc) where status = 'published';
create index matches_kickoff_idx on public.matches (kickoff_at asc);
create index media_published_idx on public.media_items (created_at desc) where published = true;
create index products_active_idx on public.products (created_at desc) where active = true;

-- Enable RLS on every application table.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.news_categories enable row level security;
alter table public.news enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.transfers enable row level security;
alter table public.media_items enable row level security;
alter table public.trophies enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.site_settings enable row level security;

-- Security-definer helper avoids recursive RLS lookups on user_roles.
create or replace function public.has_staff_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = any(allowed_roles)
  );
$$;

revoke all on function public.has_staff_role(text[]) from public, anon;
grant execute on function public.has_staff_role(text[]) to authenticated;

-- Public reads are restricted by each table's visibility field where available.
create policy "Public can read published news" on public.news
for select using (status = 'published' and published_at <= now());
create policy "Staff manage news" on public.news
for all to authenticated using (public.has_staff_role(array['super_admin','admin','editor'])) with check (public.has_staff_role(array['super_admin','admin','editor']));

create policy "Public can read categories" on public.news_categories
for select using (true);
create policy "Admins manage categories" on public.news_categories
for all to authenticated using (public.has_staff_role(array['super_admin','admin','editor'])) with check (public.has_staff_role(array['super_admin','admin','editor']));

create policy "Public can read active players" on public.players
for select using (is_active = true);
create policy "Staff manage players" on public.players
for all to authenticated using (public.has_staff_role(array['super_admin','admin','editor'])) with check (public.has_staff_role(array['super_admin','admin','editor']));

create policy "Staff manage matches" on public.matches
for all to authenticated using (public.has_staff_role(array['super_admin','admin','editor'])) with check (public.has_staff_role(array['super_admin','admin','editor']));

create policy "Public can read published matches" on public.matches
for select using (published = true);

create policy "Public can read published transfers" on public.transfers
for select using (status = 'published');
create policy "Staff manage transfers" on public.transfers
for all to authenticated using (public.has_staff_role(array['super_admin','admin','editor'])) with check (public.has_staff_role(array['super_admin','admin','editor']));

create policy "Public can read published media" on public.media_items
for select using (published = true);
create policy "Staff manage media" on public.media_items
for all to authenticated using (public.has_staff_role(array['super_admin','admin','media_manager'])) with check (public.has_staff_role(array['super_admin','admin','media_manager']));

create policy "Staff manage trophies" on public.trophies
for all to authenticated using (public.has_staff_role(array['super_admin','admin','editor'])) with check (public.has_staff_role(array['super_admin','admin','editor']));

create policy "Public can read published trophies" on public.trophies
for select using (published = true);

create policy "Public can read active products" on public.products
for select using (active = true);
create policy "Shop staff manage products" on public.products
for all to authenticated using (public.has_staff_role(array['super_admin','admin','shop_manager'])) with check (public.has_staff_role(array['super_admin','admin','shop_manager']));

create policy "Public can read variants for active products" on public.product_variants
for select using (exists (select 1 from public.products p where p.id = product_id and p.active = true));
create policy "Shop staff manage variants" on public.product_variants
for all to authenticated using (public.has_staff_role(array['super_admin','admin','shop_manager'])) with check (public.has_staff_role(array['super_admin','admin','shop_manager']));

-- Orders are private. Customer checkout should be implemented through a server-side
-- Edge Function/Route Handler after payment-provider verification, not public table writes.
create policy "Staff manage orders" on public.orders
for all to authenticated using (public.has_staff_role(array['super_admin','admin','shop_manager'])) with check (public.has_staff_role(array['super_admin','admin','shop_manager']));
create policy "Staff manage order items" on public.order_items
for all to authenticated using (public.has_staff_role(array['super_admin','admin','shop_manager'])) with check (public.has_staff_role(array['super_admin','admin','shop_manager']));

create policy "Public can read public site settings" on public.site_settings
for select using (key in ('club_name','club_location','social_links'));
create policy "Admins manage site settings" on public.site_settings
for all to authenticated using (public.has_staff_role(array['super_admin','admin'])) with check (public.has_staff_role(array['super_admin','admin']));

-- User profiles: each signed-in user can read/update their own basic profile.
create policy "Users read own profile" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "Users update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Users read own role" on public.user_roles
for select to authenticated using (user_id = auth.uid());
