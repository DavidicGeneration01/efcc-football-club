import { NewsArticleForm } from "@/components/admin/news-article-form";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { getNewsCategories } from "@/lib/news/queries";

export default async function NewNewsArticlePage() {
  await requireStaffRole(newsStaffRoles, "/admin");
  const categories = await getNewsCategories();

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">News &amp; Editorial</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Create article</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
        Save an unpublished draft or publish an article. Public visitors only see published content.
      </p>
      <div className="mt-7 border border-neutral-200 bg-white p-5 sm:p-8">
        <NewsArticleForm
          article={{
            title: "",
            slug: "",
            excerpt: null,
            body: "",
            category_id: null,
            featured_image: null,
            seo_title: null,
            seo_description: null,
            status: "draft"
          }}
          categories={categories}
        />
      </div>
    </div>
  );
}
