import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PlayerCard } from "@/components/team/player-components";
import { getPublishedPlayers } from "@/lib/team/queries";

export const dynamic = "force-dynamic";

export default async function FormerPlayersPage() {
  const players = await getPublishedPlayers("former");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section-hero bg-[#151515] px-6 py-28 text-white md:py-36">
          <div className="mx-auto max-w-[1384px]">
            <p className="text-xs font-bold tracking-[.2em] text-[#ffaaa1]">CLUB HISTORY</p>
            <h1 className="mt-5 uppercase leading-none">Former players</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300">
              Published profiles of former EFCC Football Club players.
            </p>
          </div>
        </section>
        <section className="section">
          <div className="section-content">
            <Link href="/team" className="mb-6 inline-block text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:underline">
              Back to First Team
            </Link>
            {players.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {players.map(player => <PlayerCard key={player.id} player={player} />)}
              </div>
            ) : (
              <div className="border border-dashed border-neutral-300 bg-neutral-50 p-8 md:p-14">
                <p className="text-xs font-bold tracking-[.18em] text-[#da291c]">FORMER PLAYERS</p>
                <h2 className="mt-4 uppercase">No published profiles yet</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                  Former-player profiles will appear here after they have been classified and published by club staff.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
