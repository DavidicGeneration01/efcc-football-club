import Link from "next/link";
import { signInAction } from "./actions";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const errorMessages = new Map<string, string>([
  ["credentials", "Sign-in failed. Check your email and password."],
  ["unauthorized", "This account does not have an EFCC staff role."],
  ["role-check", "Staff access could not be verified. Check the Supabase role policy and try again."],
  ["configuration", "Supabase is not configured. Add the required variables to your local environment."]
]);

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabaseConfigured = hasSupabaseEnv();
  const message = error ? errorMessages.get(error) : undefined;

  return (
    <main className="min-h-screen bg-[#111] px-5 py-16 text-white">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="text-sm font-bold tracking-widest text-[#ffaaa1]">
          EFCC FOOTBALL CLUB
        </Link>
        <section className="mt-10 border border-white/15 bg-[#191919] p-7 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ffaaa1]">Staff access</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Admin sign in</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            Sign in with an account provisioned by an EFCC administrator.
          </p>

          {message ? (
            <p className="mt-6 border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-100" role="alert">
              {message}
            </p>
          ) : null}

          {!supabaseConfigured ? (
            <div className="mt-6 border border-amber-300/30 bg-amber-950/30 p-4 text-sm leading-6 text-amber-100">
              Admin access needs <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code>.
              No credentials are displayed here.
            </div>
          ) : (
            <form action={signInAction} className="mt-7 space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  className="mt-2 w-full border border-white/20 bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#ffaaa1]"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-2 w-full border border-white/20 bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#ffaaa1]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#da291c] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17]"
              >
                Sign in
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-white/15 pt-5 text-sm leading-6 text-neutral-300">
            <p className="font-bold text-white">Need an account?</p>
            <p className="mt-1">
              EFCC staff accounts are created by an administrator. Contact your EFCC administrator
              through the club&apos;s official channels to request access. Self-registration is not
              available.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
