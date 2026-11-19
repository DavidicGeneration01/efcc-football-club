import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SectionHeading } from "@/components/section-heading";
import { NewsCard } from "@/components/news/news-card";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getLatestPublishedNews, NewsQueryError } from "@/lib/news/queries";

export default async function HomePage() {
  let latestNews: Awaited<ReturnType<typeof getLatestPublishedNews>> = [];
  let newsUnavailable = !hasSupabaseEnv();

  if (!newsUnavailable) {
    try {
      latestNews = await getLatestPublishedNews(3);
    } catch (error) {
      if (!(error instanceof NewsQueryError)) throw error;
      console.error("Could not load published news for the homepage.", error);
      newsUnavailable = true;
    }
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">EFCC FOOTBALL CLUB · GARKI AREA 3, ABUJA</div>
            <h1>Our city.<br />Our colours.<br /><span className="text-[#ffaaa1]">Our club.</span></h1>
            <p>Welcome to the official digital home of EFCC Football Club. Follow the team, discover our story and be part of the journey.</p>
            <Link href="/club" className="primary-button">Discover the club <span aria-hidden>↗</span></Link>
          </div>
        </section>

        <section className="section">
          <SectionHeading eyebrow="The latest from EFCC" title="Club headlines" hrefLabel="All news" href="/news" />
          <div className="news-grid">
            {latestNews.length ? latestNews.map((article, index) => (
              <NewsCard key={article.id} article={article} featured={index === 0} />
            )) : (
              <div className="col-span-full border border-dashed border-neutral-300 bg-neutral-50 p-7 text-sm leading-6 text-neutral-600">
                {newsUnavailable
                  ? "Club news is temporarily unavailable. Please check back later."
                  : "No news articles have been published yet."}
              </div>
            )}
          </div>
        </section>

        <section className="match-band">
          <div className="match-inner">
            <div><div className="match-label">Match centre</div><h2 className="mt-3 font-extrabold uppercase tracking-tight">The next match</h2><p className="mt-2 text-sm text-neutral-400">Fixtures and kickoff details will be published by the club.</p></div>
            <div className="match-placeholder"><span className="match-team">EFCC FC</span><span className="match-vs">VS</span><span className="match-team">OPPONENT</span></div>
          </div>
        </section>

        <section className="dark-section">
          <div className="section">
            <SectionHeading eyebrow="Inside the club" title="More from EFCC" />
            <div className="feature-grid">
              <Link href="/team" className="feature-tile"><span>01 · First team</span><h3>Meet the squad ↗</h3></Link>
              <Link href="/media" className="feature-tile"><span>02 · Club media</span><h3>Watch & explore ↗</h3></Link>
              <Link href="/honours" className="feature-tile"><span>03 · Our journey</span><h3>Honours & history ↗</h3></Link>
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHeading eyebrow="Wear the colours" title="Official EFCC store" />
          <div className="flex flex-col items-start justify-between gap-5 bg-[#f5f5f3] p-8 md:flex-row md:items-center md:p-12">
            <div><p className="text-xs font-bold tracking-[.18em] text-[#da291c]">THE CLUB. THE COLOURS.</p><h3 className="store-title mt-3 max-w-xl uppercase leading-none tracking-tight">Your colours. Your club.</h3><p className="mt-3 text-sm text-neutral-600">Official jerseys and merchandise will be available here.</p></div>
            <Link href="/shop" className="primary-button">Explore the store ↗</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
