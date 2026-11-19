"use server";

import { randomUUID } from "node:crypto";
import { newsStaffRoles, requireStaffRole, type StaffRole } from "@/lib/auth/require-staff-role";
import { createClient } from "@/lib/supabase/server";
import { parseNewsContent, serializeNewsContent } from "@/lib/news/content";
import { isUuid } from "@/lib/news/validation";

export type SharedMediaUploadState = {
  status: "idle" | "success" | "error";
  message: string;
  mediaId?: string;
  assetUrl?: string;
  previewUrl?: string;
};

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

const moduleRoles: Record<string, readonly StaffRole[]> = {
  news: newsStaffRoles,
  team: ["super_admin", "admin", "editor"],
  matches: ["super_admin", "admin", "editor"],
  club: ["super_admin", "admin", "editor"],
  honours: ["super_admin", "admin", "editor"],
  store: ["super_admin", "admin", "shop_manager"]
};

function hasExpectedSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return String.fromCharCode(...bytes.slice(0, 8)) === "\x89PNG\r\n\u001a\n";
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export async function uploadModuleMediaAction(
  _previousState: SharedMediaUploadState,
  formData: FormData
): Promise<SharedMediaUploadState> {
  const moduleName = formData.get("module");
  if (typeof moduleName !== "string" || !moduleRoles[moduleName]) {
    return { status: "error", message: "This upload module is not supported." };
  }
  const articleIdValue = formData.get("articleId");
  const articleId = typeof articleIdValue === "string" && articleIdValue ? articleIdValue : null;
  if (articleId && !isUuid(articleId)) {
    return { status: "error", message: "The article identifier is invalid." };
  }

  await requireStaffRole(moduleRoles[moduleName], "/admin");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose an image before uploading." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { status: "error", message: "The image must be 10 MB or smaller." };
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) return { status: "error", message: "Choose a JPEG, PNG, or WebP image." };
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasExpectedSignature(file.type, signature)) {
    return { status: "error", message: "The selected file does not match its image format." };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { status: "error", message: "Your staff session could not be verified. Sign in again and retry." };
  }

  const mediaId = randomUUID();
  const storagePath = `${moduleName}/${authData.user.id}/${randomUUID()}.${extension}`;
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from("efcc-media")
    .upload(storagePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
  if (uploadError) return { status: "error", message: `Image upload failed: ${uploadError.message}` };

  const { error: insertError } = await supabase
    .from("media_items")
    .insert({
      id: mediaId,
      title: file.name,
      media_type: "image",
      category: moduleName === "news" ? "General Club Photography" : null,
      asset_url: `/api/media/${mediaId}`,
      storage_path: uploaded.path,
      uploaded_by: authData.user.id,
      published: false
    });

  if (insertError) {
    await supabase.storage.from("efcc-media").remove([uploaded.path]);
    console.error("Could not save module media metadata.", insertError);
    return { status: "error", message: `Image metadata could not be saved: ${insertError.message}` };
  }

  let originalBody: string | null = null;
  if (moduleName === "news" && articleId) {
    const { data: article, error: articleError } = await supabase
      .from("news")
      .select("body")
      .eq("id", articleId)
      .maybeSingle();
    if (articleError || !article) {
      await supabase
        .from("media_items")
        .delete()
        .eq("id", mediaId)
        .eq("uploaded_by", authData.user.id);
      await supabase.storage.from("efcc-media").remove([uploaded.path]);
      return {
        status: "error",
        message: articleError
          ? `The image uploaded but the article could not be associated: ${articleError.message}`
          : "The image uploaded but the article could not be found for association."
      };
    }

    originalBody = article.body;
    const blocks = parseNewsContent(article.body);
    const updatedBody = serializeNewsContent([
      ...blocks,
      {
        type: "image",
        mediaId,
        assetUrl: `/api/news-media/${mediaId}`,
        caption: "",
        alt: file.name
      }
    ]);
    const { error: associationError } = await supabase
      .from("news")
      .update({ body: updatedBody, updated_at: new Date().toISOString() })
      .eq("id", articleId);
    if (associationError) {
      await supabase
        .from("media_items")
        .delete()
        .eq("id", mediaId)
        .eq("uploaded_by", authData.user.id);
      await supabase.storage.from("efcc-media").remove([uploaded.path]);
      console.error("Could not associate uploaded image with the news article.", associationError);
      return {
        status: "error",
        message: `The image uploaded but could not be associated with the article: ${associationError.message}`
      };
    }
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("efcc-media")
    .createSignedUrl(uploaded.path, 300);
  if (signedError || !signed?.signedUrl) {
    if (moduleName === "news" && articleId && originalBody !== null) {
      await supabase
        .from("news")
        .update({ body: originalBody, updated_at: new Date().toISOString() })
        .eq("id", articleId);
    }
    await supabase
      .from("media_items")
      .delete()
      .eq("id", mediaId)
      .eq("uploaded_by", authData.user.id);
    await supabase.storage.from("efcc-media").remove([uploaded.path]);
    console.error("Could not create an admin preview for uploaded media.", signedError);
    return {
      status: "error",
      message: signedError
        ? `The image uploaded but its preview could not be created: ${signedError.message}`
        : "The image uploaded but its preview could not be created."
    };
  }

  return {
    status: "success",
    message: "Image uploaded. It was not added to the public Media Library.",
    mediaId,
    assetUrl: `/api/admin/news-media/${mediaId}`,
    previewUrl: signed.signedUrl
  };
}
