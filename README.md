# EFCC Football Club website — starter

A Next.js foundation for the official EFCC Football Club website.

## Requirements
- Node.js 20.9+
- npm
- A Supabase project (optional for viewing the initial visual shell)

## Run locally
```bash
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000.

The homepage and non-gallery section placeholders render without Supabase credentials. The public gallery and admin features require the environment variables when called.

## Supabase setup
1. Create a Supabase project in an account controlled by the club.
2. Copy the project URL and publishable/anon key into `.env.local`.
3. Apply the numbered migrations in `supabase/migrations/` in order using the Supabase CLI or SQL Editor. Check migration history first and do not blindly replay migrations on a live project.
4. Migration `0002_efcc_media_storage.sql` creates the `efcc-media` bucket and role-restricted upload policies. Migration `0004_media_metadata.sql` adds media metadata, makes that bucket private, and switches published image delivery to `/api/media/{id}`; review the migration's existing-URL checks before applying it.
5. Configure the first staff account using [docs/ADMIN_ACCOUNT_SETUP.md](./docs/ADMIN_ACCOUNT_SETUP.md). Do not allow public signup to assign roles.

## Important
- Never expose a Supabase service-role key in browser code.
- The initial SQL is a starting schema and must be reviewed/tested before production.
- Checkout, payment verification and live video delivery are not implemented yet.
- Replace the text-based EFCC crest placeholder with the official club-supplied logo when available.
- Demo copy and placeholders are not claims about actual club fixtures, players, achievements or products.

## Design reference
Real Madrid's website is used only as a reference for general information architecture and UX patterns. This project uses original EFCC code and branding.
# efcc-football-club
