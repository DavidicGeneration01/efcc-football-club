"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { newsStaffRoles, requireStaffRole } from "@/lib/auth/require-staff-role";
import { createClient } from "@/lib/supabase/server";
import { getNewsFeaturedImage, parseNewsContent } from "@/lib/news/content";
import { isUuid, parseNewsArticleInput, parseNewsCategoryInput } from "@/lib/news/validation";

export type NewsSaveState = {
  message: string;
  status: "idle" | "success" | "error";
};

function getSubmittedFeaturedImage(body: string, formData: FormData) {
  const mediaId = formData.get("featuredMediaId");
  return getNewsFeaturedImage(body, typeof mediaId === "string" ? mediaId : null);
}

function refreshNewsPaths(slugs: Array<string | null | undefined>) {
  revalidatePath("/");
  revalidatePath("/news");
  slugs.filter((slug): slug is string => Boolean(slug)).forEach(slug => revalidatePath(`/news/${slug}`));
  revalidatePath("/admin/news");
}

async function syncNewsMediaAttachments({
  supabase,
  newsId,
  body,
  userId
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  newsId: string;
  body: string;
  userId: string;
}) {
  const mediaIds = [...new Set(
    parseNewsContent(body)
      .filter(block => block.type === "image")
      .map(block => block.mediaId)
  )];
  if (mediaIds.some(mediaId => !isUuid(mediaId))) {
    return "One or more News image identifiers are invalid.";
  }
  if (mediaIds.length === 0) return null;

  const { data: mediaItems, error: mediaError } = await supabase
    .from("media_items")
    .select("id,published,uploaded_by,media_type,usage_scope,storage_path")
    .in("id", mediaIds);
  if (mediaError) {
    console.error("Could not verify News images before saving.", mediaError);
    return `News images could not be verified: ${mediaError.message}`;
  }

  const mediaById = new Map((mediaItems ?? []).map(media => [media.id, media]));
  const attachments: Array<{ news_id: string; media_id: string }> = [];
  for (const mediaId of mediaIds) {
    const media = mediaById.get(mediaId);
    if (
      !media ||
      media.media_type !== "image" ||
      media.usage_scope !== "library" ||
      typeof media.storage_path !== "string"
    ) {
      return "One or more News images are unavailable or are not library images.";
    }
    if (media.published) continue;
    if (media.uploaded_by !== userId || media.storage_path.split("/")[0] !== "news") {
      return "Unpublished News images can only be attached by their uploader.";
    }
    attachments.push({ news_id: newsId, media_id: mediaId });
  }

  if (attachments.length === 0) return null;

  const { error: attachmentError } = await supabase
    .from("news_media_attachments")
    .upsert(attachments, { onConflict: "news_id,media_id", ignoreDuplicates: true });
  if (attachmentError) {
    console.error("Could not authorize News image attachments.", attachmentError);
    return `News image attachments could not be saved: ${attachmentError.message}`;
  }
  return null;
}

async function deleteCreatedDraft(supabase: Awaited<ReturnType<typeof createClient>>, newsId: string) {
  const { error } = await supabase.from("news").delete().eq("id", newsId);
  if (error) console.error("Could not remove a draft after News image authorization failed.", error);
  return error;
}

export async function createNewsDraftAction(
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

  const { data: existingWithSlug } = await supabase
    .from("news")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle();
  if (existingWithSlug) {
    return { status: "error", message: "This URL slug already exists. Open the existing article from the list instead of submitting again." };
  }

  const now = new Date().toISOString();
  const result = await supabase
    .from("news")
    .insert({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      featured_image: getSubmittedFeaturedImage(input.body, formData),
      category_id: input.categoryId,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      status: "draft",
      published_at: null,
      updated_at: now,
      author_id: authData.user.id
    })
    .select("id,slug")
    .maybeSingle();

  if (result.error) {
    if (result.error.code === "23505") return { status: "error", message: "That URL slug is already in use. Choose a different slug." };
    console.error("Could not create the news draft.", result.error);
    return { status: "error", message: `Draft could not be created: ${result.error.message}` };
  }
  if (!result.data) return { status: "error", message: "The draft was not created. Check your access and try again." };

  const attachmentError = await syncNewsMediaAttachments({
    supabase,
    newsId: result.data.id,
    body: input.body,
    userId: authData.user.id
  });
  if (attachmentError) {
    const cleanupError = await deleteCreatedDraft(supabase, result.data.id);
    return {
      status: "error",
      message: `Draft images could not be authorized: ${attachmentError}${cleanupError ? ` The new draft ${result.data.id} could not be removed.` : ""}`
    };
  }

  refreshNewsPaths([result.data.slug]);
  redirect(`/admin/news/${result.data.id}/edit?notice=draft-saved`);
}

