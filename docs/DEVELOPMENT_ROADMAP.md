# EFCC Football Club Development Roadmap

Work should proceed incrementally from the existing Next.js foundation. Keep
the Manrope/EFCC design direction, existing homepage shell, and responsive
navigation. Do not use invented players, results, trophies, sponsors, or other
club claims.

## Phase 1 — Existing project audit and architecture

**Status:** Audit documentation prepared in this repository.

**Work:** Preserve current behavior; record route/data boundaries, environment
requirements, local migration state, test results, and feature status.

**Acceptance:** Audit and architecture docs match inspected files; baseline
lint/typecheck/build results are recorded; no claim is made about remote schema
state.

## Phase 2 — Design system and public website refinement

**Dependencies:** Phase 1; club-approved content/assets.

**Work:** Retain Manrope, colors, header/footer and responsive structure. Refine
individual route modules and accessible navigation/typography. Set the verified
canonical site origin.

**Acceptance:** All public routes render at mobile/tablet/desktop sizes; keyboard
navigation and contrast are checked; original or club-supplied assets/copy only.

## Phase 3 — Supabase database and security

**Dependencies:** Phase 1; access to a disposable/local Supabase environment.

**Work:** Validate migration on a fresh instance; inspect remote migration state
separately; test every RLS policy and API grant; address exact-stock exposure,
timestamp maintenance, foreign-key indexing, and profile update columns in
forward migrations.

**Acceptance:** Fresh reset succeeds; policy tests prove allowed and denied
operations for anon, authenticated, and each role; remote apply is recorded only
after an authorized real deployment.

## Phase 4 — Supabase Storage and media uploads

**Dependencies:** Phase 3 security decisions and media taxonomy.

**Work:** Plan buckets for club photos/logos, player photos, news images,
gallery images, and documents. Define file type/size limits, safe object paths,
public-vs-private reads, staff upload roles, metadata rows, and deletion rules.
Choose an external video/live service if needed.

**Acceptance:** Upload policies are tested for permitted and forbidden roles;
files are not stored in PostgreSQL; image optimization and error states work.

## Phase 5 — Authentication and admin dashboard

**Dependencies:** Phase 3 role provisioning and tested policies.

**Work:** Add sign-in, session refresh middleware, protected `/admin` layout,
server-side role guard, and initial dashboard shell. Establish trusted initial
super-admin provisioning.

**Acceptance:** Unauthenticated and unauthorized requests are denied on server
routes/actions, not just hidden in UI; session refresh/logout and role tests pass.

## Phase 6 — News CMS and dynamic homepage

**Dependencies:** Phases 3, 4, and 5.

**Work:** Add validated news CRUD, category selection, image workflow,
publication scheduling, article routes, and homepage published-news reads.

**Acceptance:** Drafts are not publicly readable; only authorized staff mutate;
published articles render with correct metadata; invalid input and storage errors
are surfaced.

## Phase 7 — Players, matches, and transfers

**Dependencies:** CMS authorization/data patterns from Phase 6; confirmed club
data and competitions requirements.

**Work:** Build managers and public lists/details with server-side pagination
where needed. Add statistics/events only after the data model is approved.

**Acceptance:** Public views expose only approved active/published records;
staff roles are enforced server-side and by RLS; no fabricated content.

## Phase 8 — Galleries, video centre, and live streaming

**Dependencies:** Phase 4 storage and provider selection.

**Work:** Add galleries, gallery image metadata, video playback/provider links,
live-stream scheduling, and moderation.

**Acceptance:** Uploads and metadata respect RLS/storage policies; provider
secrets remain server-side; playback and unavailable/live states are tested.

## Phase 9 — Honours, sponsors, and club pages

**Dependencies:** Approved verified content; authorization pattern from Phase 5.

**Work:** Build honours manager, sponsors, managed club pages, FAQ, contact,
privacy, terms, and navigation content as confirmed.

**Acceptance:** Public publication states and admin permissions work; legal and
historical copy is approved by the club.

## Phase 10 — Official online store and inventory

**Dependencies:** Phase 3 product schema/security and confirmed catalogue.

**Work:** Build product/variant pages, category browsing, stock workflows,
orders management, and inventory auditing.

**Acceptance:** Public users cannot mutate inventory/orders; variants, pricing,
and availability are consistent; stock disclosure is intentional.

## Phase 11 — Cart, checkout, and payment verification

**Dependencies:** Phases 10 and payment-provider architecture review.

**Work:** Choose Paystack or Flutterwave after server-side order creation,
provider initialization, verified signed callbacks/webhooks, idempotency,
reconciliation, refunds, and audit records are specified.

**Acceptance:** Server recalculates totals; browser cannot mark payment complete;
duplicate/out-of-order webhook tests pass; no secret key enters client bundles.

## Phase 12 — Testing, optimization, and deployment

**Dependencies:** Feature acceptance in prior phases.

**Work:** Add route/component/data/security tests, accessibility checks, image
and query optimization, caching/revalidation policy, observability, CI, staging,
backup/restore, and production runbooks.

**Acceptance:** Clean build/typecheck/lint/tests; RLS/storage tests; responsive
and accessibility checks; production env, canonical metadata, monitoring, and
rollback plan documented.

## Dependency order

Database/RLS validation precedes uploads and admin writes. Admin authorization
precedes CMS managers. CMS patterns precede related editorial modules. Store
and inventory precede checkout; payment integration is last among features.
Testing and deployment validation spans all phases and is a release gate.
