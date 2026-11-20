import Image from "next/image";
import Link from "next/link";
import { archivePlayerAction, restorePlayerAction } from "@/app/admin/(dashboard)/team/actions";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { getAdminPlayerPhotoUrls, getAdminPlayers, PLAYER_PAGE_SIZE, type PlayerListFilter } from "@/lib/team/queries";

const filters = ["all", "current", "former", "needs_review", "draft", "published", "archived"] as const satisfies readonly PlayerListFilter[];
const filterSet: ReadonlySet<string> = new Set(filters);
const filterLabels: Record<PlayerListFilter, string> = {
  all: "All players",
  current: "Current First Team",
  former: "Former players",
  needs_review: "Needs review",
  draft: "Draft profiles",
  published: "Published profiles",
  archived: "Archived"
};
function isPlayerListFilter(value: string | undefined): value is PlayerListFilter {
  return value !== undefined && filterSet.has(value);
}
const notices: Record<string, { tone: "success" | "error"; message: string }> = {
  archived: { tone: "success", message: "Player archived. The profile and photograph have been retained." },
  restored: { tone: "success", message: "Player restored." },
  invalid: { tone: "error", message: "The player action was invalid." },
  "archive-error": { tone: "error", message: "The player could not be archived. Check access and try again." },
  "restore-error": { tone: "error", message: "The player could not be restored. Check access and try again." },
  "not-found": { tone: "error", message: "The player was not found or could not be updated." }
};

function safePage(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
}

export default async function AdminTeamPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string; notice?: string }>;
}) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const params = await searchParams;
  const filter = isPlayerListFilter(params.filter) ? params.filter : "all";
  const search = (params.q ?? "").slice(0, 100);
  const page = safePage(params.page);
  const { players, total } = await getAdminPlayers({ search, filter, page });
  const photoUrls = await getAdminPlayerPhotoUrls(players);
  const totalPages = Math.max(1, Math.ceil(total / PLAYER_PAGE_SIZE));
  const notice = params.notice ? notices[params.notice] : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">First Team</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Player management</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Manage player profiles, squad classification and publication. Current and former players remain separately visible on the public site.
          </p>
        </div>
        <Link href="/admin/team/new" className="bg-[#da291c] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17]">
          Add player
        </Link>
      </div>

      {notice ? (
        <p
          className={`mt-6 border p-4 text-sm ${notice.tone === "success" ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-800"}`}
          role={notice.tone === "success" ? "status" : "alert"}
        >
          {notice.message}
        </p>
      ) : null}

      <form method="get" className="mt-7 grid gap-3 border border-neutral-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,.7fr)_auto] sm:items-end">
        <label className="text-xs font-bold uppercase tracking-wider">
          Search players
          <input
            type="search"
            name="q"
            maxLength={100}
            defaultValue={search}
            placeholder="Search by full name"
            className="mt-2 block w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider">
          Classification and status
          <select name="filter" defaultValue={filter} className="mt-2 block w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal">
            {filters.map(value => <option key={value} value={value}>{filterLabels[value]}</option>)}
          </select>
        </label>
        <button type="submit" className="bg-[#111] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-700">
          Search
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm text-neutral-500">
        <p>{total} {total === 1 ? "player" : "players"}</p>
        <p>{filterLabels[filter]}</p>
      </div>

      {players.length ? (
        <div className="mt-4 space-y-3">
          {players.map(player => (
            <article key={player.id} className="flex flex-col gap-4 border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden bg-neutral-100">
                  {player.photo_media_id && photoUrls.has(player.photo_media_id) ? (
                    <Image src={photoUrls.get(player.photo_media_id)!} alt={`${player.full_name} portrait`} fill unoptimized sizes="64px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-neutral-400">No photo</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-lg font-bold">{player.full_name}</h2>
                    {[
                      player.roster_status.replace("_", " "),
                      player.publication_status,
                      ...(player.archived_at ? ["archived"] : [])
                    ].map(status => (
                      <span key={status} className="border border-neutral-200 bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                        {status}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {player.position || "Position not provided"}
                    {player.shirt_number !== null ? ` · #${player.shirt_number}` : ""}
                    {player.nationality ? ` · ${player.nationality}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <Link href={`/admin/team/${player.id}/edit`} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:bg-red-50">
                  Edit
                </Link>
                {player.publication_status === "published" && !player.archived_at ? (
                  <Link href={`/team/${player.slug}`} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100">
                    View profile
                  </Link>
                ) : null}
                {player.archived_at ? (
                  <form action={restorePlayerAction}>
                    <input type="hidden" name="id" value={player.id} />
                    <button type="submit" className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100">
                      Restore
                    </button>
                  </form>
                ) : (
                  <form action={archivePlayerAction}>
                    <input type="hidden" name="id" value={player.id} />
                    <button type="submit" className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:bg-red-50">
                      Archive
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 border border-dashed border-neutral-300 bg-white p-8 text-sm leading-6 text-neutral-600">
          No players match these filters. Add a profile or adjust your search.
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Player list pages" className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4 text-sm">
          {page > 1 ? (
            <Link href={{ pathname: "/admin/team", query: { page: page - 1, ...(search ? { q: search } : {}), ...(filter !== "all" ? { filter } : {}) } }} className="font-bold text-[#b51f17]">
              Previous
            </Link>
          ) : <span />}
          <span className="text-neutral-500">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={{ pathname: "/admin/team", query: { page: page + 1, ...(search ? { q: search } : {}), ...(filter !== "all" ? { filter } : {}) } }} className="font-bold text-[#b51f17]">
              Next
            </Link>
          ) : <span />}
        </nav>
      ) : null}
    </div>
  );
}
