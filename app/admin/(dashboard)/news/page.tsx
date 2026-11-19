import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { NewsCategoryManager } from "@/components/admin/news-category-manager";
import { getNewsCategories, NEWS_PAGE_SIZE } from "@/lib/news/queries";
import { unpublishNewsArticleAction } from "./actions";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short"
});

const notices: Record<string, { tone: "success" | "error"; message: string }> = {
  created: { tone: "success", message: "Article created." },
  unpublished: { tone: "success", message: "Article unpublished and returned to drafts." },
  saved: { tone: "success", message: "Article saved." },
  invalid: { tone: "error", message: "The requested article action was invalid." },
  "not-found": { tone: "error", message: "The requested article or category was not found." },
  "action-error": { tone: "error", message: "The article could not be updated. Check access and try again." },
  "category-saved": { tone: "success", message: "Category saved." },
  "category-deleted": { tone: "success", message: "Category deleted. Its articles are now uncategorized." },
  "category-invalid": { tone: "error", message: "The category details are invalid." },
  "category-duplicate": { tone: "error", message: "A category already uses that name or slug." },
  "category-error": { tone: "error", message: "The category could not be saved. Check access and try again." }
};

function safePage(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
}

export default async function AdminNewsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; status?: string; category?: string; notice?: string }>;
}) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const params = await searchParams;
  const page = safePage(params.page);
  const status = ["draft", "published", "archived"].includes(params.status ?? "") ? params.status : "";
  const categories = await getNewsCategories();
  const categoryId = categories.some(category => category.id === params.category) ? params.category : "";

  const supabase = await createClient();
  let query = supabase
    .from("news")
    .select("id,title,slug,category_id,status,published_at,updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * NEWS_PAGE_SIZE, page * NEWS_PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data: articles, count, error } = await query;
  if (error) {
    console.error("Could not load the news administration list.", error);
    throw new Error("The news list could not be loaded.");
  }

  const categoryById = new Map(categories.map(category => [category.id, category]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / NEWS_PAGE_SIZE));
  const notice = params.notice ? notices[params.notice] : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">News &amp; Editorial</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Articles</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Create and manage editorial content. Public pages show only published articles.
          </p>
        </div>
        <Link href="/admin/news/new" className="bg-[#da291c] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17]">
          Create article
        </Link>
      </div>

      {notice ? (
        <p
          className={`mt-6 border p-4 text-sm ${
            notice.tone === "success" ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-800"
          }`}
          role={notice.tone === "success" ? "status" : "alert"}
        >
          {notice.message}
        </p>
      ) : null}

      <form method="get" className="mt-7 grid gap-3 border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-bold uppercase tracking-wider">
          Status
          <select name="status" defaultValue={status} className="mt-2 block w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wider">
          Category
          <select name="category" defaultValue={categoryId} className="mt-2 block w-full border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal">
            <option value="">All categories</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <button type="submit" className="bg-[#111] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-700">
          Filter
        </button>
      </form>

      {articles.length ? (
        <div className="mt-5 space-y-3">
          {articles.map(article => (
            <article key={article.id} className="flex flex-col gap-4 border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-lg font-bold">{article.title}</h2>
                  <span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    article.status === "published"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : article.status === "draft"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-neutral-200 bg-neutral-100 text-neutral-600"
                  }`}>
                    {article.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {article.category_id ? categoryById.get(article.category_id)?.name ?? "Uncategorized" : "Uncategorized"}
                  {" · "}
                  Updated <time dateTime={article.updated_at}>{dateFormatter.format(new Date(article.updated_at))}</time>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Link href={`/admin/news/${article.id}/edit`} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#b51f17] hover:bg-red-50">
                  Edit
                </Link>
                {article.status === "published" ? (
                  <>
                    <Link href={`/news/${article.slug}`} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100">
                      View
                    </Link>
                    <form action={unpublishNewsArticleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button type="submit" className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100">
                        Unpublish
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 border border-dashed border-neutral-300 bg-white p-8 text-sm leading-6 text-neutral-600">
          No articles match these filters. Create an article to begin, or adjust the selected filters.
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Article list pages" className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4 text-sm">
          {page > 1 ? (
            <Link href={{ pathname: "/admin/news", query: { page: page - 1, ...(status ? { status } : {}), ...(categoryId ? { category: categoryId } : {}) } }} className="font-bold text-[#b51f17]">
              ← Previous
            </Link>
          ) : <span />}
          <span className="text-neutral-500">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={{ pathname: "/admin/news", query: { page: page + 1, ...(status ? { status } : {}), ...(categoryId ? { category: categoryId } : {}) } }} className="font-bold text-[#b51f17]">
              Next →
            </Link>
          ) : <span />}
        </nav>
      ) : null}

      <NewsCategoryManager categories={categories} />
    </div>
  );
}
