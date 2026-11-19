import { notFound } from "next/navigation";
import { NewsArticleForm } from "@/components/admin/news-article-form";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { getAdminNewsArticle, getNewsCategories } from "@/lib/news/queries";
import { isUuid } from "@/lib/news/validation";

const notices: Record<string, string> = {
  "draft-saved": "Draft saved successfully",
  published: "Article published successfully",
  unpublished: "Article unpublished successfully",
  "unpublish-error": "Article could not be unpublished. Check your access and try again."
};

export default async function EditNewsArticlePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; detail?: string }>;
}) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const [{ id }, { notice: noticeCode, detail }] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();

  const [article, categories] = await Promise.all([
    getAdminNewsArticle(id),
    getNewsCategories()
  ]);
  if (!article) notFound();

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">News &amp; Editorial</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Edit article</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
        Update this article, save it as a draft, or publish it immediately.
      </p>
      <div className="mt-7 border border-neutral-200 bg-white p-5 sm:p-8">
        <NewsArticleForm
          article={{
            id: article.id,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            body: article.body,
            category_id: article.category_id,
            featured_image: article.featured_image,
            seo_title: article.seo_title,
            seo_description: article.seo_description,
            status: article.status
          }}
          categories={categories}
          notice={noticeCode
            ? noticeCode === "unpublish-error" && detail
              ? `Article could not be unpublished: ${detail}`
              : notices[noticeCode]
            : undefined}
        />
      </div>
    </div>
  );
}
