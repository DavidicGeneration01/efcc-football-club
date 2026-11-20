import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PlayerCard } from "@/components/team/player-components";
import { getPublishedPlayers } from "@/lib/team/queries";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const players = await getPublishedPlayers("current");

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section-hero bg-[#151515] px-6 py-28 text-white md:py-36">
          <div className="mx-auto max-w-[1384px]">
            <p className="text-xs font-bold tracking-[.2em] text-[#ffaaa1]">THE SQUAD</p>
            <h1 className="mt-5 uppercase leading-none">First team</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300">
              Meet the players whose profiles have been published by EFCC Football Club.
            </p>
          </div>
        </section>
        <section className="section">
          <div className="section-content">
            {players.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {players.map(player => <PlayerCard key={player.id} player={player} />)}
              </div>
            ) : (
              <div className="border border-dashed border-neutral-300 bg-neutral-50 p-8 md:p-14">
                <p className="text-xs font-bold tracking-[.18em] text-[#da291c]">FIRST TEAM</p>
                <h2 className="mt-4 uppercase">Player profiles coming soon</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                  Published First Team player profiles will appear here. No player information has been published yet.
                </p>
              </div>
            )}
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Club history</p>
                <h2 className="mt-2 text-2xl font-extrabold uppercase tracking-tight">Former players</h2>
              </div>
              <Link href="/team/former" className="bg-[#111] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-neutral-700">
                Explore former players
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
