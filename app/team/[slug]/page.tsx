import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PlayerProfileView } from "@/components/team/player-components";
import { getPublishedPlayerBySlug } from "@/lib/team/queries";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = await getPublishedPlayerBySlug(slug);
  if (!player) notFound();

  const backHref = player.roster_status === "former" ? "/team/former" : "/team";
  const backLabel = player.roster_status === "former" ? "Former players" : "First Team";

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section-hero bg-[#151515] px-6 py-20 text-white md:py-28">
          <div className="mx-auto max-w-[1384px]">
            <Link href={backHref} className="text-xs font-bold uppercase tracking-[.18em] text-[#ffaaa1] hover:underline">
              ← {backLabel}
            </Link>
            <div className="mt-8">
              <PlayerProfileView player={player} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
