"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { createClient } from "@/lib/supabase/server";
import { isUuid, parseNewsArticleInput, parseNewsCategoryInput } from "@/lib/news/validation";

export type NewsSaveState = {
  message: string;
  status: "idle" | "error";
};

function refreshNewsPaths(slugs: Array<string | null | undefined>) {
  revalidatePath("/");
  revalidatePath("/news");
  slugs.filter((slug): slug is string => Boolean(slug)).forEach(slug => revalidatePath(`/news/${slug}`));
  revalidatePath("/admin/news");
}

export async function saveNewsArticleAction(
  _previousState: NewsSaveState,
  formData: FormData
): Promise<NewsSaveState> {
  await requireStaffRole(newsStaffRoles, "/admin");

  const parsed = parseNewsArticleInput(formData);
  if (!parsed.success) return { status: "error", message: parsed.message };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    if (authError) console.error("Could not verify the news author.", authError);
    return { status: "error", message: "Your staff session could not be verified. Sign in again and retry." };
  }

  let existing: {
    slug: string;
    featured_image: string | null;
    status: "draft" | "published" | "archived";
    published_at: string | null;
  } | null = null;

  if (input.id) {
    const { data, error } = await supabase
      .from("news")
      .select("slug,featured_image,status,published_at")
      .eq("id", input.id)
      .maybeSingle();

    if (error) {
      console.error("Could not load the news article before editing.", error);
      return { status: "error", message: "The article could not be loaded for editing." };
    }
    if (!data) return { status: "error", message: "The article was not found or you do not have permission to edit it." };
    existing = data;
  }

  let featuredImage: string | null = null;
  if (input.featuredImageId === "keep") {
    if (!existing) return { status: "error", message: "There is no existing image to keep." };
    featuredImage = existing.featured_image;
  } else if (input.featuredImageId) {
    const { data: media, error: mediaError } = await supabase
      .from("media_items")
      .select("asset_url")
      .eq("id", input.featuredImageId)
      .eq("media_type", "image")
      .eq("published", true)
      .maybeSingle();

    if (mediaError) {
      console.error("Could not verify the selected published news image.", mediaError);
      return { status: "error", message: "The selected image could not be verified. Choose another image and retry." };
    }
    if (!media?.asset_url) {
      return { status: "error", message: "The selected image is no longer published or available." };
    }
    featuredImage = media.asset_url;
  }

  const now = new Date().toISOString();
  const publishedAt = input.intent === "draft"
    ? null
    : existing?.status === "published" && existing.published_at
      ? existing.published_at
      : now;
  const values = {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    body: input.body,
    category_id: input.categoryId,
    featured_image: featuredImage,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    status: input.intent,
    published_at: publishedAt,
    updated_at: now
  };

  const result = input.id
    ? await supabase.from("news").update(values).eq("id", input.id).select("id,slug").maybeSingle()
    : await supabase
        .from("news")
        .insert({ ...values, author_id: authData.user.id })
        .select("id,slug")
        .maybeSingle();

  if (result.error) {
    if (result.error.code === "23505") {
      return { status: "error", message: "That URL slug is already in use. Choose a different slug." };
    }
    console.error("Could not save the news article.", result.error);
    return { status: "error", message: "The article could not be saved. Check your access and try again." };
  }
  if (!result.data) {
    return { status: "error", message: "The article was not saved. Check your access and try again." };
  }

  refreshNewsPaths([existing?.slug, result.data.slug]);
  redirect(
    input.id
      ? `/admin/news/${input.id}/edit?notice=saved`
      : `/admin/news/${result.data.id}/edit?notice=created`
  );
}

export async function unpublishNewsArticleAction(formData: FormData) {
  await requireStaffRole(newsStaffRoles, "/admin");

  const id = formData.get("id");
  if (typeof id !== "string" || !isUuid(id)) redirect("/admin/news?notice=invalid");

  const supabase = await createClient();
  const { data: article, error: readError } = await supabase
    .from("news")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("Could not load the article before unpublishing.", readError);
    redirect("/admin/news?notice=action-error");
  }
  if (!article) redirect("/admin/news?notice=not-found");

  const { data, error } = await supabase
    .from("news")
    .update({ status: "draft", published_at: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not unpublish the news article.", error);
    redirect("/admin/news?notice=action-error");
  }
  if (!data) redirect("/admin/news?notice=not-found");

  refreshNewsPaths([article.slug]);
  redirect("/admin/news?notice=unpublished");
}

export async function saveNewsCategoryAction(formData: FormData) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const parsed = parseNewsCategoryInput(formData);
  if (!parsed.success) redirect("/admin/news?notice=category-invalid");

  const supabase = await createClient();
  const { data, error } = parsed.data.id
    ? await supabase
        .from("news_categories")
        .update({ name: parsed.data.name, slug: parsed.data.slug })
        .eq("id", parsed.data.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("news_categories")
        .insert({ name: parsed.data.name, slug: parsed.data.slug })
        .select("id")
        .maybeSingle();

  if (error) {
    if (error.code === "23505") redirect("/admin/news?notice=category-duplicate");
    console.error("Could not save the news category.", error);
    redirect("/admin/news?notice=category-error");
  }
  if (!data) redirect("/admin/news?notice=category-not-found");

  revalidatePath("/admin/news");
  revalidatePath("/news");
  redirect("/admin/news?notice=category-saved");
}

export async function deleteNewsCategoryAction(formData: FormData) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const id = formData.get("categoryId");
  if (typeof id !== "string" || !isUuid(id)) redirect("/admin/news?notice=category-invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_categories")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not delete the news category.", error);
    redirect("/admin/news?notice=category-error");
  }
  if (!data) redirect("/admin/news?notice=category-not-found");

  revalidatePath("/admin/news");
  revalidatePath("/news");
  redirect("/admin/news?notice=category-deleted");
}
