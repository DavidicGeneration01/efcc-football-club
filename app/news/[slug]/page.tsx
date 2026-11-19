import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getPublishedArticle, NewsQueryError } from "@/lib/news/queries";

type ArticleRouteProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArticleRouteProps): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) return { title: "News | EFCC Football Club" };

  try {
    const article = await getPublishedArticle(slug);
    if (!article) return { title: "Article not found | EFCC Football Club" };
    return {
      title: article.seo_title || `${article.title} | EFCC Football Club`,
      description: article.seo_description || article.excerpt || undefined,
      openGraph: {
        title: article.seo_title || article.title,
        description: article.seo_description || article.excerpt || undefined,
        images: article.featured_image ? [article.featured_image] : undefined
      }
    };
  } catch (error) {
    if (!(error instanceof NewsQueryError)) throw error;
    console.error("Could not load metadata for the public news article.", error);
    return { title: "News | EFCC Football Club" };
  }
}

export default async function PublicNewsArticlePage({ params }: ArticleRouteProps) {
  const { slug } = await params;
  if (!hasSupabaseEnv()) {
    return (
      <>
        <SiteHeader />
        <main className="section">
          <p className="border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900" role="status">
            News is temporarily unavailable. Please check back later.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  let article;
  try {
    article = await getPublishedArticle(slug);
  } catch (error) {
    if (!(error instanceof NewsQueryError)) throw error;
    console.error("Could not load the public news article.", error);
    return (
      <>
        <SiteHeader />
        <main className="section">
          <p className="border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">
            This article is temporarily unavailable. Please try again later.
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!article) notFound();

  const publishedAt = article.published_at
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "long" }).format(new Date(article.published_at))
    : null;

  return (
    <>
      <SiteHeader />
      <main>
        <article>
          <header className="bg-[#151515] px-5 py-16 text-white sm:py-24">
            <div className="mx-auto max-w-4xl">
              <p className="text-xs font-bold tracking-[.2em] text-[#ffaaa1]">
                {article.category?.name ?? "EFCC FOOTBALL CLUB"}
              </p>
              <h1 className="mt-5 text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-5xl">
                {article.title}
              </h1>
              {article.excerpt ? <p className="mt-5 max-w-3xl text-base leading-7 text-neutral-300">{article.excerpt}</p> : null}
              {publishedAt ? <time className="mt-6 block text-xs font-bold uppercase tracking-wider text-neutral-400" dateTime={article.published_at ?? undefined}>{publishedAt}</time> : null}
            </div>
          </header>

          <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
            {article.featured_image ? (
              <div className="relative mb-10 aspect-[16/9] overflow-hidden bg-neutral-100">
                <Image
                  src={article.featured_image}
                  alt={article.title}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 896px) 100vw, 896px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="whitespace-pre-line break-words text-base leading-8 text-neutral-800 sm:text-lg">
              {article.body}
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