export async function createAndPublishNewsAction(
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

  const { data: existingWithSlug } = await supabase
    .from("news")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle();
  if (existingWithSlug) {
    return { status: "error", message: "This URL slug already exists. Open the existing article from the list instead of submitting again." };
  }

  const now = new Date().toISOString();
  const result = await supabase
    .from("news")
    .insert({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      featured_image: getSubmittedFeaturedImage(input.body, formData),
      category_id: input.categoryId,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      status: "draft",
      published_at: null,
      updated_at: now,
      author_id: authData.user.id
    })
    .select("id,slug")
    .maybeSingle();

  if (result.error) {
    if (result.error.code === "23505") return { status: "error", message: "That URL slug is already in use. Choose a different slug." };
    console.error("Could not create and publish the news article.", result.error);
    return { status: "error", message: `Article could not be published: ${result.error.message}` };
  }
  if (!result.data) return { status: "error", message: "The article was not published. Check your access and try again." };

  const attachmentError = await syncNewsMediaAttachments({
    supabase,
    newsId: result.data.id,
    body: input.body,
    userId: authData.user.id
  });
  if (attachmentError) {
    const cleanupError = await deleteCreatedDraft(supabase, result.data.id);
    return {
      status: "error",
      message: `Article images could not be authorized: ${attachmentError}${cleanupError ? ` The unpublished draft ${result.data.id} could not be removed.` : ""}`
    };
  }

  const publishResult = await supabase
    .from("news")
    .update({ status: "published", published_at: now, updated_at: now })
    .eq("id", result.data.id)
    .select("id,slug")
    .maybeSingle();
  if (publishResult.error) {
    console.error("Could not publish the new article after verifying its images.", publishResult.error);
    return { status: "error", message: `Article draft was saved, but publication failed: ${publishResult.error.message}` };
  }
  if (!publishResult.data) {
    return { status: "error", message: "Article draft was saved but could not be published. Check your access and try again." };
  }

  refreshNewsPaths([publishResult.data.slug]);
  redirect(`/admin/news/${publishResult.data.id}/edit?notice=published`);
}

export async function saveNewsDraftAction(
  _previousState: NewsSaveState,
  formData: FormData
): Promise<NewsSaveState> {
  await requireStaffRole(newsStaffRoles, "/admin");
  const parsed = parseNewsArticleInput(formData);
  if (!parsed.success) return { status: "error", message: parsed.message };
  const input = parsed.data;
  if (!input.id) return { status: "error", message: "Save Draft can only update an existing article." };

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("news")
    .select("slug,featured_image")
    .eq("id", input.id)
    .maybeSingle();
  if (existingError) return { status: "error", message: `Article could not be loaded: ${existingError.message}` };
  if (!existing) return { status: "error", message: "The article was not found or you do not have permission to edit it." };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    if (authError) console.error("Could not verify the News editor.", authError);
    return { status: "error", message: "Your staff session could not be verified. Sign in again and retry." };
  }
  const attachmentError = await syncNewsMediaAttachments({
    supabase,
    newsId: input.id,
    body: input.body,
    userId: authData.user.id
  });
  if (attachmentError) return { status: "error", message: `Draft images could not be authorized: ${attachmentError}` };

  const now = new Date().toISOString();
  const result = await supabase
    .from("news")
    .update({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      category_id: input.categoryId,
      featured_image: getSubmittedFeaturedImage(input.body, formData) ?? existing.featured_image,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      status: "draft",
      published_at: null,
      updated_at: now
    })
    .eq("id", input.id)
    .select("id,slug")
    .maybeSingle();

  if (result.error) {
    if (result.error.code === "23505") return { status: "error", message: "That URL slug is already in use. Choose a different slug." };
    console.error("Could not save the news draft.", result.error);
    return { status: "error", message: `Draft could not be saved: ${result.error.message}` };
  }
  if (!result.data) return { status: "error", message: "The draft was not saved. Check your access and try again." };

  refreshNewsPaths([existing.slug, result.data.slug]);
  redirect(`/admin/news/${input.id}/edit?notice=draft-saved`);
}

