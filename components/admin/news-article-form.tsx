"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useState } from "react";
import {
  createAndPublishNewsAction,
  createNewsDraftAction,
  publishNewsArticleAction,
  saveNewsDraftAction,
  type NewsSaveState
} from "@/app/admin/(dashboard)/news/actions";
import { SharedMediaUpload } from "@/components/admin/shared-media-upload";
import { NewsStatusAction } from "@/components/admin/news-status-actions";
import { parseNewsContent, serializeNewsContent, type NewsContentBlock } from "@/lib/news/content";
import type { NewsCategory } from "@/lib/news/queries";

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
  notice
}: {
  article: NewsArticleFormValues;
  categories: NewsCategory[];
  notice?: string;
}) {
  const initialBlocks = parseNewsContent(article.body);
  const [blocks, setBlocks] = useState<NewsContentBlock[]>(initialBlocks);
  const [featuredMediaId, setFeaturedMediaId] = useState(() => {
    const savedMediaId = article.featured_image?.match(/\/api\/(?:admin\/)?news-media\/([0-9a-f-]{36})$/i)?.[1];
    const savedImage = initialBlocks.find((block): block is Extract<NewsContentBlock, { type: "image" }> =>
      block.type === "image" && block.mediaId === savedMediaId
    );
    const firstImage = initialBlocks.find((block): block is Extract<NewsContentBlock, { type: "image" }> => block.type === "image");
    return savedImage?.mediaId
      ?? firstImage?.mediaId
      ?? "";
  });
  const [createDraftState, createDraftAction, createDraftPending] = useActionState(createNewsDraftAction, initialState);
  const [createPublishState, createPublishAction, createPublishPending] = useActionState(createAndPublishNewsAction, initialState);
  const [saveState, saveAction, savePending] = useActionState(saveNewsDraftAction, initialState);
  const [publishState, publishAction, publishPending] = useActionState(publishNewsArticleAction, initialState);
  const [title, setTitle] = useState(article.title);
  const [slug, setSlug] = useState(article.slug);
  const [excerpt, setExcerpt] = useState(article.excerpt ?? "");
  const [categoryId, setCategoryId] = useState(article.category_id ?? "");
  const [seoTitle, setSeoTitle] = useState(article.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(article.seo_description ?? "");
  const pending = createDraftPending || createPublishPending || savePending || publishPending;
  const activeError = [createDraftState, createPublishState, saveState, publishState].find(state => state.status === "error");

  function updateText(index: number, text: string) {
    setBlocks(current => current.map((block, blockIndex) => blockIndex === index && block.type === "text"
      ? { ...block, text }
      : block));
  }

  function updateImage(index: number, field: "caption" | "alt", value: string) {
    setBlocks(current => current.map((block, blockIndex) => blockIndex === index && block.type === "image"
      ? { ...block, [field]: value }
      : block));
  }

  function moveBlock(index: number, offset: number) {
    setBlocks(current => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeBlock(index: number) {
    const removedBlock = blocks[index];
    const nextBlocks = blocks.filter((_, blockIndex) => blockIndex !== index);
    setBlocks(nextBlocks);
    if (removedBlock?.type === "image" && removedBlock.mediaId === featuredMediaId) {
      setFeaturedMediaId(nextBlocks.find((block): block is Extract<NewsContentBlock, { type: "image" }> => block.type === "image")?.mediaId ?? "");
    }
  }

  return (
    <>
    <form id="news-article-main-form" className="space-y-7">
      {article.id ? <input type="hidden" name="id" value={article.id} /> : null}
      <input type="hidden" name="body" value={serializeNewsContent(blocks)} />
      {notice ? (
        <p className={`border p-4 text-sm ${
          notice.startsWith("Article could not")
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-green-200 bg-green-50 text-green-900"
        }`} role={notice.startsWith("Article could not") ? "alert" : "status"}>
          {notice === "draft-saved" ? "Draft saved successfully"
            : notice === "published" ? "Article published successfully"
              : notice === "unpublished" ? "Article unpublished successfully"
                : notice === "unpublish-error" ? "Article could not be unpublished. Check your access and try again."
                  : notice}
        </p>
      ) : null}
      {activeError ? <p className="border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{activeError.message}</p> : null}

      <div>
        <label htmlFor="news-title" className="block text-sm font-bold">Article title</label>
        <input id="news-title" name="title" type="text" required maxLength={160} value={title} onChange={event => setTitle(event.currentTarget.value)} disabled={pending}
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none" />
      </div>

      <div>
        <label htmlFor="news-slug" className="block text-sm font-bold">URL slug</label>
        <input id="news-slug" name="slug" type="text" maxLength={160} value={slug} onChange={event => setSlug(event.currentTarget.value)} disabled={pending}
          placeholder="Generated from the title if left blank"
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none" />
      </div>

      <div>
        <label htmlFor="news-excerpt" className="block text-sm font-bold">Excerpt</label>
        <textarea id="news-excerpt" name="excerpt" rows={3} maxLength={500} value={excerpt} onChange={event => setExcerpt(event.currentTarget.value)} disabled={pending}
          className="mt-2 w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none" />
      </div>

      <div>
        <label htmlFor="news-category" className="block text-sm font-bold">Category</label>
        <select id="news-category" name="categoryId" value={categoryId} onChange={event => setCategoryId(event.currentTarget.value)} disabled={pending}
          className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none">
          <option value="">No category</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
    </form>

      <section aria-labelledby="article-content-heading" className="border border-neutral-200 bg-neutral-50 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#da291c]">Article content</p>
            <h2 id="article-content-heading" className="mt-2 text-xl font-extrabold">Text and images</h2>
          </div>
          <button type="button" disabled={pending} onClick={() => setBlocks(current => [...current, { type: "text", text: "" }])}
            className="border border-neutral-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:border-[#da291c]">
            Add text
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {blocks.map((block, index) => (
            <div key={index} className="border border-neutral-200 bg-white p-4">
              {block.type === "text" ? (
                <label className="block text-sm font-bold">
                  Text block {index + 1}
                  <textarea rows={8} value={block.text} onChange={event => updateText(index, event.currentTarget.value)} disabled={pending}
                    className="mt-2 w-full resize-y border border-neutral-300 px-4 py-3 text-sm leading-7 font-normal focus:border-[#da291c] focus:outline-none" />
                </label>
              ) : (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#b51f17]">Image block {index + 1}</p>
                  <div className="relative mt-3 aspect-[16/9] overflow-hidden bg-neutral-100">
                    <Image src={block.previewUrl ?? block.assetUrl} alt={block.alt || ""} fill unoptimized sizes="(max-width: 896px) 100vw, 896px" className="object-contain" />
                  </div>
                  <label className="mt-4 block text-sm font-bold">
                    Alternative text
                    <input type="text" maxLength={300} value={block.alt} onChange={event => updateImage(index, "alt", event.currentTarget.value)} disabled={pending}
                      className="mt-2 w-full border border-neutral-300 px-4 py-3 text-sm font-normal focus:border-[#da291c] focus:outline-none" />
                  </label>
                  <label className="mt-4 block text-sm font-bold">
                    Caption
                    <input type="text" maxLength={500} value={block.caption} onChange={event => updateImage(index, "caption", event.currentTarget.value)} disabled={pending}
                      className="mt-2 w-full border border-neutral-300 px-4 py-3 text-sm font-normal focus:border-[#da291c] focus:outline-none" />
                  </label>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => moveBlock(index, -1)} disabled={pending || index === 0} className="px-3 py-2 text-xs font-bold uppercase text-neutral-600 hover:bg-neutral-100 disabled:opacity-40">Move up</button>
                <button type="button" onClick={() => moveBlock(index, 1)} disabled={pending || index === blocks.length - 1} className="px-3 py-2 text-xs font-bold uppercase text-neutral-600 hover:bg-neutral-100 disabled:opacity-40">Move down</button>
                <button type="button" onClick={() => removeBlock(index)} disabled={pending} className="px-3 py-2 text-xs font-bold uppercase text-[#b51f17] hover:bg-red-50">Remove block</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <SharedMediaUpload
            moduleName="news"
            articleId={article.id}
            onUploaded={({ mediaId, assetUrl, previewUrl, fileName }) => {
              setBlocks(current => [...current, {
                type: "image",
                mediaId,
                assetUrl,
                previewUrl,
                caption: "",
                alt: fileName
              }]);
              setFeaturedMediaId(mediaId);
            }}
          />
        </div>
      </section>

      <details className="border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold">Search engine metadata</summary>
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="news-seo-title" className="block text-sm font-bold">SEO title</label>
            <input id="news-seo-title" name="seoTitle" type="text" maxLength={160} value={seoTitle} onChange={event => setSeoTitle(event.currentTarget.value)} disabled={pending}
              className="mt-2 w-full border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none" />
          </div>
          <div>
            <label htmlFor="news-seo-description" className="block text-sm font-bold">SEO description</label>
            <textarea id="news-seo-description" name="seoDescription" rows={3} maxLength={320} value={seoDescription} onChange={event => setSeoDescription(event.currentTarget.value)} disabled={pending}
              className="mt-2 w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-sm focus:border-[#da291c] focus:outline-none" />
          </div>
        </div>
      </details>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
        {article.id ? (
          <>
            <form action={saveAction}>
              <input type="hidden" name="id" value={article.id} />
              <input type="hidden" name="featuredMediaId" value={featuredMediaId} />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="excerpt" value={excerpt} />
              <input type="hidden" name="body" value={serializeNewsContent(blocks)} />
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="seoTitle" value={seoTitle} />
              <input type="hidden" name="seoDescription" value={seoDescription} />
              <button type="submit" disabled={pending}
                className="bg-[#111] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-neutral-700 disabled:opacity-50">
                {savePending ? "Saving..." : "Save draft"}
              </button>
            </form>
            <form action={publishAction}>
              <input type="hidden" name="id" value={article.id} />
              <input type="hidden" name="featuredMediaId" value={featuredMediaId} />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="excerpt" value={excerpt} />
              <input type="hidden" name="body" value={serializeNewsContent(blocks)} />
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="seoTitle" value={seoTitle} />
              <input type="hidden" name="seoDescription" value={seoDescription} />
              <button type="submit" disabled={pending}
                className="bg-[#da291c] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17] disabled:opacity-50">
                {publishPending ? "Publishing..." : "Publish article"}
              </button>
            </form>
          </>
        ) : (
          <>
            <form action={createDraftAction}>
              <input type="hidden" name="featuredMediaId" value={featuredMediaId} />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="excerpt" value={excerpt} />
              <input type="hidden" name="body" value={serializeNewsContent(blocks)} />
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="seoTitle" value={seoTitle} />
              <input type="hidden" name="seoDescription" value={seoDescription} />
              <button type="submit" disabled={pending}
                className="bg-[#111] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-neutral-700 disabled:opacity-50">
                {createDraftPending ? "Saving..." : "Create draft"}
              </button>
            </form>
            <form action={createPublishAction}>
              <input type="hidden" name="featuredMediaId" value={featuredMediaId} />
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="excerpt" value={excerpt} />
              <input type="hidden" name="body" value={serializeNewsContent(blocks)} />
              <input type="hidden" name="categoryId" value={categoryId} />
              <input type="hidden" name="seoTitle" value={seoTitle} />
              <input type="hidden" name="seoDescription" value={seoDescription} />
              <button type="submit" disabled={pending}
                className="bg-[#da291c] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#b51f17] disabled:opacity-50">
                {createPublishPending ? "Publishing..." : "Publish article"}
              </button>
            </form>
          </>
        )}
        <Link href="/admin/news" className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-[#b51f17]">Cancel</Link>
      </div>
    {article.id && article.status === "published" ? (
      <div className="mt-4">
        <NewsStatusAction id={article.id} published />
      </div>
    ) : null}
    </>
  );
}
