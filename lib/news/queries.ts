import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

const articleFields = "id,title,slug,excerpt,body,featured_image,category_id,status,is_featured,seo_title,seo_description,author_id,published_at,created_at,updated_at";
const summaryFields = "id,title,slug,excerpt,featured_image,category_id,published_at";
const pageSize = 12;

export type NewsCategory = {
  id: string;
  name: string;
  slug: string;
};

export type NewsImageOption = {
  id: string;
  title: string;
  asset_url: string;
};

export type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featured_image: string | null;
  category_id: string | null;
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category: NewsCategory | null;
};

export type NewsSummary = Pick<
  NewsArticle,
  "id" | "title" | "slug" | "excerpt" | "featured_image" | "category_id" | "published_at"
> & { category: NewsCategory | null };

export class NewsQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewsQueryError";
  }
}

export async function getNewsCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_categories")
    .select("id,name,slug")
    .order("name", { ascending: true });

  if (error) throw new NewsQueryError(`Could not load news categories: ${error.message}`);
  return data;
}

export async function getPublishedNewsImages(): Promise<NewsImageOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_items")
    .select("id,title,asset_url")
    .eq("media_type", "image")
    .eq("published", true)
    .not("asset_url", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new NewsQueryError(`Could not load published Media Library images: ${error.message}`);
  return data.flatMap(image => image.asset_url ? [{ ...image, asset_url: image.asset_url }] : []);
}

export async function getAdminNewsArticle(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select(articleFields)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new NewsQueryError(`Could not load the admin news article: ${error.message}`);
  return data;
}

async function loadCategories(ids: string[]) {
  if (!ids.length) return new Map<string, NewsCategory>();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_categories")
    .select("id,name,slug")
    .in("id", Array.from(new Set(ids)));

  if (error) throw new NewsQueryError(`Could not load news categories: ${error.message}`);
  return new Map(data.map(category => [category.id, category]));
}

export async function getPublishedNews(page = 1) {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const from = (safePage - 1) * pageSize;
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("news")
    .select(summaryFields, { count: "exact" })
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new NewsQueryError(`Could not load published news: ${error.message}`);

  const categories = await loadCategories(data.flatMap(article => article.category_id ?? []));
  return {
    articles: data.map(article => ({
      ...article,
      category: article.category_id ? categories.get(article.category_id) ?? null : null
    })),
    total: count ?? 0,
    page: safePage,
    pageSize
  };
}

export async function getLatestPublishedNews(limit = 3) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 12);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select(summaryFields)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw new NewsQueryError(`Could not load latest news: ${error.message}`);
  const categories = await loadCategories(data.flatMap(article => article.category_id ?? []));
  return data.map(article => ({
    ...article,
    category: article.category_id ? categories.get(article.category_id) ?? null : null
  }));
}

export const getPublishedArticle = cache(async (slug: string): Promise<NewsArticle | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select(articleFields)
    .eq("slug", slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new NewsQueryError(`Could not load the news article: ${error.message}`);
  if (!data) return null;

  const categories = await loadCategories(data.category_id ? [data.category_id] : []);
  return {
    ...data,
    category: data.category_id ? categories.get(data.category_id) ?? null : null
  };
});

export const NEWS_PAGE_SIZE = pageSize;
