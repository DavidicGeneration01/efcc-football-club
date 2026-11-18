# EFCC Football Club Project Architecture

## Current state

This is a Next.js 15 App Router and TypeScript foundation, not a finished content
platform. The homepage, shared header/footer, generic section pages, Supabase
helpers, and one initial SQL migration exist.

### Current source layout

```text
app/
  layout.tsx                 Root layout, metadata, Manrope font
  globals.css                Tailwind v4 import and site-wide styles
  page.tsx                   Static homepage shell and placeholder content
  [section]/page.tsx         Static placeholder pages from a fixed allow-list
components/
  section-heading.tsx        Shared section heading
  site-header.tsx            Shared desktop/mobile navigation
  site-footer.tsx            Shared footer
lib/
  supabase/client.ts         Browser client using @supabase/ssr
  supabase/server.ts         Server client using cookies and @supabase/ssr
supabase/
  migrations/0001_initial.sql Initial application schema, roles, and RLS
```

`app/[section]/page.tsx` is a parameterized route with an allow-list and
`generateStaticParams`; it is not a set of independently implemented feature
pages. Supabase clients are not yet used by routes to read or mutate content.
There is no `public/`, `docs/`, test suite, API route, server action, middleware,
or admin route in the inspected source tree.

## Design and rendering

- Manrope is loaded with `next/font/google` from `app/layout.tsx` and exposed as
  a CSS variable.
- `app/globals.css` contains EFCC red/black/white tokens, responsive styles,
  typography, cards, and navigation styles. Tailwind CSS v4 is also imported.
- The home and section pages use server components. The mobile menu uses native
  `<details>` rather than a client-side component.
- The pages use static placeholder content and no live Supabase data.
- Metadata exists in the root layout, but `metadataBase` still points at an
  example domain. Per-route metadata, canonical URLs, sitemap, and robots
  configuration are not implemented.

Design inspiration should be limited to general information architecture and
editorial patterns. Keep Manrope, EFCC colors, original copy, and club-supplied
or replaceable imagery; do not copy proprietary typefaces, code, marks, or
photography.

## Data flow target

1. Public Server Components call typed, server-only query helpers.
2. The helper creates a cookie-aware Supabase server client from
   `lib/supabase/server.ts`.
3. Supabase RLS provides the final row-level boundary for public reads and staff
   writes. Queries still filter by publication status for clarity and indexing.
4. Admin mutations are validated on the server, require an authenticated user
   and a server-verified staff role, and are constrained by RLS.
5. Media bytes live in Supabase Storage or a video provider; database rows hold
   metadata and references, not file bytes.
6. Revalidation follows successful mutations. Public pages use explicit
   loading, empty, and error states when data access is introduced.

The browser Supabase helper uses only `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Never add a service-role or secret key
to browser code or a `NEXT_PUBLIC_` variable. The current `.env.local` file was
not present in the inspected workspace; `.gitignore` contains an entry for it.

## Recommended target layout

Adopt this organization as features are implemented. Move existing files
incrementally, preserving imports and behavior; do not create empty folders or
rewrite working pages solely to match a diagram.

```text
app/
  admin/                     Protected sign-in, dashboard, and management routes
  club/
  team/                      Squad and [slug] player profile routes
  matches/
  news/                      Listing and [slug] article routes
  transfers/
  media/                     Galleries, video, and live-stream metadata
  honours/
  shop/                      Catalogue, product, cart, checkout
  contact/
components/
  layout/                    Header, footer, page shell
  navigation/                Desktop and accessible mobile navigation
  homepage/
  news/
  matches/
  players/
  media/
  admin/
lib/
  supabase/                  Browser/server clients and typed database schema
  auth/                      Server-side authorization helpers
  validations/               Shared schemas for untrusted input
  utils/
docs/
  PROJECT_ARCHITECTURE.md
  IMPLEMENTATION_AUDIT.md
  DATABASE_PLAN.md
  DEVELOPMENT_ROADMAP.md
  ENVIRONMENT_SETUP.md
  PROGRESS.md
supabase/
  migrations/
public/                      Club-approved static assets only
```

## Routes and reusable components

Current routes are `/`, plus the allow-listed `/club`, `/team`, `/matches`,
`/news`, `/transfers`, `/media`, `/gallery`, `/honours`, `/shop`, and `/contact`
paths rendered by the generic section page. The header does not link to every
allow-listed route. There is no `/admin`, FAQ, privacy, terms, player detail, or
article detail route.

The target should give substantial pages their own App Router entry points.
Shared layout, navigation, editorial cards, match modules, player cards, and
admin forms should be reusable components. Keep Server Components as the
default; add client components only for interactions requiring browser state.

## External services and boundaries

- Supabase PostgreSQL/Auth/Storage: project is configured in source, but
  runtime connectivity, remote schema state, authentication, and buckets have
  not been verified.
- Paystack or Flutterwave: not integrated. Select a provider only after a
  server-created order, amount verification, idempotent webhook, and payment
  reconciliation design exists.
- YouTube Live, Mux, or Cloudflare Stream: possible video delivery options, not
  configured.
- Deployment/monitoring: no deployment configuration or production validation
  was found in the inspected project files.
