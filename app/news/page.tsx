import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { NewsCard } from "@/components/news/news-card";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getPublishedNews, NEWS_PAGE_SIZE, NewsQueryError } from "@/lib/news/queries";

export const metadata: Metadata = {
  title: "Latest News | EFCC Football Club",
  description: "Published news and editorial updates from EFCC Football Club."
};

function safePage(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
}

export default async function PublicNewsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageValue } = await searchParams;
  const page = safePage(pageValue);
  let newsData: Awaited<ReturnType<typeof getPublishedNews>> | null = null;
  let unavailable = !hasSupabaseEnv();

  if (!unavailable) {
    try {
      newsData = await getPublishedNews(page);
    } catch (error) {
      if (!(error instanceof NewsQueryError)) throw error;
      console.error("Could not load the public news listing.", error);
      unavailable = true;
    }
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="section-hero bg-[#151515] px-6 py-24 text-white md:py-32">
          <div className="mx-auto max-w-[1384px]">
            <p className="text-xs font-bold tracking-[.2em] text-[#ffaaa1]">THE LATEST</p>
            <h1 className="mt-5 uppercase leading-none">News &amp; stories</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300">
              Official news and editorial updates from EFCC Football Club.
            </p>
          </div>
        </section>
        <section className="section">
          {unavailable ? (
            <p className="border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900" role="status">
              News is temporarily unavailable. Please check back later.
            </p>
          ) : newsData?.articles.length ? (
            <>
              <div className="news-grid">
                {newsData.articles.map((article, index) => (
                  <NewsCard key={article.id} article={article} featured={index === 0} />
                ))}
              </div>
              {newsData.total > NEWS_PAGE_SIZE ? (
                <nav aria-label="News pages" className="mt-10 flex items-center justify-between border-t border-neutral-200 pt-5 text-sm">
                  {page > 1 ? <Link href={`/news?page=${page - 1}`} className="font-bold text-[#b51f17]">← Newer stories</Link> : <span />}
                  <span className="text-neutral-500">
                    Page {page} of {Math.ceil(newsData.total / NEWS_PAGE_SIZE)}
                  </span>
                  {page * NEWS_PAGE_SIZE < newsData.total ? <Link href={`/news?page=${page + 1}`} className="font-bold text-[#b51f17]">Older stories →</Link> : <span />}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="border border-dashed border-neutral-300 bg-neutral-50 p-8 md:p-12">
              <p className="text-xs font-bold tracking-[.18em] text-[#da291c]">NEWS &amp; EDITORIAL</p>
              <h2 className="mt-4 text-2xl font-extrabold uppercase tracking-tight">No published stories yet</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                Official news will appear here after it has been published by an authorized EFCC editor.
              </p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
