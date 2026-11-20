import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const numberFormatter = new Intl.NumberFormat("en-NG");
const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos"
});

export default async function AdminHomePage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [newsCount, mediaCount, matchCount, upcomingMatches, recentNews] = await Promise.all([
    supabase
      .from("news")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .not("published_at", "is", null)
      .lte("published_at", now),
    supabase
      .from("media_items")
      .select("id", { count: "exact", head: true })
      .eq("media_type", "image")
      .eq("published", true),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("published", true)
      .eq("status", "upcoming")
      .not("kickoff_at", "is", null)
      .gte("kickoff_at", now),
    supabase
      .from("matches")
      .select("id,opponent,competition,kickoff_at,venue,home_away")
      .eq("published", true)
      .eq("status", "upcoming")
      .not("kickoff_at", "is", null)
      .gte("kickoff_at", now)
      .order("kickoff_at", { ascending: true })
      .limit(4),
    supabase
      .from("news")
      .select("id,title,slug,published_at")
      .eq("status", "published")
      .not("published_at", "is", null)
      .lte("published_at", now)
      .order("published_at", { ascending: false })
      .limit(4)
  ]);

  if (newsCount.error) console.error("Could not load the dashboard news count.", newsCount.error);
  if (mediaCount.error) console.error("Could not load the dashboard media count.", mediaCount.error);
  if (matchCount.error) console.error("Could not load the dashboard match count.", matchCount.error);
  if (upcomingMatches.error) console.error("Could not load upcoming dashboard matches.", upcomingMatches.error);
  if (recentNews.error) console.error("Could not load recent dashboard news.", recentNews.error);

  const statistics = [
    { label: "Published news", value: newsCount.error ? "Unavailable" : numberFormatter.format(newsCount.count ?? 0) },
    { label: "Published images", value: mediaCount.error ? "Unavailable" : numberFormatter.format(mediaCount.count ?? 0) },
    { label: "Upcoming matches", value: matchCount.error ? "Unavailable" : numberFormatter.format(matchCount.count ?? 0) }
  ];

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Administration</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome to the dashboard</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
        EFCC Football Club content administration. Counts and scheduled matches below reflect published records.
      </p>

      <section aria-label="Published content and upcoming match totals" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statistics.map(statistic => (
          <article key={statistic.label} className="border border-neutral-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{statistic.label}</p>
            <p className="mt-3 text-3xl font-extrabold tracking-tight">{statistic.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="upcoming-matches-heading" className="border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.15em] text-[#da291c]">Schedule</p>
              <h2 id="upcoming-matches-heading" className="mt-2 text-xl font-extrabold tracking-tight">Upcoming matches</h2>
            </div>
            <Link href="/admin/matches" className="shrink-0 text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:underline">
              Match Centre
            </Link>
          </div>

          {upcomingMatches.error ? (
            <p className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              The published match schedule could not be loaded.
            </p>
          ) : upcomingMatches.data.length ? (
            <ul className="mt-5 divide-y divide-neutral-200">
              {upcomingMatches.data.map(match => (
                <li key={match.id} className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {match.home_away === "away" ? "Away vs" : match.home_away === "home" ? "Home vs" : "vs"} {match.opponent}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {[match.competition, match.venue].filter(Boolean).join(" · ") || "Competition and venue not specified"}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs font-semibold text-neutral-500" dateTime={match.kickoff_at ?? undefined}>
                    {match.kickoff_at ? dateFormatter.format(new Date(match.kickoff_at)) : "Date not set"}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 border border-dashed border-neutral-300 p-5 text-sm leading-6 text-neutral-600">
              {matchCount.error
                ? "The published match schedule could not be loaded."
                : "There are no upcoming published matches."}
            </p>
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="standings-heading" className="border border-neutral-200 bg-white p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#da291c]">Competition</p>
            <h2 id="standings-heading" className="mt-2 text-xl font-extrabold tracking-tight">League standings</h2>
            <p className="mt-4 border border-dashed border-neutral-300 p-5 text-sm leading-6 text-neutral-600">
              Standings are not available in the current data model. No rankings or team statistics are being assumed.
            </p>
          </section>

          <section aria-labelledby="recent-news-heading" className="border border-neutral-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.15em] text-[#da291c]">Recent updates</p>
                <h2 id="recent-news-heading" className="mt-2 text-xl font-extrabold tracking-tight">Published news</h2>
              </div>
              <Link href="/admin/news" className="shrink-0 text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:underline">
                All articles
              </Link>
            </div>
            {recentNews.error ? (
              <p className="mt-4 text-sm text-red-700" role="alert">Recent news could not be loaded.</p>
            ) : recentNews.data.length ? (
              <ul className="mt-4 divide-y divide-neutral-200">
                {recentNews.data.map(article => (
                  <li key={article.id} className="flex items-start justify-between gap-4 py-3 first:pt-0">
                    <Link href={`/news/${article.slug}`} className="text-sm font-semibold hover:text-[#b51f17]">
                      {article.title}
                    </Link>
                    {article.published_at ? (
                      <time className="shrink-0 text-xs text-neutral-500" dateTime={article.published_at}>
                        {dateFormatter.format(new Date(article.published_at))}
                      </time>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-600">There are no published news articles yet.</p>
            )}
          </section>
        </div>
      </section>

      <section aria-labelledby="quick-actions-heading" className="mt-10">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-[#da291c]">Shortcuts</p>
          <h2 id="quick-actions-heading" className="mt-2 text-2xl font-extrabold tracking-tight">Quick Actions</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/media" className="border border-neutral-200 bg-white p-6 transition hover:border-[#da291c]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#da291c]">Media library</p>
            <h3 className="mt-3 text-xl font-bold tracking-tight">Upload club images</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Add approved public images to the EFCC media bucket.
            </p>
            <span className="mt-5 inline-block text-xs font-bold uppercase tracking-wider">Open uploads ↗</span>
          </Link>
          <Link href="/admin/news" className="border border-neutral-200 bg-white p-6 transition hover:border-[#da291c]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#da291c]">News &amp; Editorial</p>
            <h3 className="mt-3 text-xl font-bold tracking-tight">Manage articles</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Create, edit, categorize, and publish club news.
            </p>
            <span className="mt-5 inline-block text-xs font-bold uppercase tracking-wider">Open articles ↗</span>
          </Link>
          <div className="border border-dashed border-neutral-300 bg-white/70 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Next modules</p>
            <h3 className="mt-3 text-xl font-bold tracking-tight">Club and squad tools</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Club profile, squad, fixtures, and store management will follow their data and permission workflows.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