export async function publishNewsArticleAction(
  _previousState: NewsSaveState,
  formData: FormData
): Promise<NewsSaveState> {
  await requireStaffRole(newsStaffRoles, "/admin");
  const parsed = parseNewsArticleInput(formData);
  if (!parsed.success) return { status: "error", message: parsed.message };
  const input = parsed.data;
  if (!input.id) return { status: "error", message: "Publish Article can only publish an existing article." };

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("news")
    .select("slug,featured_image,status,published_at")
    .eq("id", input.id)
    .maybeSingle();
  if (existingError) return { status: "error", message: `Article could not be loaded: ${existingError.message}` };
  if (!existing) return { status: "error", message: "The article was not found or you do not have permission to publish it." };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    if (authError) console.error("Could not verify the News publisher.", authError);
    return { status: "error", message: "Your staff session could not be verified. Sign in again and retry." };
  }
  const attachmentError = await syncNewsMediaAttachments({
    supabase,
    newsId: input.id,
    body: input.body,
    userId: authData.user.id
  });
  if (attachmentError) return { status: "error", message: `Article images could not be authorized: ${attachmentError}` };

  const now = new Date().toISOString();
  const result = await supabase
    .from("news")
    .update({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      category_id: input.categoryId,
      featured_image: getSubmittedFeaturedImage(input.body, formData) ?? existing.featured_image,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      status: "published",
      published_at: existing.status === "published" && existing.published_at ? existing.published_at : now,
      updated_at: now
    })
    .eq("id", input.id)
    .select("id,slug")
    .maybeSingle();

  if (result.error) {
    if (result.error.code === "23505") return { status: "error", message: "That URL slug is already in use. Choose a different slug." };
    console.error("Could not publish the news article.", result.error);
    return { status: "error", message: `Article could not be published: ${result.error.message}` };
  }
  if (!result.data) return { status: "error", message: "The article was not published. Check your access and try again." };

  refreshNewsPaths([existing.slug, result.data.slug]);
  redirect(`/admin/news/${input.id}/edit?notice=published`);
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
  if (readError) redirect(`/admin/news/${id}/edit?notice=unpublish-error&detail=${encodeURIComponent(readError.message)}`);
  if (!article) redirect("/admin/news?notice=not-found");

  const { data, error } = await supabase
    .from("news")
    .update({ status: "draft", published_at: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) redirect(`/admin/news/${id}/edit?notice=unpublish-error&detail=${encodeURIComponent(error.message)}`);
  if (!data) redirect(`/admin/news/${id}/edit?notice=unpublish-error&detail=No+article+was+updated.`);

  refreshNewsPaths([article.slug]);
  redirect(`/admin/news/${id}/edit?notice=unpublished`);
}

export async function publishNewsArticleByIdAction(formData: FormData) {
  await requireStaffRole(newsStaffRoles, "/admin");
  const id = formData.get("id");
  if (typeof id !== "string" || !isUuid(id)) redirect("/admin/news?notice=invalid");

  const supabase = await createClient();
  const { data: article, error: readError } = await supabase
    .from("news")
    .select("slug,status,published_at,body")
    .eq("id", id)
    .maybeSingle();
  if (readError) redirect(`/admin/news?notice=publish-error&detail=${encodeURIComponent(readError.message)}`);
  if (!article) redirect("/admin/news?notice=not-found");

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    if (authError) console.error("Could not verify the News publisher.", authError);
    redirect(`/admin/news?notice=publish-error&detail=${encodeURIComponent("Your staff session could not be verified.")}`);
  }
  const attachmentError = await syncNewsMediaAttachments({
    supabase,
    newsId: id,
    body: article.body,
    userId: authData.user.id
  });
  if (attachmentError) {
    redirect(`/admin/news?notice=publish-error&detail=${encodeURIComponent(attachmentError)}`);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("news")
    .update({
      status: "published",
      published_at: article.status === "published" && article.published_at ? article.published_at : now,
      updated_at: now
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) redirect(`/admin/news?notice=publish-error&detail=${encodeURIComponent(error.message)}`);
  if (!data) redirect("/admin/news?notice=not-found");

  refreshNewsPaths([article.slug]);
  redirect("/admin/news?notice=published");
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
