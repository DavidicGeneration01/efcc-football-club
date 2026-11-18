# Claude Code instructions — EFCC Football Club

You are building the official website for EFCC Football Club, Garki Area 3, Abuja, Nigeria.

## Design reference and originality
Use https://www.realmadrid.com/en-US as a reference for information architecture, navigation, editorial hierarchy, match-centre patterns, player profiles, galleries and commerce. Build original React/Next.js components and CSS. Do not copy proprietary source code, protected images, trademarks, logos, or text. EFCC branding is red-led: #DA291C, #C8102E, black and white.

## Stack
Next.js App Router, TypeScript, Tailwind CSS v4, Supabase PostgreSQL/Auth/Storage, @supabase/ssr. Use server components by default. Add client components only for actual interactivity.

## Project rules
- Inspect the current files before editing.
- Keep components reusable and accessible.
- Use real Supabase data for live content; label any seed/demo data clearly.
- Never expose service-role keys or secret keys to the browser.
- Enable RLS on every exposed table and test policies.
- Do not trust client-side role checks; enforce authorization on the server.
- Store media files in storage/video services, not in PostgreSQL byte columns.
- Use server-side pagination, optimized images, caching and revalidation.
- Never invent club facts, player names, results, fixtures, trophies, sponsors or transfers.
- Keep club logo, photos, SVGs, sponsor marks and fonts as replaceable placeholders until supplied.
- Before implementing a phase, explain the intended changes and files. Afterward run typecheck/lint/build and report actual results.
- Do not mark a feature complete until tested.

## Current state
This repository is the Phase 1 foundation: homepage visual shell, navigation/footer, section route placeholders, Supabase client helpers and initial database migration.

## Next tasks
1. Add a protected admin sign-in and role-checked admin layout.
2. Add Supabase middleware/session refresh following current @supabase/ssr guidance.
3. Add media storage buckets and policies.
4. Build news CRUD end-to-end with server actions/route handlers, validation and RLS.
5. Connect homepage news and match modules to published Supabase data.
6. Continue with players, transfers, galleries, video metadata, trophies and store.
7. Add payment integration only after server-side order creation and verified webhook design.

Always ask for the Supabase project URL and publishable/anon key when configuration is needed. Never ask the user to paste a service-role key into chat or commit secrets.
