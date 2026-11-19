"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveNewsArticleAction, type NewsSaveState } from "@/app/admin/(dashboard)/news/actions";
import { NewsFeaturedImagePicker } from "@/components/admin/news-featured-image-picker";
import type { NewsCategory, NewsImageOption } from "@/lib/news/queries";

const initialState: NewsSaveState = { status: "idle", message: "" };

export type NewsArticleFormValues = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category_id: string | null;
  featured_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status: "draft" | "published" | "archived";
};

export function NewsArticleForm({
  article,
  categories,
  images,
  initialImageId,
  keepUnavailableImage,
  notice
}: {
  article: NewsArticleFormValues;
  categories: NewsCategory[];
  images: NewsImageOption[];
  initialImageId: string;
  keepUnavailableImage: boolean;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(saveNewsArticleAction, initialState);

  return (
    <form action={formAction} className="space-y-7">
      {article.id ? <input type="hidden" name="id" value={article.id} /> : null}
      {notice ? (
        <p className="border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">{notice}</p>
      ) : null}
      {state.status === "error" ? (
        <p className="border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{state.message}</p>
      ) : null}

      <div>
        <label htmlFor="news-title" className="block text-sm font-bold">Article title</label>
        <input
          id="news-title"
          name="title"
          type="text"
          required
          maxLength={160}
          defaultValue={article.title}
          disabled={pending}
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="news-slug" className="block text-sm font-bold">URL slug</label>
        <input
          id="news-slug"
          name="slug"
          type="text"
          maxLength={160}
          defaultValue={article.slug}
          disabled={pending}
          placeholder="Generated from the title if left blank"
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
        />
        <p className="mt-2 text-xs text-neutral-500">The public article address uses this unique slug.</p>
      </div>

      <div>
        <label htmlFor="news-excerpt" className="block text-sm font-bold">Excerpt</label>
        <textarea
          id="news-excerpt"
          name="excerpt"
          rows={3}
          maxLength={500}
          defaultValue={article.excerpt ?? ""}
          disabled={pending}
          className="mt-2 w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="news-body" className="block text-sm font-bold">Article text</label>
        <textarea
          id="news-body"
          name="body"
          rows={16}
          required
          maxLength={50000}
          defaultValue={article.body}
          disabled={pending}
          className="mt-2 w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm leading-7 focus:border-[#da291c] focus:outline-none"
        />
        <p className="mt-2 text-xs text-neutral-500">Plain text only. Line breaks are preserved in the published article.</p>
      </div>

      <div>
        <label htmlFor="news-category" className="block text-sm font-bold">Category</label>
        <select
          id="news-category"
          name="categoryId"
          defaultValue={article.category_id ?? ""}
          disabled={pending}
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
        >
          <option value="">No category</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>

      <NewsFeaturedImagePicker
        images={images}
        initialValue={initialImageId}
        keepUnavailableImage={keepUnavailableImage}
      />

      <details className="border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold">Search engine metadata</summary>
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="news-seo-title" className="block text-sm font-bold">SEO title</label>
            <input
              id="news-seo-title"
              name="seoTitle"
              type="text"
              maxLength={160}
              defaultValue={article.seo_title ?? ""}
              disabled={pending}
              className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="news-seo-description" className="block text-sm font-bold">SEO description</label>
            <textarea
              id="news-seo-description"
              name="seoDescription"
              rows={3}
              maxLength={320}
              defaultValue={article.seo_description ?? ""}
              disabled={pending}
              className="mt-2 w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none"
            />
          </div>
        </div>
      </details>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="bg-[#111] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save draft"}
        </button>
        <button
          type="submit"
          name="intent"
          value="published"
          disabled={pending}
          className="bg-[#da291c] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17] disabled:opacity-50"
        >
          {pending ? "Saving..." : "Publish article"}
        </button>
        <Link href="/admin/news" className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-[#b51f17]">
          Cancel
        </Link>
      </div>
    </form>
  );
}
