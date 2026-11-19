import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";
import { allStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";

export const dynamic = "force-dynamic";

const adminSections = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/club", label: "The Club" },
  { href: "/admin/team", label: "First Team" },
  { href: "/admin/matches", label: "Match Centre" },
  { href: "/admin/news", label: "News & Editorial" },
  { href: "/admin/media", label: "Media Library" },
  { href: "/admin/honours", label: "Honours" },
  { href: "/admin/store", label: "Store" },
  { href: "/admin/staff", label: "Staff & Permissions" },
  { href: "/admin/settings", label: "Settings" }
];

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireStaffRole(allStaffRoles);

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-[#111] md:grid md:grid-cols-[250px_1fr]">
      <aside className="flex flex-col bg-[#111] px-5 py-5 text-white md:min-h-screen md:py-6">
        <Link href="/admin" className="text-sm font-extrabold tracking-widest text-white">
          EFCC <span className="text-[#ffaaa1]">ADMIN</span>
        </Link>
        <nav
          aria-label="Admin navigation"
          className="mt-5 grid grid-cols-2 gap-1 text-xs sm:grid-cols-3 md:mt-9 md:flex md:flex-col md:text-sm"
        >
          {adminSections.map(section => (
            <Link
              key={section.href}
              href={section.href}
              className="min-w-0 px-3 py-2 leading-5 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffaaa1]"
            >
              {section.label}
            </Link>
          ))}
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
