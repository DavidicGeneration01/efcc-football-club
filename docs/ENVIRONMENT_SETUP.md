# EFCC Football Club Environment Setup

## Required variable names

The current Supabase helpers require:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Only the Supabase URL and publishable key belong in `NEXT_PUBLIC_` variables.
Never put a service-role key, secret key, payment secret, or webhook secret in a
`NEXT_PUBLIC_` variable or browser code.

## Local setup

1. Copy `.env.example` to `.env.local` in the project root.
2. Fill the two variable values from the club-controlled Supabase project
   settings on your own machine. Do not paste credentials into chat or commit
   them.
3. Restart the Next.js dev server after changing environment variables.
4. `.gitignore` includes `.env.local`, `.env`, and `.env.*.local`; keep it that
   way. `.env.example` should contain variable names and placeholders only, not
   machine-specific or deployment credentials.
5. If a server-only secret is needed later, use a variable without the
   `NEXT_PUBLIC_` prefix, access it only from server code, and store it in the
   deployment provider's secret manager.

## Current audit observation

At audit time `.env.local` was not present in the workspace, while `.gitignore`
does ignore it. The Supabase client helpers use the variable names above. No
environment values are documented here. Verify local presence privately; this
document intentionally does not confirm or reproduce any value.

## Future integrations

Do not add these until the relevant feature is implemented and provider chosen:

- Server-only payment API secret and webhook verification secret.
- Video-provider API token if server-side management is required.
- Email provider credentials for notifications/newsletters.

Record only variable names, purpose, and which runtime needs them. Never commit
real values, print them in diagnostics, or pass them to client components.
