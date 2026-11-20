"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Home,
  Image,
  LogOut,
  Menu,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  ShoppingBag,
  Trophy,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { signOutAction } from "@/app/admin/actions";
import type { StaffRole } from "@/lib/auth/require-staff-role";

type AdminPageLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AdminNavigationGroup = {
  id: string;
  label: string;
  items: AdminPageLink[];
};

const navigationGroups: AdminNavigationGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: Home }]
  },
  {
    id: "club",
    label: "Club",
    items: [
      { href: "/admin/club", label: "The Club", icon: Building2 },
      { href: "/admin/team", label: "First Team", icon: Users },
      { href: "/admin/matches", label: "Match Centre", icon: CalendarDays },
      { href: "/admin/honours", label: "Honours", icon: Trophy }
    ]
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/news", label: "News & Editorial", icon: Newspaper },
      { href: "/admin/media", label: "Media Library", icon: Image },
      { href: "/admin/store", label: "Store", icon: ShoppingBag }
    ]
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { href: "/admin/staff", label: "Staff & Permissions", icon: Shield },
      { href: "/admin/settings", label: "Settings", icon: Settings }
    ]
  }
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

function formatRole(role: StaffRole) {
  return role.replace(/_/g, " ");
}

export function AdminWorkspace({
  children,
  email,
  role
}: {
  children: ReactNode;
  email: string;
  role: StaffRole;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    club: true,
    content: true,
    administration: true
  });
  const initials = email.slice(0, 1).toUpperCase() || "E";

  function closeMobileNavigation() {
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-[#111]">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileNavigation}
        />
      ) : null}

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col bg-[#111] px-4 py-5 text-white transition-[width,transform] duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-[76px]" : "md:w-[250px]"}`}
      >
        <div className={`flex h-12 shrink-0 items-center ${collapsed ? "md:justify-center md:px-0" : "justify-between"}`}>
          <Link
            href="/admin"
            onClick={closeMobileNavigation}
            className="flex items-center gap-2 text-sm font-extrabold tracking-widest text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffaaa1]"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#da291c] text-xs font-extrabold tracking-tight text-[#ffaaa1]">EF</span>
            <span className={collapsed ? "md:hidden" : ""}>
              EFCC <span className="text-[#ffaaa1]">ADMIN</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={closeMobileNavigation}
            className="rounded p-2 text-neutral-300 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Admin navigation" className="mt-7 min-h-0 flex-1 space-y-5 overflow-y-auto">
          {navigationGroups.map(group => {
            const expanded = collapsed || expandedGroups[group.id];
            return (
              <section key={group.id}>
                {!collapsed ? (
                  <button
                    type="button"
                    aria-expanded={expandedGroups[group.id]}
                    onClick={() => setExpandedGroups(current => ({
                      ...current,
                      [group.id]: !current[group.id]
                    }))}
                    className="mb-1 flex w-full items-center justify-between px-3 py-1 text-left text-[10px] font-bold uppercase tracking-[.15em] text-neutral-400 hover:text-white"
                  >
                    {group.label}
                    <ChevronDown size={14} className={`transition-transform ${expandedGroups[group.id] ? "" : "-rotate-90"}`} />
                  </button>
                ) : null}
                {expanded ? (
                  <ul className="space-y-1">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const active = isActiveRoute(pathname, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={closeMobileNavigation}
                            title={collapsed ? item.label : undefined}
                            aria-current={active ? "page" : undefined}
                            className={`flex min-h-10 items-center gap-3 border-l-2 px-3 py-2 text-[13px] font-semibold leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffaaa1] ${
                              active
                                ? "border-l-[#da291c] bg-white/10 text-white"
                                : "border-l-transparent text-neutral-300 hover:bg-white/10 hover:text-white"
                            } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                          >
                            <Icon size={17} strokeWidth={1.8} className="shrink-0" />
                            <span className={collapsed ? "md:sr-only" : ""}>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </nav>

        <div className={`mt-4 shrink-0 border-t border-white/15 pt-4 ${collapsed ? "md:px-0" : ""}`}>
          <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? "md:justify-center md:px-0" : ""}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-sm font-bold text-white" aria-hidden="true">
              {initials}
            </span>
            <span className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <span className="block truncate text-xs font-semibold">{email}</span>
              <span className="mt-1 block truncate text-[10px] capitalize text-neutral-400">{formatRole(role)}</span>
            </span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffaaa1] ${
                collapsed ? "md:justify-center md:px-0" : ""
              }`}
            >
              <LogOut size={16} />
              <span className={collapsed ? "md:sr-only" : ""}>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? "md:ml-[76px]" : "md:ml-[250px]"}`}>
        <header className="sticky top-0 z-30 flex min-h-[64px] items-center gap-3 border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label={mobileOpen ? "Close admin navigation" : "Open admin navigation"}
            aria-expanded={mobileOpen}
            aria-controls="admin-sidebar"
            onClick={() => setMobileOpen(current => !current)}
            className="grid size-9 shrink-0 place-items-center border border-neutral-200 text-neutral-600 hover:border-[#da291c] hover:text-[#b51f17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#da291c] md:hidden"
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
          <button
            type="button"
            aria-label={collapsed ? "Expand admin navigation" : "Collapse admin navigation"}
            aria-expanded={!collapsed}
            aria-controls="admin-sidebar"
            onClick={() => setCollapsed(current => !current)}
            className="hidden size-9 shrink-0 place-items-center border border-neutral-200 text-neutral-600 hover:border-[#da291c] hover:text-[#b51f17] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#da291c] md:grid"
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-[.12em] text-neutral-700">EFCC Football Club</p>
            <p className="hidden text-[10px] uppercase tracking-[.12em] text-neutral-500 sm:block">Content administration</p>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-3 border-l border-neutral-200 pl-3 sm:pl-5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-neutral-200 bg-[#f5f5f3] text-xs font-bold uppercase text-[#b51f17]" aria-hidden="true">
              {initials}
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-[190px] truncate text-xs font-bold text-neutral-800">{email}</span>
              <span className="mt-0.5 block text-[10px] capitalize text-neutral-500">{formatRole(role)}</span>
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
