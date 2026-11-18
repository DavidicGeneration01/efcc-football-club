# EFCC Football Club Progress

This checklist records the state evidenced by the local project. A checked item
means the foundation or verification exists; it does not imply the complete
feature is production-ready.

## Foundation and audit

- [x] Next.js App Router, TypeScript, Tailwind CSS v4 configured.
- [x] Manrope and EFCC red/black/white visual foundation.
- [x] Homepage shell, shared header/footer, generic section placeholders.
- [x] Supabase browser/server helpers use URL and publishable-key variable names.
- [x] Initial migration defines application tables and RLS policies.
- [x] `.env.local` is ignored by `.gitignore`.
- [x] Architecture, implementation audit, database plan, roadmap, and environment
      setup documented.
- [x] `/admin` sign-in and role-checked dashboard routes added.
- [x] Admin image upload UI and Storage policy migration added.
- [ ] Apply the Storage migration, then
      verify sign-in, role restrictions, and an actual upload.
- [ ] Resolve the existing unused `index` lint warning in `app/page.tsx`.
- [ ] Replace example `metadataBase` with the approved canonical site URL.
- [ ] Add automated tests and CI.

## Supabase and security

- [x] Configure the required Supabase environment variable names locally;
      `.env.local` remains ignored and values are not recorded here.
- [ ] Confirm whether the initial migration has been applied remotely.
- [ ] Test a fresh local/disposable migration run.
- [ ] Add automated RLS positive/negative policy tests.
- [ ] Review public variant stock visibility and profile timestamp updates.
- [x] Add a guarded trusted initial Super Admin provisioning procedure and staff-account runbook.
- [ ] Apply the role-provisioning migration, provision the confirmed first account, and test staff/ordinary-user access against the club's Supabase project.
- [x] Add session-refresh middleware and server-side role guards; live Supabase
      authorization remains unverified.
- [x] Add a public image bucket and role-restricted write policies in
      `0002_efcc_media_storage.sql`; migration not applied or tested remotely.

## Public website and CMS

- [ ] Replace generic section placeholders incrementally with feature routes.
- [ ] Connect homepage to published Supabase news and matches.
- [ ] Implement news listing, detail, validation, and staff CRUD.
- [ ] Implement player profiles and squad management.
- [ ] Implement published fixtures/results and match management.
- [ ] Implement transfers and management.
- [ ] Implement galleries, media library, and provider-backed video/live pages.
- [ ] Implement honours, sponsors, managed club content, FAQ, contact, and legal
      pages using club-approved information.

## Store and payments

- [ ] Implement product catalogue, variants, and inventory management.
- [ ] Define cart and server-side order creation.
- [ ] Select and integrate a payment provider only after verified webhook and
      idempotency design.
- [ ] Test payment reconciliation, order status transitions, and refunds.

## Release readiness

- [ ] Accessibility and responsive testing across real target devices.
- [ ] Performance, caching, pagination, and image optimization validation.
- [ ] SEO metadata, sitemap, robots, and canonical URLs.
- [ ] Staging and production environment/runbook validation.
- [ ] Backup/restore, monitoring, and rollback procedure.

## Latest checks

- `npm run dev`: homepage returned HTTP 200; `/admin` and `/admin/media` no longer
  return 404 and redirect to the sign-in page when signed out; login form renders.
- `npm run lint`: passed with one warning (`index` unused in `app/page.tsx`).
- `npx tsc --noEmit`: passed after adding admin routes and upload UI.
- `npm run build`: passed; `/admin` routes are dynamically rendered and the
  build reports the same existing lint warning.
- Actual staff login and upload remain unverified: `.env.local` is absent and
  `0002_efcc_media_storage.sql` has not been applied.
