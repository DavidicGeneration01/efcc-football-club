import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";
import { allStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireStaffRole(allStaffRoles);

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-[#111] md:grid md:grid-cols-[250px_1fr]">
      <aside className="flex flex-col bg-[#111] px-5 py-6 text-white md:min-h-screen">
        <Link href="/admin" className="text-sm font-extrabold tracking-widest text-white">
          EFCC <span className="text-[#ffaaa1]">ADMIN</span>
        </Link>
        <nav aria-label="Admin navigation" className="mt-9 flex gap-3 text-sm md:flex-col">
          <Link href="/admin" className="px-3 py-2 hover:bg-white/10">Overview</Link>
          <Link href="/admin/media" className="px-3 py-2 hover:bg-white/10">Media uploads</Link>
        </nav>
        <form action={signOutAction} className="mt-auto hidden pt-8 md:block">
          <button type="submit" className="px-3 py-2 text-sm text-neutral-300 hover:text-white">
            Sign out
          </button>
        </form>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-neutral-500">EFCC content administration</p>
          <form action={signOutAction} className="md:hidden">
            <button type="submit" className="text-xs font-bold uppercase tracking-wider text-[#b51f17]">
              Sign out
            </button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-6xl p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
