import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PlayerProfileView } from "@/components/team/player-components";
import { getPublishedPlayerBySlug } from "@/lib/team/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPublishedPlayerBySlug(slug);
  if (!player) return { title: "Player profile not found" };

  const title = `${player.full_name} | EFCC First Team`;
  const description = player.biography || `Official EFCC Football Club player profile for ${player.full_name}.`;
  const image = player.photo_media_id ? `/api/team-media/${player.photo_media_id}` : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/team/${player.slug}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/team/${player.slug}`,
      ...(image ? { images: [{ url: image, alt: `${player.full_name} portrait` }] } : {})
    }
  };
}

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
