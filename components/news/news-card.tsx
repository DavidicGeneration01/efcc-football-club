import Image from "next/image";
import Link from "next/link";
import type { NewsSummary } from "@/lib/news/queries";

export function NewsCard({ article, featured = false }: { article: NewsSummary; featured?: boolean }) {
  return (
    <article className="news-card">
      <Link href={`/news/${article.slug}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#da291c]">
        <div className={`relative overflow-hidden bg-[#1b1b1b] ${featured ? "min-h-[280px] sm:min-h-[330px]" : "min-h-[220px]"}`}>
          {article.featured_image ? (
            <Image
              src={article.featured_image}
              alt=""
              fill
              unoptimized
              sizes={featured ? "(max-width: 640px) 100vw, 60vw" : "(max-width: 640px) 100vw, 33vw"}
              className="object-cover"
            />
          ) : (
            <div className="flex min-h-[220px] items-end bg-gradient-to-br from-neutral-800 to-[#5b1915] p-5 text-xs font-bold uppercase tracking-[.14em] text-white">
              EFCC Football Club
            </div>
          )}
        </div>
        <div className="news-copy">
          {article.category ? <div className="news-category">{article.category.name}</div> : null}
          <h2 className="mt-2 text-xl font-bold leading-snug tracking-tight">{article.title}</h2>
          {article.excerpt ? <p className="mt-2 text-sm leading-6 text-neutral-600">{article.excerpt}</p> : null}
          <span className="mt-4 inline-block text-xs font-bold uppercase tracking-wider text-[#b51f17]">Read story ↗</span>
        </div>
      </Link>
    </article>
  );
}
