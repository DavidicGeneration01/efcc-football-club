import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicGallery } from "@/components/gallery/public-gallery";

export const dynamic = "force-dynamic";

const pages: Record<string, { title: string; intro: string; label: string }> = {
  club: { title: "The club", intro: "Discover the identity, people and ambitions of EFCC Football Club.", label: "OUR IDENTITY" },
  matches: { title: "Match centre", intro: "Fixtures, results, match reports and updates from the team.", label: "FOLLOW THE ACTION" },
  transfers: { title: "Transfers", intro: "Confirmed player arrivals, departures and club announcements.", label: "SQUAD UPDATES" },
  media: { title: "Media centre", intro: "Videos, interviews, match highlights and live coverage.", label: "WATCH & EXPLORE" },
  gallery: { title: "Photo gallery", intro: "Moments from matches, training, tournaments and club events.", label: "THROUGH THE LENS" },
  honours: { title: "Honours", intro: "Celebrating the trophies, tournaments and achievements in our history.", label: "OUR HISTORY" },
  shop: { title: "Official store", intro: "Discover official EFCC Football Club jerseys and merchandise.", label: "WEAR THE COLOURS" },
  contact: { title: "Contact EFCC", intro: "Get in touch with EFCC Football Club, Garki Area 3, Abuja, Nigeria.", label: "CONTACT THE CLUB" }
};

export function generateStaticParams() {
  return Object.keys(pages).map(section => ({ section }));
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section];
  if (!page) notFound();

  return <>
    <SiteHeader />
    <main>
      <section className="section-hero bg-[#151515] px-6 py-28 text-white md:py-36">
        <div className="mx-auto max-w-[1384px]">
          <p className="text-xs font-bold tracking-[.2em] text-[#ffaaa1]">{page.label}</p>
          <h1 className="mt-5 uppercase leading-none">{page.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300">{page.intro}</p>
        </div>
      </section>
      <section className="section">
        {section === "gallery" || section === "media" ? (
          <Suspense fallback={<p className="section-content text-sm text-neutral-600" role="status">Loading the EFCC photo gallery...</p>}>
            <PublicGallery />
          </Suspense>
        ) : (
          <div className="section-content border border-dashed border-neutral-300 bg-neutral-50 p-8 md:p-14">
            <p className="text-xs font-bold tracking-[.18em] text-[#da291c]">CONTENT MODULE READY FOR INTEGRATION</p>
            <h2 className="mt-4 uppercase">EFCC {page.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">This page structure is in place. The next development phase connects this section to Supabase so authorized club staff can manage its content through the administration dashboard.</p>
          </div>
        )}
      </section>
    </main>
    <SiteFooter />
  </>;
}
